import { Router } from 'express';
import { getStaff, createStaff, toggleStaffStatus, getAuditLogs } from '../controllers/user.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/staff', authenticate, requireRole('admin'), getStaff);
router.post('/staff', authenticate, requireRole('admin'), createStaff);
router.patch('/staff/:id/status', authenticate, requireRole('admin'), toggleStaffStatus);
router.get('/audit-logs', authenticate, requireRole('admin'), getAuditLogs);

export default router;
