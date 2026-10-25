import { Router } from 'express';
import {
  getHierarchy,
  findBookLocation,
  getBooksInShelf,
  createFloor,
  createSection,
  createRack,
  createShelf,
  transferCopyLocation,
} from '../controllers/location.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Location hierarchy and search available to all logged in users (students & staff)
router.get('/hierarchy', authenticate, getHierarchy);
router.get('/find', authenticate, findBookLocation);
router.get('/shelf/:shelfId/books', authenticate, getBooksInShelf);

// Location management (Staff only)
router.post('/floors', authenticate, requireRole('admin', 'librarian'), createFloor);
router.post('/sections', authenticate, requireRole('admin', 'librarian'), createSection);
router.post('/racks', authenticate, requireRole('admin', 'librarian'), createRack);
router.post('/shelves', authenticate, requireRole('admin', 'librarian'), createShelf);
router.post('/transfer', authenticate, requireRole('admin', 'librarian'), transferCopyLocation);

export default router;
