import { Router } from 'express';
import {
  issueBook,
  searchActiveLoan,
  returnBook,
  getActiveLoans,
  getBorrowingHistory,
  getOverdueLoans,
} from '../controllers/loan.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Staff issue & return operations
router.post('/issue', authenticate, requireRole('admin', 'librarian'), issueBook);
router.get('/return-search', authenticate, requireRole('admin', 'librarian'), searchActiveLoan);
router.post('/return', authenticate, requireRole('admin', 'librarian'), returnBook);

// Loan lists
router.get('/active', authenticate, getActiveLoans);
router.get('/history', authenticate, getBorrowingHistory);
router.get('/overdue', authenticate, getOverdueLoans);

export default router;
