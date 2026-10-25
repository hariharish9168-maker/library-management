import { Request, Response } from 'express';
import { db } from '../database/db';
import { calculateOverdue } from '../utils/fineCalculator';
import { logAudit } from '../middlewares/errorHandler';

// Helper to fetch library settings
async function getLibrarySettings(): Promise<{
  loanDurationDays: number;
  maxBooksPerStudent: number;
  gracePeriodDays: number;
  fineRatePerDay: number;
  maxFineLimit: number;
}> {
  const rows = await db.query('SELECT setting_key, setting_value FROM library_settings');
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.setting_key] = r.setting_value;
  }

  return {
    loanDurationDays: parseInt(map.loan_duration_days || '14', 10),
    maxBooksPerStudent: parseInt(map.max_books_per_student || '3', 10),
    gracePeriodDays: parseInt(map.grace_period_days || '0', 10),
    fineRatePerDay: parseFloat(map.fine_rate_per_day || '2.00'),
    maxFineLimit: parseFloat(map.max_fine_limit || '150.00'),
  };
}

// ISSUE BOOK WORKFLOW
export async function issueBook(req: Request, res: Response): Promise<void> {
  try {
    const { studentId, copyIdentifier, notes } = req.body;
    const issuerUserId = req.user!.userId;

    if (!studentId || !copyIdentifier) {
      res.status(400).json({ success: false, message: 'Student ID and Copy identifier (accession, barcode, or ID) are required.' });
      return;
    }

    const settings = await getLibrarySettings();

    // Use transaction for concurrency protection
    const issueResult = await db.transaction(async (trx) => {
      // 1. Verify student
      const students = await trx.query(
        `SELECT s.id, s.student_reg_no, s.max_books_allowed, s.is_active as student_active,
                u.id as user_id, u.full_name, u.email, u.is_active as user_active
         FROM students s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = ?`,
        [studentId]
      );

      if (students.length === 0) {
        throw new Error('Student account not found.');
      }

      const student = students[0];
      if (!student.student_active || !student.user_active) {
        throw new Error('Student account is currently inactive or suspended. Cannot issue books.');
      }

      // 2. Check student's current active loans
      const activeLoans = await trx.query(
        `SELECT COUNT(*) as count FROM loans WHERE student_id = ? AND status = 'Active'`,
        [studentId]
      );
      const activeCount = Number(activeLoans[0]?.count || 0);
      const limit = student.max_books_allowed || settings.maxBooksPerStudent;

      if (activeCount >= limit) {
        throw new Error(`Borrowing limit reached. Student already has ${activeCount} active loan(s) (Maximum allowed: ${limit}).`);
      }

      // 3. Check for disqualifying overdue loans
      const overdueLoans = await trx.query(
        `SELECT l.id, l.due_date, b.title
         FROM loans l
         JOIN book_copies bc ON l.copy_id = bc.id
         JOIN books b ON bc.book_id = b.id
         WHERE l.student_id = ? AND l.status = 'Active' AND l.due_date < CURRENT_TIMESTAMP`,
        [studentId]
      );

      if (overdueLoans.length > 0) {
        throw new Error(
          `Student has an overdue book ("${overdueLoans[0].title}"). Overdue items must be returned before new issues are allowed.`
        );
      }

      // 4. Find and lock the physical copy
      // Concurrency lock: In MySQL `FOR UPDATE` prevents race condition
      const lockSql = db.activeDriver === 'mysql'
        ? `SELECT bc.id, bc.book_id, bc.accession_number, bc.barcode, bc.condition, bc.status, bc.shelf_id,
                  b.title, b.author, b.isbn
           FROM book_copies bc
           JOIN books b ON bc.book_id = b.id
           WHERE (bc.id = ? OR bc.accession_number = ? OR bc.barcode = ?)
           FOR UPDATE`
        : `SELECT bc.id, bc.book_id, bc.accession_number, bc.barcode, bc.condition, bc.status, bc.shelf_id,
                  b.title, b.author, b.isbn
           FROM book_copies bc
           JOIN books b ON bc.book_id = b.id
           WHERE (bc.id = ? OR bc.accession_number = ? OR bc.barcode = ?)`;

      const copies = await trx.query(lockSql, [copyIdentifier, copyIdentifier, copyIdentifier]);

      if (copies.length === 0) {
        throw new Error(`Physical copy not found with identifier '${copyIdentifier}'.`);
      }

      const copy = copies[0];

      if (copy.status !== 'Available') {
        throw new Error(
          `Copy (${copy.accession_number}) is not available for issue. Current status: ${copy.status}.`
        );
      }

      if (copy.condition === 'Lost' || copy.condition === 'Damaged') {
        throw new Error(`Copy (${copy.accession_number}) is marked as ${copy.condition} and cannot be issued.`);
      }

      // 5. Calculate Due Date
      const issueDate = new Date();
      const dueDate = new Date(issueDate.getTime() + settings.loanDurationDays * 24 * 60 * 60 * 1000);
      const dueDateStr = dueDate.toISOString().replace('T', ' ').substring(0, 19);

      // 6. Insert Loan Record
      const loanRes = await trx.execute(
        `INSERT INTO loans (student_id, copy_id, issue_date, due_date, status, issued_by, notes)
         VALUES (?, ?, CURRENT_TIMESTAMP, ?, 'Active', ?, ?)`,
        [studentId, copy.id, dueDateStr, issuerUserId, notes || null]
      );

      // 7. Update Copy Status to 'Issued'
      await trx.execute("UPDATE book_copies SET status = 'Issued', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [copy.id]);

      return {
        loanId: loanRes.insertId!,
        student,
        copy,
        issueDate,
        dueDate,
      };
    });

    await logAudit(issuerUserId, 'ISSUE_BOOK', 'loans', issueResult.loanId, {
      studentId,
      copyId: issueResult.copy.id,
      accessionNumber: issueResult.copy.accession_number,
    });

    res.status(201).json({
      success: true,
      message: `Book "${issueResult.copy.title}" (Copy: ${issueResult.copy.accession_number}) successfully issued to ${issueResult.student.full_name}.`,
      data: issueResult,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// SEARCH ACTIVE LOAN FOR RETURN
export async function searchActiveLoan(req: Request, res: Response): Promise<void> {
  try {
    const q = req.query.q as string | undefined;
    if (!q || !q.trim()) {
      res.status(400).json({ success: false, message: 'Search query is required' });
      return;
    }

    const term = `%${q.trim()}%`;
    const exact = q.trim();

    const loans = await db.query(
      `SELECT l.id as loan_id, l.issue_date, l.due_date, l.status as loan_status, l.notes,
              s.id as student_id, s.student_reg_no, s.department,
              u.full_name as student_name, u.email as student_email,
              bc.id as copy_id, bc.accession_number, bc.barcode, bc.condition as copy_condition,
              b.id as book_id, b.title as book_title, b.author as book_author, b.cover_image_url,
              sh.id as shelf_id, sh.shelf_number,
              rk.rack_number, sec.name as section_name, sec.code as section_code, fl.name as floor_name, fl.floor_number
       FROM loans l
       JOIN students s ON l.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN book_copies bc ON l.copy_id = bc.id
       JOIN books b ON bc.book_id = b.id
       LEFT JOIN shelves sh ON bc.shelf_id = sh.id
       LEFT JOIN racks rk ON sh.rack_id = rk.id
       LEFT JOIN sections sec ON rk.section_id = sec.id
       LEFT JOIN floors fl ON sec.floor_id = fl.id
       WHERE l.status != 'Returned'
         AND (l.id = ? OR s.student_reg_no = ? OR bc.accession_number = ? OR bc.barcode = ?
              OR u.full_name LIKE ? OR b.title LIKE ?)
       ORDER BY l.issue_date DESC
       LIMIT 10`,
      [exact, exact, exact, exact, term, term]
    );

    const settings = await getLibrarySettings();

    // Enrich with live overdue calculation
    const enriched = loans.map((loan: any) => {
      const overdueInfo = calculateOverdue(loan.due_date, new Date(), {
        gracePeriodDays: settings.gracePeriodDays,
        fineRatePerDay: settings.fineRatePerDay,
        maxFineLimit: settings.maxFineLimit,
      });

      const designatedLocation = loan.shelf_id
        ? `${loan.floor_name || `Floor ${loan.floor_number}`} → ${loan.section_name} → Rack ${loan.rack_number} → Shelf ${loan.shelf_number}`
        : 'Unassigned Location';

      return {
        ...loan,
        overdueInfo,
        designatedLocation,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// RETURN BOOK WORKFLOW
export async function returnBook(req: Request, res: Response): Promise<void> {
  try {
    const { loanId, conditionOnReturn = 'Good', notes } = req.body;
    const returnerUserId = req.user!.userId;

    if (!loanId) {
      res.status(400).json({ success: false, message: 'Loan ID is required' });
      return;
    }

    const settings = await getLibrarySettings();

    const returnResult = await db.transaction(async (trx) => {
      // 1. Lock and verify active loan
      const loans = await trx.query(
        `SELECT l.id, l.student_id, l.copy_id, l.issue_date, l.due_date, l.status,
                bc.accession_number, bc.barcode, bc.shelf_id,
                b.title as book_title, b.author as book_author,
                u.full_name as student_name, s.student_reg_no,
                sh.shelf_number, rk.rack_number, sec.name as section_name, fl.name as floor_name, fl.floor_number
         FROM loans l
         JOIN book_copies bc ON l.copy_id = bc.id
         JOIN books b ON bc.book_id = b.id
         JOIN students s ON l.student_id = s.id
         JOIN users u ON s.user_id = u.id
         LEFT JOIN shelves sh ON bc.shelf_id = sh.id
         LEFT JOIN racks rk ON sh.rack_id = rk.id
         LEFT JOIN sections sec ON rk.section_id = sec.id
         LEFT JOIN floors fl ON sec.floor_id = fl.id
         WHERE l.id = ?`,
        [loanId]
      );

      if (loans.length === 0) {
        throw new Error('Loan transaction record not found.');
      }

      const loan = loans[0];
      if (loan.status === 'Returned') {
        throw new Error('This book has already been marked as returned.');
      }

      // 2. Overdue & Fine Calculation
      const returnDate = new Date();
      const overdueInfo = calculateOverdue(loan.due_date, returnDate, {
        gracePeriodDays: settings.gracePeriodDays,
        fineRatePerDay: settings.fineRatePerDay,
        maxFineLimit: settings.maxFineLimit,
      });

      // 3. Update Loan status
      await trx.execute(
        `UPDATE loans
         SET status = 'Returned',
             return_date = CURRENT_TIMESTAMP,
             returned_by = ?,
             notes = COALESCE(?, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [returnerUserId, notes || null, loanId]
      );

      // 4. Update Copy Status and Condition
      // If damaged or lost, mark status accordingly; else 'Available'
      let newCopyStatus = 'Available';
      if (conditionOnReturn === 'Damaged' || conditionOnReturn === 'Maintenance') {
        newCopyStatus = 'Maintenance';
      } else if (conditionOnReturn === 'Lost') {
        newCopyStatus = 'Archived';
      }

      await trx.execute(
        `UPDATE book_copies
         SET status = ?,
             \`condition\` = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newCopyStatus, conditionOnReturn, loan.copy_id]
      );

      // 5. Finalize Fine record if overdue
      let fineRecord = null;
      if (overdueInfo.isOverdue && overdueInfo.calculatedFine > 0) {
        const fineRes = await trx.execute(
          `INSERT INTO fines (loan_id, student_id, overdue_days, fine_rate, total_amount, paid_amount, status)
           VALUES (?, ?, ?, ?, ?, 0.00, 'Unpaid')
           ON DUPLICATE KEY UPDATE
             overdue_days = VALUES(overdue_days),
             fine_rate = VALUES(fine_rate),
             total_amount = VALUES(total_amount),
             updated_at = CURRENT_TIMESTAMP`,
          [loanId, loan.student_id, overdueInfo.overdueDays, settings.fineRatePerDay, overdueInfo.calculatedFine]
        );
        fineRecord = {
          id: fineRes.insertId,
          overdueDays: overdueInfo.overdueDays,
          fineAmount: overdueInfo.calculatedFine,
          status: 'Unpaid',
        };
      }

      // Designated shelving location
      const designatedShelvingLocation = loan.shelf_id
        ? `${loan.floor_name || `Floor ${loan.floor_number}`} → ${loan.section_name} → Rack ${loan.rack_number} → Shelf ${loan.shelf_number}`
        : 'Storage / Unassigned Shelf (Please assign via Location Manager)';

      return {
        loanId,
        bookTitle: loan.book_title,
        copyAccession: loan.accession_number,
        studentName: loan.student_name,
        returnDate,
        overdueInfo,
        fineRecord,
        designatedShelvingLocation,
        updatedCopyStatus: newCopyStatus,
      };
    });

    await logAudit(returnerUserId, 'RETURN_BOOK', 'loans', loanId, {
      fine: returnResult.fineRecord?.fineAmount || 0,
      overdueDays: returnResult.overdueInfo.overdueDays,
    });

    res.json({
      success: true,
      message: `Return processed successfully for "${returnResult.bookTitle}" (${returnResult.copyAccession}).`,
      data: returnResult,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// GET ACTIVE LOANS
export async function getActiveLoans(req: Request, res: Response): Promise<void> {
  try {
    const isStudent = req.user?.role === 'student';
    const studentIdParam = req.query.studentId ? Number(req.query.studentId) : undefined;
    const filterStudentId = isStudent ? req.user?.studentId : studentIdParam;

    let where = ["l.status != 'Returned'"];
    let params: any[] = [];

    if (filterStudentId) {
      where.push('l.student_id = ?');
      params.push(filterStudentId);
    }

    const loans = await db.query(
      `SELECT l.id, l.issue_date, l.due_date, l.status, l.notes,
              s.id as student_id, s.student_reg_no, s.department,
              u.full_name as student_name, u.email as student_email,
              bc.id as copy_id, bc.accession_number, bc.barcode, bc.condition as copy_condition,
              b.id as book_id, b.title as book_title, b.author as book_author, b.cover_image_url,
              sh.shelf_number, rk.rack_number, sec.code as section_code, fl.floor_number
       FROM loans l
       JOIN students s ON l.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN book_copies bc ON l.copy_id = bc.id
       JOIN books b ON bc.book_id = b.id
       LEFT JOIN shelves sh ON bc.shelf_id = sh.id
       LEFT JOIN racks rk ON sh.rack_id = rk.id
       LEFT JOIN sections sec ON rk.section_id = sec.id
       LEFT JOIN floors fl ON sec.floor_id = fl.id
       WHERE ${where.join(' AND ')}
       ORDER BY l.due_date ASC`,
      params
    );

    const settings = await getLibrarySettings();
    const now = new Date();

    const data = loans.map((l: any) => {
      const overdue = calculateOverdue(l.due_date, now, {
        gracePeriodDays: settings.gracePeriodDays,
        fineRatePerDay: settings.fineRatePerDay,
        maxFineLimit: settings.maxFineLimit,
      });

      return {
        ...l,
        isOverdue: overdue.isOverdue,
        overdueDays: overdue.overdueDays,
        estimatedFine: overdue.calculatedFine,
      };
    });

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET BORROWING HISTORY
export async function getBorrowingHistory(req: Request, res: Response): Promise<void> {
  try {
    const isStudent = req.user?.role === 'student';
    const filterStudentId = isStudent ? req.user?.studentId : (req.query.studentId ? Number(req.query.studentId) : undefined);
    const status = req.query.status as string | undefined;

    let where: string[] = [];
    let params: any[] = [];

    if (filterStudentId) {
      where.push('l.student_id = ?');
      params.push(filterStudentId);
    }

    if (status && status !== 'all') {
      where.push('l.status = ?');
      params.push(status);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const history = await db.query(
      `SELECT l.id, l.issue_date, l.due_date, l.return_date, l.status, l.notes,
              s.student_reg_no, u.full_name as student_name,
              bc.accession_number, bc.barcode,
              b.id as book_id, b.title as book_title, b.author as book_author,
              issuer.full_name as issued_by_name,
              returner.full_name as returned_by_name,
              f.total_amount as fine_amount, f.paid_amount as fine_paid, f.status as fine_status
       FROM loans l
       JOIN students s ON l.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN book_copies bc ON l.copy_id = bc.id
       JOIN books b ON bc.book_id = b.id
       LEFT JOIN users issuer ON l.issued_by = issuer.id
       LEFT JOIN users returner ON l.returned_by = returner.id
       LEFT JOIN fines f ON l.id = f.loan_id
       ${whereSql}
       ORDER BY l.issue_date DESC`,
      params
    );

    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET OVERDUE LOANS
export async function getOverdueLoans(req: Request, res: Response): Promise<void> {
  try {
    const settings = await getLibrarySettings();
    const isStudent = req.user?.role === 'student';
    const filterStudentId = isStudent ? req.user?.studentId : undefined;

    let studentClause = '';
    let params: any[] = [];

    if (filterStudentId) {
      studentClause = 'AND l.student_id = ?';
      params.push(filterStudentId);
    }

    const loans = await db.query(
      `SELECT l.id, l.issue_date, l.due_date, l.status,
              s.id as student_id, s.student_reg_no, s.department,
              u.full_name as student_name, u.email as student_email, u.phone as student_phone,
              bc.id as copy_id, bc.accession_number, bc.barcode,
              b.id as book_id, b.title as book_title, b.author as book_author,
              f.id as fine_id, f.total_amount as existing_fine_amount, f.status as fine_status
       FROM loans l
       JOIN students s ON l.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN book_copies bc ON l.copy_id = bc.id
       JOIN books b ON bc.book_id = b.id
       LEFT JOIN fines f ON l.id = f.loan_id
       WHERE l.status != 'Returned' AND l.due_date < CURRENT_TIMESTAMP
       ${studentClause}
       ORDER BY l.due_date ASC`,
      params
    );

    const now = new Date();
    const data = loans.map((l: any) => {
      const overdue = calculateOverdue(l.due_date, now, {
        gracePeriodDays: settings.gracePeriodDays,
        fineRatePerDay: settings.fineRatePerDay,
        maxFineLimit: settings.maxFineLimit,
      });

      return {
        ...l,
        overdueDays: overdue.overdueDays,
        calculatedFine: overdue.calculatedFine,
        fineRatePerDay: settings.fineRatePerDay,
      };
    });

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
