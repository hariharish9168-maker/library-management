import { Request, Response } from 'express';
import { db } from '../database/db';
import { logAudit } from '../middlewares/errorHandler';

// Get full location hierarchy tree
export async function getHierarchy(req: Request, res: Response): Promise<void> {
  try {
    const floors = await db.query('SELECT * FROM floors ORDER BY floor_number ASC');
    const sections = await db.query('SELECT * FROM sections ORDER BY code ASC');
    const racks = await db.query('SELECT * FROM racks ORDER BY rack_number ASC');
    const shelves = await db.query(
      `SELECT s.*, COUNT(bc.id) as current_book_count
       FROM shelves s
       LEFT JOIN book_copies bc ON s.id = bc.shelf_id AND bc.status != 'Archived'
       GROUP BY s.id
       ORDER BY s.shelf_number ASC`
    );

    // Assemble nested structure
    const tree = floors.map((f: any) => {
      const fSections = sections
        .filter((sec: any) => sec.floor_id === f.id)
        .map((sec: any) => {
          const secRacks = racks
            .filter((rk: any) => rk.section_id === sec.id)
            .map((rk: any) => {
              const rkShelves = shelves.filter((sh: any) => sh.rack_id === rk.id);
              return { ...rk, shelves: rkShelves };
            });
          return { ...sec, racks: secRacks };
        });
      return { ...f, sections: fSections };
    });

    res.json({ success: true, data: tree });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Dedicated Find a Book Location Endpoint
export async function findBookLocation(req: Request, res: Response): Promise<void> {
  try {
    const q = req.query.q as string | undefined;

    if (!q || !q.trim()) {
      res.json({ success: true, data: [] });
      return;
    }

    const term = `%${q.trim()}%`;
    const results = await db.query(
      `SELECT bc.id as copy_id, bc.accession_number, bc.barcode, bc.condition, bc.status as copy_status,
              b.id as book_id, b.title as book_title, b.author as book_author, b.isbn as book_isbn,
              b.cover_image_url, c.name as category_name,
              sh.id as shelf_id, sh.shelf_number, sh.description as shelf_desc,
              rk.id as rack_id, rk.rack_number, rk.description as rack_desc,
              sec.id as section_id, sec.code as section_code, sec.name as section_name,
              fl.id as floor_id, fl.floor_number, fl.name as floor_name
       FROM book_copies bc
       JOIN books b ON bc.book_id = b.id
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN shelves sh ON bc.shelf_id = sh.id
       LEFT JOIN racks rk ON sh.rack_id = rk.id
       LEFT JOIN sections sec ON rk.section_id = sec.id
       LEFT JOIN floors fl ON sec.floor_id = fl.id
       WHERE b.is_archived = 0
         AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR bc.accession_number LIKE ? OR bc.barcode LIKE ?)
       ORDER BY b.title ASC, bc.accession_number ASC`,
      [term, term, term, term, term]
    );

    // Enrich with human-friendly full location path
    const formatted = results.map((item: any) => {
      const hasLocation = !!item.shelf_id;
      const fullLocationPath = hasLocation
        ? `${item.floor_name || `Floor ${item.floor_number}`} → ${item.section_name} (${item.section_code}) → Rack ${item.rack_number} → Shelf ${item.shelf_number}`
        : 'Unassigned (Storage / Processing Desk)';

      return {
        ...item,
        hasLocation,
        fullLocationPath,
      };
    });

    res.json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get books in a specific shelf
export async function getBooksInShelf(req: Request, res: Response): Promise<void> {
  try {
    const shelfId = Number(req.params.shelfId);

    const shelf = await db.query(
      `SELECT s.*, r.rack_number, sec.name as section_name, sec.code as section_code, fl.name as floor_name, fl.floor_number
       FROM shelves s
       JOIN racks r ON s.rack_id = r.id
       JOIN sections sec ON r.section_id = sec.id
       JOIN floors fl ON sec.floor_id = fl.id
       WHERE s.id = ?`,
      [shelfId]
    );

    if (shelf.length === 0) {
      res.status(404).json({ success: false, message: 'Shelf not found' });
      return;
    }

    const copies = await db.query(
      `SELECT bc.id as copy_id, bc.accession_number, bc.barcode, bc.condition, bc.status,
              b.id as book_id, b.title as book_title, b.author as book_author, b.isbn, b.cover_image_url
       FROM book_copies bc
       JOIN books b ON bc.book_id = b.id
       WHERE bc.shelf_id = ? AND bc.status != 'Archived'
       ORDER BY bc.accession_number ASC`,
      [shelfId]
    );

    res.json({
      success: true,
      shelf: shelf[0],
      totalCopies: copies.length,
      capacity: shelf[0].capacity,
      availableSpots: Math.max(0, shelf[0].capacity - copies.length),
      copies,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Floor CRUD
export async function createFloor(req: Request, res: Response): Promise<void> {
  try {
    const { floorNumber, name, description } = req.body;
    if (!floorNumber || !name) {
      res.status(400).json({ success: false, message: 'Floor number and name are required' });
      return;
    }
    const existing = await db.query('SELECT id FROM floors WHERE floor_number = ?', [Number(floorNumber)]);
    if (existing.length > 0) {
      res.status(400).json({ success: false, message: `Floor number ${floorNumber} already exists.` });
      return;
    }
    const result = await db.execute(
      'INSERT INTO floors (floor_number, name, description) VALUES (?, ?, ?)',
      [Number(floorNumber), name.trim(), description?.trim() || null]
    );
    res.status(201).json({ success: true, message: 'Floor created successfully', data: { id: result.insertId, floorNumber: Number(floorNumber), name, description } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Section CRUD
export async function createSection(req: Request, res: Response): Promise<void> {
  try {
    const { floorId, code, name, description } = req.body;
    if (!floorId || !code || !name) {
      res.status(400).json({ success: false, message: 'Floor ID, section code, and name are required' });
      return;
    }
    const existing = await db.query('SELECT id FROM sections WHERE floor_id = ? AND code = ?', [Number(floorId), code.trim().toUpperCase()]);
    if (existing.length > 0) {
      res.status(400).json({ success: false, message: `Section code '${code.toUpperCase()}' already exists on this floor.` });
      return;
    }
    const result = await db.execute(
      'INSERT INTO sections (floor_id, code, name, description) VALUES (?, ?, ?, ?)',
      [Number(floorId), code.trim().toUpperCase(), name.trim(), description?.trim() || null]
    );
    res.status(201).json({ success: true, message: 'Section created successfully', data: { id: result.insertId, floorId: Number(floorId), code: code.toUpperCase(), name, description } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Rack CRUD
export async function createRack(req: Request, res: Response): Promise<void> {
  try {
    const { sectionId, rackNumber, description } = req.body;
    if (!sectionId || !rackNumber) {
      res.status(400).json({ success: false, message: 'Section ID and rack number are required' });
      return;
    }
    const existing = await db.query('SELECT id FROM racks WHERE section_id = ? AND rack_number = ?', [Number(sectionId), rackNumber.trim().toUpperCase()]);
    if (existing.length > 0) {
      res.status(400).json({ success: false, message: `Rack '${rackNumber.toUpperCase()}' already exists in this section.` });
      return;
    }
    const result = await db.execute(
      'INSERT INTO racks (section_id, rack_number, description) VALUES (?, ?, ?)',
      [Number(sectionId), rackNumber.trim().toUpperCase(), description?.trim() || null]
    );
    res.status(201).json({ success: true, message: 'Rack created successfully', data: { id: result.insertId, sectionId: Number(sectionId), rackNumber: rackNumber.toUpperCase(), description } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Shelf CRUD
export async function createShelf(req: Request, res: Response): Promise<void> {
  try {
    const { rackId, shelfNumber, capacity = 30, description } = req.body;
    if (!rackId || !shelfNumber) {
      res.status(400).json({ success: false, message: 'Rack ID and shelf number are required' });
      return;
    }
    const existing = await db.query('SELECT id FROM shelves WHERE rack_id = ? AND shelf_number = ?', [Number(rackId), shelfNumber.trim().toUpperCase()]);
    if (existing.length > 0) {
      res.status(400).json({ success: false, message: `Shelf '${shelfNumber.toUpperCase()}' already exists on this rack.` });
      return;
    }
    const result = await db.execute(
      'INSERT INTO shelves (rack_id, shelf_number, capacity, description) VALUES (?, ?, ?, ?)',
      [Number(rackId), shelfNumber.trim().toUpperCase(), Number(capacity) || 30, description?.trim() || null]
    );
    res.status(201).json({ success: true, message: 'Shelf created successfully', data: { id: result.insertId, rackId: Number(rackId), shelfNumber: shelfNumber.toUpperCase(), capacity, description } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Transfer book copies to a new shelf
export async function transferCopyLocation(req: Request, res: Response): Promise<void> {
  try {
    const { copyId, targetShelfId } = req.body;

    if (!copyId) {
      res.status(400).json({ success: false, message: 'copyId is required' });
      return;
    }

    if (targetShelfId) {
      const shelf = await db.query('SELECT id FROM shelves WHERE id = ?', [targetShelfId]);
      if (shelf.length === 0) {
        res.status(404).json({ success: false, message: 'Target shelf does not exist' });
        return;
      }
    }

    await db.execute('UPDATE book_copies SET shelf_id = ? WHERE id = ?', [targetShelfId || null, copyId]);
    await logAudit(req.user?.userId || null, 'TRANSFER_COPY_LOCATION', 'book_copies', copyId, { targetShelfId });

    res.json({ success: true, message: 'Book location transferred successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
