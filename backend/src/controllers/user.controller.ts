import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../database/db';
import { logAudit } from '../middlewares/errorHandler';

const staffSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  roleId: z.number().int().refine((val) => val === 1 || val === 2, {
    message: 'Role must be Admin (1) or Librarian (2)',
  }),
  phone: z.string().optional(),
});

export async function getStaff(req: Request, res: Response): Promise<void> {
  try {
    const staff = await db.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.role_id, u.is_active, u.created_at,
              r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.role_id IN (1, 2)
       ORDER BY u.id ASC`
    );
    res.json({ success: true, data: staff });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createStaff(req: Request, res: Response): Promise<void> {
  try {
    const parsed = staffSchema.parse(req.body);

    const existing = await db.query(
      'SELECT id, email, username FROM users WHERE email = ? OR username = ?',
      [parsed.email, parsed.username]
    );

    if (existing.length > 0) {
      res.status(400).json({ success: false, message: 'Username or email already in use.' });
      return;
    }

    const passwordHash = bcrypt.hashSync(parsed.password, 10);

    const result = await db.execute(
      `INSERT INTO users (username, email, password_hash, role_id, full_name, phone, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [parsed.username, parsed.email, passwordHash, parsed.roleId, parsed.fullName, parsed.phone || null]
    );

    await logAudit(req.user?.userId || null, 'CREATE_STAFF', 'users', result.insertId!, {
      username: parsed.username,
      roleId: parsed.roleId,
    });

    res.status(201).json({
      success: true,
      message: 'Staff account created successfully',
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

export async function toggleStaffStatus(req: Request, res: Response): Promise<void> {
  try {
    const staffId = Number(req.params.id);
    const { isActive } = req.body;

    if (staffId === req.user?.userId) {
      res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
      return;
    }

    await db.execute('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      isActive ? 1 : 0,
      staffId,
    ]);

    await logAudit(req.user?.userId || null, 'TOGGLE_STAFF_STATUS', 'users', staffId, { isActive });

    res.json({ success: true, message: `Staff account ${isActive ? 'activated' : 'deactivated'} successfully.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '30', 10)));
    const offset = (page - 1) * limit;

    const logs = await db.query(
      `SELECT a.*, u.username, u.full_name, r.name as role_name
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const countRows = await db.query('SELECT COUNT(*) as count FROM audit_logs');
    const total = Number(countRows[0]?.count || 0);

    res.json({
      success: true,
      data: logs,
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
