import { Request, Response } from 'express';
import { db } from '../database/db';
import { logAudit } from '../middlewares/errorHandler';

export async function getStudents(req: Request, res: Response): Promise<void> {
  try {
    const q = req.query.q as string | undefined;
    const department = req.query.department as string | undefined;
    const status = req.query.status as string | undefined;

    let where: string[] = ['u.role_id = 3'];
    let params: any[] = [];

    if (q && q.trim()) {
      where.push('(u.full_name LIKE ? OR u.email LIKE ? OR s.student_reg_no LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term, term);
    }

    if (department && department !== 'all') {
      where.push('s.department = ?');
      params.push(department);
    }

    if (status && status !== 'all') {
      where.push('s.is_active = ?');
      params.push(status === 'active' ? 1 : 0);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const students = await db.query(
      `SELECT s.id as student_id, s.student_reg_no, s.department, s.academic_year,
              s.max_books_allowed, s.is_active as student_active, s.created_at,
              u.id as user_id, u.full_name, u.email, u.phone, u.is_active as user_active,
              COUNT(DISTINCT CASE WHEN l.status = 'Active' THEN l.id END) as active_loans_count,
              COUNT(DISTINCT CASE WHEN l.status = 'Active' AND l.due_date < CURRENT_TIMESTAMP THEN l.id END) as overdue_loans_count,
              COALESCE(SUM(CASE WHEN f.status = 'Unpaid' OR f.status = 'Partially_Paid' THEN (f.total_amount - f.paid_amount) ELSE 0 END), 0) as outstanding_fines
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN loans l ON s.id = l.student_id
       LEFT JOIN fines f ON s.id = f.student_id
       ${whereSql}
       GROUP BY s.id
       ORDER BY s.id DESC`,
      params
    );

    res.json({ success: true, data: students });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getStudentById(req: Request, res: Response): Promise<void> {
  try {
    const studentId = Number(req.params.id);

    // If request user is a student, ensure they can only access their own profile!
    if (req.user?.role === 'student' && req.user.studentId !== studentId) {
      res.status(403).json({ success: false, message: 'Access denied. You can only view your own student profile.' });
      return;
    }

    const students = await db.query(
      `SELECT s.id as student_id, s.student_reg_no, s.department, s.academic_year,
              s.max_books_allowed, s.is_active as student_active, s.created_at,
              u.id as user_id, u.full_name, u.email, u.phone, u.is_active as user_active
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [studentId]
    );

    if (students.length === 0) {
      res.status(404).json({ success: false, message: 'Student record not found' });
      return;
    }

    const student = students[0];

    // Get active loans
    const activeLoans = await db.query(
      `SELECT l.id as loan_id, l.issue_date, l.due_date, l.status,
              bc.accession_number, bc.barcode,
              b.id as book_id, b.title as book_title, b.author as book_author, b.cover_image_url
       FROM loans l
       JOIN book_copies bc ON l.copy_id = bc.id
       JOIN books b ON bc.book_id = b.id
       WHERE l.student_id = ? AND l.status = 'Active'
       ORDER BY l.due_date ASC`,
      [studentId]
    );

    // Get fines summary
    const fines = await db.query(
      `SELECT f.id as fine_id, f.total_amount, f.paid_amount, f.status,
              (f.total_amount - f.paid_amount) as balance,
              b.title as book_title
       FROM fines f
       JOIN loans l ON f.loan_id = l.id
       JOIN book_copies bc ON l.copy_id = bc.id
       JOIN books b ON bc.book_id = b.id
       WHERE f.student_id = ? AND (f.status = 'Unpaid' OR f.status = 'Partially_Paid')`,
      [studentId]
    );

    res.json({
      success: true,
      data: {
        ...student,
        activeLoans,
        outstandingFines: fines,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function toggleStudentStatus(req: Request, res: Response): Promise<void> {
  try {
    const studentId = Number(req.params.id);
    const { isActive } = req.body;

    const students = await db.query('SELECT user_id FROM students WHERE id = ?', [studentId]);
    if (students.length === 0) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const userId = students[0].user_id;
    const activeVal = isActive ? 1 : 0;

    await db.execute('UPDATE students SET is_active = ? WHERE id = ?', [activeVal, studentId]);
    await db.execute('UPDATE users SET is_active = ? WHERE id = ?', [activeVal, userId]);

    await logAudit(req.user?.userId || null, 'TOGGLE_STUDENT_STATUS', 'students', studentId, { isActive });

    res.json({ success: true, message: `Student account has been ${isActive ? 'activated' : 'deactivated'}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateStudent(req: Request, res: Response): Promise<void> {
  try {
    const studentId = Number(req.params.id);
    const { fullName, phone, department, academicYear, maxBooksAllowed } = req.body;

    const students = await db.query('SELECT user_id FROM students WHERE id = ?', [studentId]);
    if (students.length === 0) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const userId = students[0].user_id;

    if (fullName || phone !== undefined) {
      await db.execute(
        'UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [fullName || null, phone || null, userId]
      );
    }

    await db.execute(
      `UPDATE students
       SET department = COALESCE(?, department),
           academic_year = COALESCE(?, academic_year),
           max_books_allowed = COALESCE(?, max_books_allowed),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [department || null, academicYear || null, maxBooksAllowed || null, studentId]
    );

    res.json({ success: true, message: 'Student information updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
