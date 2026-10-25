import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('[Unhandled Error]', err);

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

export async function logAudit(
  userId: number | null,
  action: string,
  entityType: string,
  entityId: string | number | null = null,
  details: string | object | null = null,
  ipAddress: string | null = null
): Promise<void> {
  try {
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details;
    await db.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType, entityId ? String(entityId) : null, detailsStr, ipAddress]
    );
  } catch (err) {
    console.error('[AuditLog Error]', err);
  }
}
