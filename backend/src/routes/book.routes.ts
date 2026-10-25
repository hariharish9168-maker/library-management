import { Router } from 'express';
import {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  archiveBook,
  getCategories,
  createCategory,
} from '../controllers/book.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Publicly readable or accessible to authenticated users
router.get('/', authenticate, getBooks);
router.get('/categories', authenticate, getCategories);
router.get('/:id', authenticate, getBookById);

// Staff only (Admin & Librarian)
router.post('/', authenticate, requireRole('admin', 'librarian'), createBook);
router.put('/:id', authenticate, requireRole('admin', 'librarian'), updateBook);
router.patch('/:id/archive', authenticate, requireRole('admin', 'librarian'), archiveBook);
router.post('/categories', authenticate, requireRole('admin'), createCategory);

export default router;
