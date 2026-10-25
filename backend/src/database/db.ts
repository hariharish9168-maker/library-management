import mysql from 'mysql2/promise';
// Import DatabaseSync from node:sqlite
let DatabaseSync: any;
try {
  DatabaseSync = require('node:sqlite').DatabaseSync;
} catch (e) {
  // handled gracefully
}
import fs from 'fs';
import path from 'path';
import { config } from '../config';

export interface ExecResult {
  insertId?: number;
  affectedRows: number;
}

export interface IDatabaseClient {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<ExecResult>;
}

class DatabaseManager {
  private mysqlPool: mysql.Pool | null = null;
  private sqliteDb: any | null = null;
  public activeDriver: 'mysql' | 'sqlite' = 'sqlite';

  async initialize(): Promise<void> {
    if (config.dbType === 'mysql' || config.dbType === 'auto') {
      try {
        console.log(`[Database] Attempting connection to MySQL at ${config.mysql.host}:${config.mysql.port}...`);
        
        // Try connecting to MySQL server directly first to ensure database exists
        const rootConnection = await mysql.createConnection({
          host: config.mysql.host,
          port: config.mysql.port,
          user: config.mysql.user,
          password: config.mysql.password,
          connectTimeout: 2000,
        });

        await rootConnection.query(
          `CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
        );
        await rootConnection.end();

        this.mysqlPool = mysql.createPool({
          host: config.mysql.host,
          port: config.mysql.port,
          user: config.mysql.user,
          password: config.mysql.password,
          database: config.mysql.database,
          waitForConnections: true,
          connectionLimit: config.mysql.connectionLimit,
          queueLimit: 0,
          dateStrings: true,
        });

        // Test pool
        const testConn = await this.mysqlPool.getConnection();
        testConn.release();

        this.activeDriver = 'mysql';
        console.log(`[Database] Successfully connected to MySQL database: ${config.mysql.database}`);
        return;
      } catch (err: any) {
        console.warn(`[Database] MySQL connection failed (${err.code || err.message}).`);
        if (config.dbType === 'mysql') {
          throw new Error(`MySQL was explicitly requested but failed to connect: ${err.message}`);
        }
        console.log(`[Database] Falling back to high-performance local SQLite database...`);
      }
    }

    // Initialize SQLite
    const dbDir = path.dirname(config.sqlite.filePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.sqliteDb = new DatabaseSync(config.sqlite.filePath);
    this.sqliteDb.exec('PRAGMA foreign_keys = ON;');
    this.sqliteDb.exec('PRAGMA journal_mode = WAL;');
    this.activeDriver = 'sqlite';
    console.log(`[Database] Connected to persistent SQLite database at: ${config.sqlite.filePath}`);
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.mysqlPool && !this.sqliteDb) {
      await this.initialize();
    }

    if (this.activeDriver === 'mysql' && this.mysqlPool) {
      const [rows] = await this.mysqlPool.query(sql, params);
      return rows as T[];
    }

    if (this.sqliteDb) {
      // In SQLite, convert boolean to 1/0 or undefined to null
      const sanitizedParams = params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p === undefined ? null : p));
      const stmt = this.sqliteDb.prepare(sql);
      const rows = stmt.all(...sanitizedParams);
      return rows as T[];
    }

    throw new Error('Database not initialized');
  }

  async execute(sql: string, params: any[] = []): Promise<ExecResult> {
    if (!this.mysqlPool && !this.sqliteDb) {
      await this.initialize();
    }

    if (this.activeDriver === 'mysql' && this.mysqlPool) {
      const [result] = await this.mysqlPool.execute(sql, params) as [mysql.ResultSetHeader, any];
      return {
        insertId: result.insertId,
        affectedRows: result.affectedRows,
      };
    }

    if (this.sqliteDb) {
      const sanitizedParams = params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p === undefined ? null : p));
      const stmt = this.sqliteDb.prepare(sql);
      const result = stmt.run(...sanitizedParams);
      return {
        insertId: Number(result.lastInsertRowid),
        affectedRows: Number(result.changes),
      };
    }

    throw new Error('Database not initialized');
  }

  async execRaw(sql: string): Promise<void> {
    if (!this.mysqlPool && !this.sqliteDb) {
      await this.initialize();
    }

    if (this.activeDriver === 'mysql' && this.mysqlPool) {
      const conn = await this.mysqlPool.getConnection();
      try {
        await conn.query(sql);
      } finally {
        conn.release();
      }
    } else if (this.sqliteDb) {
      this.sqliteDb.exec(sql);
    }
  }

  async transaction<T>(callback: (trx: IDatabaseClient) => Promise<T>): Promise<T> {
    if (!this.mysqlPool && !this.sqliteDb) {
      await this.initialize();
    }

    if (this.activeDriver === 'mysql' && this.mysqlPool) {
      const conn = await this.mysqlPool.getConnection();
      await conn.beginTransaction();
      try {
        const client: IDatabaseClient = {
          query: async <R = any>(sql: string, params: any[] = []): Promise<R[]> => {
            const [rows] = await conn.query(sql, params);
            return rows as R[];
          },
          execute: async (sql: string, params: any[] = []): Promise<ExecResult> => {
            const [result] = await conn.execute(sql, params) as [mysql.ResultSetHeader, any];
            return {
              insertId: result.insertId,
              affectedRows: result.affectedRows,
            };
          },
        };

        const res = await callback(client);
        await conn.commit();
        return res;
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }

    if (this.sqliteDb) {
      this.sqliteDb.exec('BEGIN TRANSACTION;');
      try {
        const client: IDatabaseClient = {
          query: async <R = any>(sql: string, params: any[] = []): Promise<R[]> => {
            return this.query<R>(sql, params);
          },
          execute: async (sql: string, params: any[] = []): Promise<ExecResult> => {
            return this.execute(sql, params);
          },
        };
        const res = await callback(client);
        this.sqliteDb.exec('COMMIT;');
        return res;
      } catch (err) {
        this.sqliteDb.exec('ROLLBACK;');
        throw err;
      }
    }

    throw new Error('Database not initialized');
  }
}

export const db = new DatabaseManager();
