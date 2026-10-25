import { Router } from 'express';
import {
  getCopies,
  getCopyByCode,
  createCopy,
  updateCopy,
  deleteCopy,
} from '../controllers/copy.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getCopies);
router.get('/lookup/:code', authenticate, getCopyByCode);

// Staff only
router.post('/', authenticate, requireRole('admin', 'librarian'), createCopy);
router.put('/:id', authenticate, requireRole('admin', 'librarian'), updateCopy);
router.delete('/:id', authenticate, requireRole('admin', 'librarian'), deleteCopy);

export default router;
