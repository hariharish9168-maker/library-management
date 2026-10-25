import { Router } from 'express';
import {
  getStudents,
  getStudentById,
  toggleStudentStatus,
  updateStudent,
} from '../controllers/student.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, requireRole('admin', 'librarian'), getStudents);
router.get('/:id', authenticate, getStudentById);
router.patch('/:id/status', authenticate, requireRole('admin', 'librarian'), toggleStudentStatus);
router.put('/:id', authenticate, requireRole('admin', 'librarian'), updateStudent);

export default router;
