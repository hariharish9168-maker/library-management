import { Request, Response } from 'express';
import { db } from '../database/db';

export async function exportBooksCSV(req: Request, res: Response): Promise<void> {
  try {
    const books = await db.query(
      `SELECT b.id, b.title, b.author, b.isbn, b.publisher, b.edition, b.publication_year,
              c.name as category,
              COUNT(bc.id) as total_copies,
              SUM(CASE WHEN bc.status = 'Available' THEN 1 ELSE 0 END) as available_copies,
              SUM(CASE WHEN bc.status = 'Issued' THEN 1 ELSE 0 END) as issued_copies,
              b.created_at
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN book_copies bc ON b.id = bc.book_id
       WHERE b.is_archived = 0
       GROUP BY b.id
       ORDER BY b.title ASC`
    );

    const headers = ['Book ID', 'Title', 'Author', 'ISBN', 'Publisher', 'Edition', 'Year', 'Category', 'Total Copies', 'Available', 'Issued', 'Added Date'];
    const rows = books.map((b: any) => [
      b.id,
      `"${(b.title || '').replace(/"/g, '""')}"`,
      `"${(b.author || '').replace(/"/g, '""')}"`,
      b.isbn || '',
      `"${(b.publisher || '').replace(/"/g, '""')}"`,
      b.edition || '',
      b.publication_year || '',
      `"${(b.category || '').replace(/"/g, '""')}"`,
      b.total_copies,
      b.available_copies,
      b.issued_copies,
      b.created_at,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="library_books_catalogue.csv"');
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function exportLoansCSV(req: Request, res: Response): Promise<void> {
  try {
    const loans = await db.query(
      `SELECT l.id, l.issue_date, l.due_date, l.return_date, l.status,
              s.student_reg_no, u.full_name as student_name,
              bc.accession_number, b.title as book_title,
              f.total_amount as fine_amount, f.status as fine_status
       FROM loans l
       JOIN students s ON l.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN book_copies bc ON l.copy_id = bc.id
       JOIN books b ON bc.book_id = b.id
       LEFT JOIN fines f ON l.id = f.loan_id
       ORDER BY l.issue_date DESC`
    );

    const headers = ['Loan ID', 'Student Reg No', 'Student Name', 'Accession No', 'Book Title', 'Issue Date', 'Due Date', 'Return Date', 'Status', 'Fine Amount', 'Fine Status'];
    const rows = loans.map((l: any) => [
      l.id,
      l.student_reg_no,
      `"${(l.student_name || '').replace(/"/g, '""')}"`,
      l.accession_number,
      `"${(l.book_title || '').replace(/"/g, '""')}"`,
      l.issue_date,
      l.due_date,
      l.return_date || '',
      l.status,
      l.fine_amount || '0.00',
      l.fine_status || 'None',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="library_circulation_loans.csv"');
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getInventoryReport(req: Request, res: Response): Promise<void> {
  try {
    const byCategory = await db.query(
      `SELECT c.name as category_name, COUNT(DISTINCT b.id) as titles_count, COUNT(bc.id) as copies_count
       FROM categories c
       LEFT JOIN books b ON c.id = b.category_id AND b.is_archived = 0
       LEFT JOIN book_copies bc ON b.id = bc.book_id
       GROUP BY c.id
       ORDER BY titles_count DESC`
    );

    const byCondition = await db.query(
      `SELECT \`condition\`, COUNT(*) as count
       FROM book_copies
       WHERE status != 'Archived'
       GROUP BY \`condition\``
    );

    const byStatus = await db.query(
      `SELECT status, COUNT(*) as count
       FROM book_copies
       GROUP BY status`
    );

    res.json({
      success: true,
      data: {
        byCategory,
        byCondition,
        byStatus,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
