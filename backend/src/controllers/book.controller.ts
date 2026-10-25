import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../database/db';
import { logAudit } from '../middlewares/errorHandler';

const bookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  author: z.string().min(1, 'Author is required').max(255),
  isbn: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  edition: z.string().optional().nullable(),
  publicationYear: z.number().int().optional().nullable(),
  categoryId: z.number().int().positive('Category is required'),
  description: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  initialCopiesCount: z.number().int().min(0).max(50).optional().nullable(),
  initialShelfId: z.number().int().positive().optional().nullable(),
});

export async function getBooks(req: Request, res: Response): Promise<void> {
  try {
    const q = req.query.q as string | undefined;
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const availability = req.query.availability as string | undefined; // 'all' | 'available' | 'issued'
    const showArchived = req.query.archived === 'true' ? 1 : 0;
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '20', 10)));
    const offset = (page - 1) * limit;

    let whereClauses: string[] = ['b.is_archived = ?'];
    let params: any[] = [showArchived];

    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      whereClauses.push('(b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)');
      params.push(term, term, term);
    }

    if (categoryId) {
      whereClauses.push('b.category_id = ?');
      params.push(categoryId);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRows = await db.query(
      `SELECT COUNT(DISTINCT b.id) as total
       FROM books b
       ${whereSql}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    const books = await db.query(
      `SELECT b.id, b.title, b.author, b.isbn, b.publisher, b.edition, b.publication_year,
              b.category_id, b.description, b.cover_image_url, b.is_archived, b.created_at, b.updated_at,
              c.name as category_name, c.code as category_code,
              COUNT(bc.id) as total_copies,
              SUM(CASE WHEN bc.status = 'Available' THEN 1 ELSE 0 END) as available_copies,
              SUM(CASE WHEN bc.status = 'Issued' THEN 1 ELSE 0 END) as issued_copies
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN book_copies bc ON b.id = bc.book_id
       ${whereSql}
       GROUP BY b.id
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Apply availability filter if needed
    let filteredBooks = books;
    if (availability === 'available') {
      filteredBooks = books.filter((b: any) => Number(b.available_copies) > 0);
    } else if (availability === 'issued') {
      filteredBooks = books.filter((b: any) => Number(b.issued_copies) > 0);
    }

    res.json({
      success: true,
      data: filteredBooks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getBookById(req: Request, res: Response): Promise<void> {
  try {
    const bookId = Number(req.params.id);
    const books = await db.query(
      `SELECT b.*, c.name as category_name, c.code as category_code
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.id = ?`,
      [bookId]
    );

    if (books.length === 0) {
      res.status(404).json({ success: false, message: 'Book not found' });
      return;
    }

    const book = books[0];

    // Fetch physical copies with exact location path
    const copies = await db.query(
      `SELECT bc.id, bc.accession_number, bc.barcode, bc.condition, bc.status, bc.created_at,
              sh.id as shelf_id, sh.shelf_number,
              rk.id as rack_id, rk.rack_number,
              sec.id as section_id, sec.code as section_code, sec.name as section_name,
              fl.id as floor_id, fl.floor_number, fl.name as floor_name
       FROM book_copies bc
       LEFT JOIN shelves sh ON bc.shelf_id = sh.id
       LEFT JOIN racks rk ON sh.rack_id = rk.id
       LEFT JOIN sections sec ON rk.section_id = sec.id
       LEFT JOIN floors fl ON sec.floor_id = fl.id
       WHERE bc.book_id = ?
       ORDER BY bc.accession_number ASC`,
      [bookId]
    );

    res.json({
      success: true,
      data: {
        ...book,
        copies,
        totalCopies: copies.length,
        availableCopies: copies.filter((c: any) => c.status === 'Available').length,
        issuedCopies: copies.filter((c: any) => c.status === 'Issued').length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createBook(req: Request, res: Response): Promise<void> {
  try {
    const parsed = bookSchema.parse(req.body);

    if (parsed.isbn && parsed.isbn.trim()) {
      const existing = await db.query('SELECT id FROM books WHERE isbn = ?', [parsed.isbn.trim()]);
      if (existing.length > 0) {
        res.status(400).json({ success: false, message: 'A book with this ISBN already exists.' });
        return;
      }
    }

    const result = await db.transaction(async (trx) => {
      const bookRes = await trx.execute(
        `INSERT INTO books (title, author, isbn, publisher, edition, publication_year, category_id, description, cover_image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parsed.title,
          parsed.author,
          parsed.isbn?.trim() || null,
          parsed.publisher || null,
          parsed.edition || null,
          parsed.publicationYear || null,
          parsed.categoryId,
          parsed.description || null,
          parsed.coverImageUrl || null,
        ]
      );

      const bookId = bookRes.insertId!;
      const copiesCreated: any[] = [];
      const copiesCount = parsed.initialCopiesCount || 0;

      if (copiesCount > 0) {
        for (let i = 1; i <= copiesCount; i++) {
          const accNumber = `ACC-${bookId}-${String(i).padStart(2, '0')}`;
          const barcode = `BC-${bookId}${String(i).padStart(2, '0')}`;
          await trx.execute(
            `INSERT INTO book_copies (book_id, accession_number, barcode, shelf_id, condition, status)
             VALUES (?, ?, ?, ?, 'Good', 'Available')`,
            [bookId, accNumber, barcode, parsed.initialShelfId || null]
          );
          copiesCreated.push({ accessionNumber: accNumber, barcode, shelfId: parsed.initialShelfId || null });
        }
      }

      return { bookId, copiesCreated };
    });

    await logAudit(req.user?.userId || null, 'CREATE_BOOK', 'books', result.bookId, {
      title: parsed.title,
      copiesCount: result.copiesCreated.length,
    });

    res.status(201).json({
      success: true,
      message: 'Book created successfully' + (result.copiesCreated.length > 0 ? ` with ${result.copiesCreated.length} physical copies.` : '.'),
      data: { id: result.bookId, ...parsed, copies: result.copiesCreated },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: err.errors.map(e => e.message).join(', ') });
      return;
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateBook(req: Request, res: Response): Promise<void> {
  try {
    const bookId = Number(req.params.id);
    const parsed = bookSchema.parse(req.body);

    if (parsed.isbn && parsed.isbn.trim()) {
      const existing = await db.query('SELECT id FROM books WHERE isbn = ? AND id != ?', [parsed.isbn.trim(), bookId]);
      if (existing.length > 0) {
        res.status(400).json({ success: false, message: 'Another book already uses this ISBN.' });
        return;
      }
    }

    await db.execute(
      `UPDATE books SET title = ?, author = ?, isbn = ?, publisher = ?, edition = ?,
              publication_year = ?, category_id = ?, description = ?, cover_image_url = ?,
              updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        parsed.title,
        parsed.author,
        parsed.isbn?.trim() || null,
        parsed.publisher || null,
        parsed.edition || null,
        parsed.publicationYear || null,
        parsed.categoryId,
        parsed.description || null,
        parsed.coverImageUrl || null,
        bookId,
      ]
    );

    await logAudit(req.user?.userId || null, 'UPDATE_BOOK', 'books', bookId, { title: parsed.title });

    res.json({ success: true, message: 'Book updated successfully' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: err.errors.map(e => e.message).join(', ') });
      return;
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function archiveBook(req: Request, res: Response): Promise<void> {
  try {
    const bookId = Number(req.params.id);
    const { isArchived = true } = req.body;

    await db.execute('UPDATE books SET is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      isArchived ? 1 : 0,
      bookId,
    ]);

    await logAudit(req.user?.userId || null, isArchived ? 'ARCHIVE_BOOK' : 'RESTORE_BOOK', 'books', bookId);

    res.json({
      success: true,
      message: isArchived ? 'Book archived safely without affecting loan history.' : 'Book restored successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    const categories = await db.query(
      `SELECT c.*, COUNT(b.id) as book_count
       FROM categories c
       LEFT JOIN books b ON c.id = b.category_id AND b.is_archived = 0
       GROUP BY c.id
       ORDER BY c.name ASC`
    );
    res.json({ success: true, data: categories });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) {
      res.status(400).json({ success: false, message: 'Name and code are required' });
      return;
    }

    const result = await db.execute(
      'INSERT INTO categories (name, code, description) VALUES (?, ?, ?)',
      [name, code.toUpperCase(), description || null]
    );

    res.status(201).json({ success: true, data: { id: result.insertId, name, code, description } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
