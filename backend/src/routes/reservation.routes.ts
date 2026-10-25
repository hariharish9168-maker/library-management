import { Router } from 'express';
import { createReservation, getReservations, cancelReservation } from '../controllers/reservation.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authenticate, createReservation);
router.get('/', authenticate, getReservations);
router.patch('/:id/cancel', authenticate, cancelReservation);

export default router;
