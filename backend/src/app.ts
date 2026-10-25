import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { errorHandler } from './middlewares/errorHandler';

import authRoutes from './routes/auth.routes';
import bookRoutes from './routes/book.routes';
import copyRoutes from './routes/copy.routes';
import locationRoutes from './routes/location.routes';
import studentRoutes from './routes/student.routes';
import loanRoutes from './routes/loan.routes';
import fineRoutes from './routes/fine.routes';
import reservationRoutes from './routes/reservation.routes';
import settingRoutes from './routes/setting.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportRoutes from './routes/report.routes';
import userRoutes from './routes/user.routes';

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Smart Library Management API',
    version: '1.0.0',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/copies', copyRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

// Centralized error handler
app.use(errorHandler);

export default app;
