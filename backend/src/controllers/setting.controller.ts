import { Request, Response } from 'express';
import { db } from '../database/db';
import { logAudit } from '../middlewares/errorHandler';

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const rows = await db.query('SELECT * FROM library_settings ORDER BY id ASC');
    const settingsMap: Record<string, string> = {};
    for (const r of rows) {
      settingsMap[r.setting_key] = r.setting_value;
    }
    res.json({ success: true, data: { list: rows, map: settingsMap } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const settings = req.body; // e.g. { loan_duration_days: '14', fine_rate_per_day: '2.50', ... }

    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ success: false, message: 'Settings payload must be a valid key-value object' });
      return;
    }

    await db.transaction(async (trx) => {
      for (const [key, val] of Object.entries(settings)) {
        await trx.execute(
          `INSERT INTO library_settings (setting_key, setting_value, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
          [key, String(val)]
        );
      }
    });

    await logAudit(req.user?.userId || null, 'UPDATE_LIBRARY_SETTINGS', 'library_settings', null, settings);

    res.json({ success: true, message: 'Library settings updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
