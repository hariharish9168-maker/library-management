import { Router } from 'express';
import { exportBooksCSV, exportLoansCSV, getInventoryReport } from '../controllers/report.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/books/csv', authenticate, requireRole('admin', 'librarian'), exportBooksCSV);
router.get('/loans/csv', authenticate, requireRole('admin', 'librarian'), exportLoansCSV);
router.get('/inventory', authenticate, requireRole('admin', 'librarian'), getInventoryReport);

export default router;
