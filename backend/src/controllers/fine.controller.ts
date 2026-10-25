import { Request, Response } from 'express';
import { db } from '../database/db';
import { logAudit } from '../middlewares/errorHandler';

export async function getFines(req: Request, res: Response): Promise<void> {
  try {
    const isStudent = req.user?.role === 'student';
    const filterStudentId = isStudent ? req.user?.studentId : (req.query.studentId ? Number(req.query.studentId) : undefined);
    const status = req.query.status as string | undefined;

    let where: string[] = [];
    let params: any[] = [];

    if (filterStudentId) {
      where.push('f.student_id = ?');
      params.push(filterStudentId);
    }

    if (status && status !== 'all') {
      where.push('f.status = ?');
      params.push(status);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const fines = await db.query(
      `SELECT f.id, f.loan_id, f.student_id, f.overdue_days, f.fine_rate, f.total_amount, f.paid_amount,
              f.status, f.created_at, f.updated_at,
              (f.total_amount - f.paid_amount) as outstanding_balance,
              s.student_reg_no, s.department,
              u.full_name as student_name, u.email as student_email,
              b.id as book_id, b.title as book_title,
              bc.accession_number, bc.barcode,
              l.issue_date, l.due_date, l.return_date
       FROM fines f
       JOIN students s ON f.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN loans l ON f.loan_id = l.id
       JOIN book_copies bc ON l.copy_id = bc.id
       JOIN books b ON bc.book_id = b.id
       ${whereSql}
       ORDER BY f.created_at DESC`,
      params
    );

    res.json({ success: true, data: fines });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function recordPayment(req: Request, res: Response): Promise<void> {
  try {
    const { fineId, amount, paymentType = 'Cash', transactionReference, notes } = req.body;
    const receivedBy = req.user!.userId;

    if (!fineId || !amount || amount <= 0) {
      res.status(400).json({ success: false, message: 'Valid fineId and positive amount are required.' });
      return;
    }

    await db.transaction(async (trx) => {
      const fines = await trx.query('SELECT * FROM fines WHERE id = ?', [fineId]);
      if (fines.length === 0) {
        throw new Error('Fine record not found.');
      }

      const fine = fines[0];
      const outstanding = fine.total_amount - fine.paid_amount;

      if (outstanding <= 0) {
        throw new Error('Fine is already fully paid.');
      }

      const payAmount = Math.min(amount, outstanding);
      const newPaid = Number(fine.paid_amount) + payAmount;
      const newStatus = newPaid >= fine.total_amount ? 'Paid' : 'Partially_Paid';

      // 1. Insert payment
      await trx.execute(
        `INSERT INTO fine_payments (fine_id, amount, payment_type, received_by, transaction_reference, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [fineId, payAmount, paymentType, receivedBy, transactionReference || null, notes || null]
      );

      // 2. Update fine
      await trx.execute(
        `UPDATE fines
         SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newPaid, newStatus, fineId]
      );
    });

    await logAudit(receivedBy, 'FINE_PAYMENT', 'fines', fineId, { amount, paymentType });

    res.json({ success: true, message: 'Fine payment recorded successfully.' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function waiveFine(req: Request, res: Response): Promise<void> {
  try {
    const { fineId, reason } = req.body;
    const waivedBy = req.user!.userId;

    if (!fineId) {
      res.status(400).json({ success: false, message: 'Fine ID is required' });
      return;
    }

    await db.transaction(async (trx) => {
      const fines = await trx.query('SELECT * FROM fines WHERE id = ?', [fineId]);
      if (fines.length === 0) {
        throw new Error('Fine record not found.');
      }

      const fine = fines[0];
      const remainingToWaive = fine.total_amount - fine.paid_amount;

      // Insert waiver payment record
      await trx.execute(
        `INSERT INTO fine_payments (fine_id, amount, payment_type, received_by, notes)
         VALUES (?, ?, 'Waiver', ?, ?)`,
        [fineId, remainingToWaive, waivedBy, reason || 'Authorized fine waiver']
      );

      // Mark fine as Waived
      await trx.execute(
        `UPDATE fines
         SET status = 'Waived', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [fineId]
      );
    });

    await logAudit(waivedBy, 'WAIVE_FINE', 'fines', fineId, { reason });

    res.json({ success: true, message: 'Fine has been officially waived.' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getFineSummary(req: Request, res: Response): Promise<void> {
  try {
    const summary = await db.query(
      `SELECT
         SUM(total_amount) as total_levied,
         SUM(paid_amount) as total_collected,
         SUM(CASE WHEN status = 'Unpaid' OR status = 'Partially_Paid' THEN (total_amount - paid_amount) ELSE 0 END) as total_outstanding,
         SUM(CASE WHEN status = 'Waived' THEN (total_amount - paid_amount) ELSE 0 END) as total_waived
       FROM fines`
    );

    res.json({
      success: true,
      data: {
        totalLevied: parseFloat(summary[0]?.total_levied || '0'),
        totalCollected: parseFloat(summary[0]?.total_collected || '0'),
        totalOutstanding: parseFloat(summary[0]?.total_outstanding || '0'),
        totalWaived: parseFloat(summary[0]?.total_waived || '0'),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
