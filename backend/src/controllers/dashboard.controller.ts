import { Request, Response } from 'express';
import { db } from '../database/db';

export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    // 1. Total book titles (non-archived)
    const booksCount = await db.query('SELECT COUNT(*) as count FROM books WHERE is_archived = 0');
    const totalTitles = Number(booksCount[0]?.count || 0);

    // 2. Physical copies breakdown (total, available, issued, maintenance/archived)
    const copiesStats = await db.query(
      `SELECT
         COUNT(*) as total_copies,
         SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available_copies,
         SUM(CASE WHEN status = 'Issued' THEN 1 ELSE 0 END) as issued_copies,
         SUM(CASE WHEN status = 'Maintenance' OR status = 'Reserved' THEN 1 ELSE 0 END) as other_copies
       FROM book_copies bc
       JOIN books b ON bc.book_id = b.id
       WHERE b.is_archived = 0 AND bc.status != 'Archived'`
    );

    const totalCopies = Number(copiesStats[0]?.total_copies || 0);
    const availableCopies = Number(copiesStats[0]?.available_copies || 0);
    const issuedCopies = Number(copiesStats[0]?.issued_copies || 0);

    // 3. Registered active students
    const studentsCount = await db.query('SELECT COUNT(*) as count FROM students WHERE is_active = 1');
    const registeredStudents = Number(studentsCount[0]?.count || 0);

    // 4. Overdue loans
    const overdueCount = await db.query(
      `SELECT COUNT(*) as count FROM loans WHERE status != 'Returned' AND due_date < CURRENT_TIMESTAMP`
    );
    const overdueLoans = Number(overdueCount[0]?.count || 0);

    // 5. Total outstanding fines
    const finesStats = await db.query(
      `SELECT SUM(total_amount - paid_amount) as outstanding FROM fines WHERE status IN ('Unpaid', 'Partially_Paid')`
    );
    const outstandingFines = parseFloat(finesStats[0]?.outstanding || '0');

    // 6. Recent book additions (last 5)
    const recentBooks = await db.query(
      `SELECT b.id, b.title, b.author, b.isbn, b.created_at, c.name as category_name
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.is_archived = 0
       ORDER BY b.created_at DESC
       LIMIT 5`
    );

    // 7. Recent issues and returns (last 5)
    const recentTransactions = await db.query(
      `SELECT l.id, l.issue_date, l.due_date, l.return_date, l.status,
              b.title as book_title, bc.accession_number,
              u.full_name as student_name
       FROM loans l
       JOIN book_copies bc ON l.copy_id = bc.id
       JOIN books b ON bc.book_id = b.id
       JOIN students s ON l.student_id = s.id
       JOIN users u ON s.user_id = u.id
       ORDER BY l.updated_at DESC
       LIMIT 5`
    );

    // 8. Circulation stats by category for Recharts pie/bar chart
    const categoryStats = await db.query(
      `SELECT c.name as category, COUNT(bc.id) as total_copies,
              SUM(CASE WHEN bc.status = 'Issued' THEN 1 ELSE 0 END) as issued_copies
       FROM categories c
       LEFT JOIN books b ON c.id = b.category_id AND b.is_archived = 0
       LEFT JOIN book_copies bc ON b.id = bc.book_id
       GROUP BY c.id
       ORDER BY total_copies DESC`
    );

    // 9. Location distribution stats
    const floorStats = await db.query(
      `SELECT fl.name as floor_name, COUNT(bc.id) as copies_count
       FROM floors fl
       LEFT JOIN sections sec ON fl.id = sec.floor_id
       LEFT JOIN racks rk ON sec.id = rk.section_id
       LEFT JOIN shelves sh ON rk.id = sh.rack_id
       LEFT JOIN book_copies bc ON sh.id = bc.shelf_id AND bc.status != 'Archived'
       GROUP BY fl.id
       ORDER BY fl.floor_number ASC`
    );

    res.json({
      success: true,
      data: {
        summary: {
          totalTitles,
          totalCopies,
          availableCopies,
          issuedCopies,
          registeredStudents,
          overdueLoans,
          outstandingFines,
        },
        recentBooks,
        recentTransactions,
        categoryStats,
        floorStats,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
