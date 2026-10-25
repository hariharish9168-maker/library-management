import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../database/db';
import { generateToken } from '../utils/jwt';
import { logAudit } from '../middlewares/errorHandler';

const studentRegisterSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  studentRegNo: z.string().min(2),
  department: z.string().min(2),
  academicYear: z.string().min(1),
});

const loginSchema = z.object({
  identifier: z.string().min(1), // email or username
  password: z.string().min(1),
});

export async function registerStudent(req: Request, res: Response): Promise<void> {
  try {
    const parsed = studentRegisterSchema.parse(req.body);

    // Check unique email and username
    const existingUser = await db.query(
      'SELECT id, email, username FROM users WHERE email = ? OR username = ?',
      [parsed.email, parsed.username]
    );

    if (existingUser.length > 0) {
      const match = existingUser[0];
      if (match.email.toLowerCase() === parsed.email.toLowerCase()) {
        res.status(400).json({ success: false, message: 'Email address is already registered.' });
        return;
      }
      res.status(400).json({ success: false, message: 'Username is already taken.' });
      return;
    }

    // Check unique student registration number
    const existingStudent = await db.query(
      'SELECT id FROM students WHERE student_reg_no = ?',
      [parsed.studentRegNo]
    );

    if (existingStudent.length > 0) {
      res.status(400).json({ success: false, message: 'Student Registration Number already exists.' });
      return;
    }

    const passwordHash = bcrypt.hashSync(parsed.password, 10);

    const result = await db.transaction(async (trx) => {
      // 1. Insert user with role 'student' (id 3)
      const userRes = await trx.execute(
        `INSERT INTO users (username, email, password_hash, role_id, full_name, phone, is_active)
         VALUES (?, ?, ?, 3, ?, ?, 1)`,
        [parsed.username, parsed.email, passwordHash, parsed.fullName, parsed.phone || null]
      );

      const userId = userRes.insertId!;

      // 2. Insert student profile
      const stuRes = await trx.execute(
        `INSERT INTO students (user_id, student_reg_no, department, academic_year, max_books_allowed, is_active)
         VALUES (?, ?, ?, ?, 3, 1)`,
        [userId, parsed.studentRegNo, parsed.department, parsed.academicYear]
      );

      return { userId, studentId: stuRes.insertId! };
    });

    await logAudit(result.userId, 'STUDENT_REGISTER', 'users', result.userId, { email: parsed.email });

    const token = generateToken({
      userId: result.userId,
      username: parsed.username,
      email: parsed.email,
      role: 'student',
      studentId: result.studentId,
      fullName: parsed.fullName,
    });

    res.status(201).json({
      success: true,
      message: 'Student account registered successfully.',
      token,
      user: {
        id: result.userId,
        studentId: result.studentId,
        username: parsed.username,
        email: parsed.email,
        fullName: parsed.fullName,
        role: 'student',
        studentRegNo: parsed.studentRegNo,
        department: parsed.department,
        academicYear: parsed.academicYear,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: err.errors.map(e => e.message).join(', ') });
      return;
    }
    res.status(500).json({ success: false, message: err.message || 'Registration failed' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { identifier, password } = loginSchema.parse(req.body);

    const users = await db.query(
      `SELECT u.id, u.username, u.email, u.password_hash, u.full_name, u.phone, u.is_active,
              r.name as role_name,
              s.id as student_id, s.student_reg_no, s.department, s.academic_year, s.max_books_allowed
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN students s ON u.id = s.user_id
       WHERE u.email = ? OR u.username = ?`,
      [identifier, identifier]
    );

    if (users.length === 0) {
      res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
      return;
    }

    const user = users[0];

    if (!user.is_active) {
      res.status(403).json({ success: false, message: 'Your account is deactivated. Please contact the administrator.' });
      return;
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
      return;
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role_name as 'admin' | 'librarian' | 'student',
      studentId: user.student_id || undefined,
      fullName: user.full_name,
    });

    await logAudit(user.id, 'LOGIN', 'users', user.id, { role: user.role_name }, req.ip);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role_name,
        phone: user.phone,
        studentId: user.student_id,
        studentRegNo: user.student_reg_no,
        department: user.department,
        academicYear: user.academic_year,
        maxBooksAllowed: user.max_books_allowed,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: err.errors.map(e => e.message).join(', ') });
      return;
    }
    res.status(500).json({ success: false, message: err.message || 'Login failed' });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const users = await db.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.is_active,
              r.name as role_name,
              s.id as student_id, s.student_reg_no, s.department, s.academic_year, s.max_books_allowed
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN students s ON u.id = s.user_id
       WHERE u.id = ?`,
      [req.user.userId]
    );

    if (users.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const user = users[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role_name,
        phone: user.phone,
        studentId: user.student_id,
        studentRegNo: user.student_reg_no,
        department: user.department,
        academicYear: user.academic_year,
        maxBooksAllowed: user.max_books_allowed,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const { fullName, phone, department, academicYear } = req.body;

    await db.execute(
      'UPDATE users SET full_name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [fullName, phone || null, req.user.userId]
    );

    if (req.user.role === 'student' && (department || academicYear)) {
      await db.execute(
        'UPDATE students SET department = COALESCE(?, department), academic_year = COALESCE(?, academic_year), updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [department, academicYear, req.user.userId]
      );
    }

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
