import { Router } from 'express';
import { getFines, recordPayment, waiveFine, getFineSummary } from '../controllers/fine.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getFines);
router.get('/summary', authenticate, requireRole('admin', 'librarian'), getFineSummary);
router.post('/pay', authenticate, requireRole('admin', 'librarian'), recordPayment);
router.post('/waive', authenticate, requireRole('admin', 'librarian'), waiveFine);

export default router;
