import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../database/db';
import { logAudit } from '../middlewares/errorHandler';

const copySchema = z.object({
  bookId: z.number().int().positive('Book ID is required'),
  accessionNumber: z.string().min(1, 'Accession number is required'),
  barcode: z.string().optional().nullable(),
  shelfId: z.number().int().optional().nullable(),
  condition: z.enum(['New', 'Good', 'Worn', 'Damaged', 'Lost']).default('Good'),
  status: z.enum(['Available', 'Issued', 'Reserved', 'Maintenance', 'Archived']).default('Available'),
});

export async function getCopies(req: Request, res: Response): Promise<void> {
  try {
    const bookId = req.query.bookId ? Number(req.query.bookId) : undefined;
    const shelfId = req.query.shelfId ? Number(req.query.shelfId) : undefined;
    const status = req.query.status as string | undefined;
    const condition = req.query.condition as string | undefined;
    const q = req.query.q as string | undefined;

    let where: string[] = [];
    let params: any[] = [];

    if (bookId) {
      where.push('bc.book_id = ?');
      params.push(bookId);
    }

    if (shelfId) {
      where.push('bc.shelf_id = ?');
      params.push(shelfId);
    }

    if (status) {
      where.push('bc.status = ?');
      params.push(status);
    }

    if (condition) {
      where.push('bc.condition = ?');
      params.push(condition);
    }

    if (q && q.trim()) {
      where.push('(bc.accession_number LIKE ? OR bc.barcode LIKE ? OR b.title LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term, term);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const copies = await db.query(
      `SELECT bc.id, bc.book_id, bc.accession_number, bc.barcode, bc.condition, bc.status, bc.created_at,
              b.title as book_title, b.author as book_author, b.isbn as book_isbn, b.cover_image_url,
              sh.id as shelf_id, sh.shelf_number,
              rk.id as rack_id, rk.rack_number,
              sec.id as section_id, sec.code as section_code, sec.name as section_name,
              fl.id as floor_id, fl.floor_number, fl.name as floor_name
       FROM book_copies bc
       JOIN books b ON bc.book_id = b.id
       LEFT JOIN shelves sh ON bc.shelf_id = sh.id
       LEFT JOIN racks rk ON sh.rack_id = rk.id
       LEFT JOIN sections sec ON rk.section_id = sec.id
       LEFT JOIN floors fl ON sec.floor_id = fl.id
       ${whereSql}
       ORDER BY bc.id DESC`,
      params
    );

    res.json({ success: true, data: copies });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getCopyByCode(req: Request, res: Response): Promise<void> {
  try {
    const code = req.params.code;
    const copies = await db.query(
      `SELECT bc.id, bc.book_id, bc.accession_number, bc.barcode, bc.condition, bc.status, bc.created_at,
              b.title as book_title, b.author as book_author, b.isbn as book_isbn, b.cover_image_url,
              sh.id as shelf_id, sh.shelf_number,
              rk.id as rack_id, rk.rack_number,
              sec.id as section_id, sec.code as section_code, sec.name as section_name,
              fl.id as floor_id, fl.floor_number, fl.name as floor_name
       FROM book_copies bc
       JOIN books b ON bc.book_id = b.id
       LEFT JOIN shelves sh ON bc.shelf_id = sh.id
       LEFT JOIN racks rk ON sh.rack_id = rk.id
       LEFT JOIN sections sec ON rk.section_id = sec.id
       LEFT JOIN floors fl ON sec.floor_id = fl.id
       WHERE bc.accession_number = ? OR bc.barcode = ?
       LIMIT 1`,
      [code, code]
    );

    if (copies.length === 0) {
      res.status(404).json({ success: false, message: `No copy found for accession or barcode '${code}'` });
      return;
    }

    res.json({ success: true, data: copies[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createCopy(req: Request, res: Response): Promise<void> {
  try {
    const parsed = copySchema.parse(req.body);

    // Verify accession uniqueness
    const existingAcc = await db.query('SELECT id FROM book_copies WHERE accession_number = ?', [parsed.accessionNumber]);
    if (existingAcc.length > 0) {
      res.status(400).json({ success: false, message: 'Accession number already exists.' });
      return;
    }

    // Verify barcode uniqueness if provided
    if (parsed.barcode && parsed.barcode.trim()) {
      const existingBc = await db.query('SELECT id FROM book_copies WHERE barcode = ?', [parsed.barcode.trim()]);
      if (existingBc.length > 0) {
        res.status(400).json({ success: false, message: 'Barcode already assigned to another copy.' });
        return;
      }
    }

    const result = await db.execute(
      `INSERT INTO book_copies (book_id, accession_number, barcode, shelf_id, \`condition\`, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        parsed.bookId,
        parsed.accessionNumber.trim(),
        parsed.barcode?.trim() || null,
        parsed.shelfId || null,
        parsed.condition,
        parsed.status,
      ]
    );

    await logAudit(req.user?.userId || null, 'CREATE_COPY', 'book_copies', result.insertId!, {
      accessionNumber: parsed.accessionNumber,
      bookId: parsed.bookId,
    });

    res.status(201).json({
      success: true,
      message: 'Physical book copy added successfully',
      data: { id: result.insertId, ...parsed },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: err.errors.map(e => e.message).join(', ') });
      return;
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateCopy(req: Request, res: Response): Promise<void> {
  try {
    const copyId = Number(req.params.id);
    const { accessionNumber, barcode, shelfId, condition, status } = req.body;

    if (accessionNumber) {
      const existing = await db.query(
        'SELECT id FROM book_copies WHERE accession_number = ? AND id != ?',
        [accessionNumber, copyId]
      );
      if (existing.length > 0) {
        res.status(400).json({ success: false, message: 'Accession number already taken.' });
        return;
      }
    }

    if (barcode && barcode.trim()) {
      const existing = await db.query(
        'SELECT id FROM book_copies WHERE barcode = ? AND id != ?',
        [barcode.trim(), copyId]
      );
      if (existing.length > 0) {
        res.status(400).json({ success: false, message: 'Barcode already in use.' });
        return;
      }
    }

    await db.execute(
      `UPDATE book_copies
       SET accession_number = COALESCE(?, accession_number),
           barcode = COALESCE(?, barcode),
           shelf_id = ?,
           \`condition\` = COALESCE(?, \`condition\`),
           status = COALESCE(?, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        accessionNumber || null,
        barcode?.trim() || null,
        shelfId !== undefined ? shelfId : null,
        condition || null,
        status || null,
        copyId,
      ]
    );

    await logAudit(req.user?.userId || null, 'UPDATE_COPY', 'book_copies', copyId, { shelfId, condition, status });

    res.json({ success: true, message: 'Book copy updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteCopy(req: Request, res: Response): Promise<void> {
  try {
    const copyId = Number(req.params.id);

    // Check if this copy has any loan transactions
    const loans = await db.query('SELECT id FROM loans WHERE copy_id = ? LIMIT 1', [copyId]);
    if (loans.length > 0) {
      // Must not permanently delete: archive instead
      await db.execute("UPDATE book_copies SET status = 'Archived' WHERE id = ?", [copyId]);
      res.json({
        success: true,
        message: 'Copy has historical loans and was safely marked as Archived instead of permanently deleted.',
      });
      return;
    }

    await db.execute('DELETE FROM book_copies WHERE id = ?', [copyId]);
    await logAudit(req.user?.userId || null, 'DELETE_COPY', 'book_copies', copyId);

    res.json({ success: true, message: 'Physical copy deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
