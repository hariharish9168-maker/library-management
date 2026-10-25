import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback to current dir

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'smart-library-super-secret-jwt-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  dbType: (process.env.DB_TYPE || 'auto') as 'mysql' | 'sqlite' | 'auto',
  mysql: {
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'smart_library',
    connectionLimit: 10,
  },
  sqlite: {
    filePath: process.env.SQLITE_PATH || path.resolve(__dirname, '../../../database/smart_library.sqlite'),
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
