import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/setting.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getSettings);
router.put('/', authenticate, requireRole('admin'), updateSettings);

export default router;
