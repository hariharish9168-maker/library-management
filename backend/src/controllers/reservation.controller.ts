import { Request, Response } from 'express';
import { db } from '../database/db';
import { logAudit } from '../middlewares/errorHandler';

export async function createReservation(req: Request, res: Response): Promise<void> {
  try {
    const { bookId, notes } = req.body;
    const studentId = req.user?.studentId;

    if (!studentId) {
      res.status(403).json({ success: false, message: 'Only registered students can reserve books.' });
      return;
    }

    if (!bookId) {
      res.status(400).json({ success: false, message: 'bookId is required' });
      return;
    }

    // Check if student already has a pending reservation for this book
    const existing = await db.query(
      `SELECT id FROM reservations WHERE book_id = ? AND student_id = ? AND status = 'Pending'`,
      [bookId, studentId]
    );

    if (existing.length > 0) {
      res.status(400).json({ success: false, message: 'You already have an active pending reservation for this book.' });
      return;
    }

    // Determine current queue order
    const queueRows = await db.query(
      `SELECT COUNT(*) as count FROM reservations WHERE book_id = ? AND status = 'Pending'`,
      [bookId]
    );
    const queueOrder = Number(queueRows[0]?.count || 0) + 1;

    const result = await db.execute(
      `INSERT INTO reservations (book_id, student_id, queue_order, status, notes)
       VALUES (?, ?, ?, 'Pending', ?)`,
      [bookId, studentId, queueOrder, notes || null]
    );

    await logAudit(req.user?.userId || null, 'CREATE_RESERVATION', 'reservations', result.insertId!, { bookId, queueOrder });

    res.status(201).json({
      success: true,
      message: `Reservation placed successfully! Your position in line is #${queueOrder}.`,
      data: { id: result.insertId, bookId, queueOrder, status: 'Pending' },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getReservations(req: Request, res: Response): Promise<void> {
  try {
    const isStudent = req.user?.role === 'student';
    const filterStudentId = isStudent ? req.user?.studentId : (req.query.studentId ? Number(req.query.studentId) : undefined);
    const bookId = req.query.bookId ? Number(req.query.bookId) : undefined;

    let where: string[] = [];
    let params: any[] = [];

    if (filterStudentId) {
      where.push('r.student_id = ?');
      params.push(filterStudentId);
    }

    if (bookId) {
      where.push('r.book_id = ?');
      params.push(bookId);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const reservations = await db.query(
      `SELECT r.*,
              b.title as book_title, b.author as book_author, b.cover_image_url,
              s.student_reg_no, u.full_name as student_name, u.email as student_email
       FROM reservations r
       JOIN books b ON r.book_id = b.id
       JOIN students s ON r.student_id = s.id
       JOIN users u ON s.user_id = u.id
       ${whereSql}
       ORDER BY r.reserved_at DESC`,
      params
    );

    res.json({ success: true, data: reservations });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function cancelReservation(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const isStudent = req.user?.role === 'student';

    const resRecord = await db.query('SELECT * FROM reservations WHERE id = ?', [id]);
    if (resRecord.length === 0) {
      res.status(404).json({ success: false, message: 'Reservation not found' });
      return;
    }

    if (isStudent && resRecord[0].student_id !== req.user?.studentId) {
      res.status(403).json({ success: false, message: 'You can only cancel your own reservations.' });
      return;
    }

    await db.execute("UPDATE reservations SET status = 'Cancelled' WHERE id = ?", [id]);

    res.json({ success: true, message: 'Reservation cancelled successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
