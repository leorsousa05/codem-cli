import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { AgentMessage } from '../common/types.js';

export class StorageService {
  private db!: sqlite3.Database;
  private dbPath: string;

  constructor() {
    const baseDir = path.join(os.homedir(), '.codem');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    this.dbPath = path.join(baseDir, 'codem.db');
  }

  public initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) return reject(err);
        
        this.db.serialize(() => {
          this.db.run(`
            CREATE TABLE IF NOT EXISTS sessions (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              createdAt INTEGER NOT NULL,
              updatedAt INTEGER NOT NULL
            )
          `);

          this.db.run(`
            CREATE TABLE IF NOT EXISTS messages (
              id TEXT PRIMARY KEY,
              sessionId TEXT NOT NULL,
              agentId TEXT NOT NULL,
              role TEXT NOT NULL,
              content TEXT NOT NULL,
              timestamp INTEGER NOT NULL,
              FOREIGN KEY(sessionId) REFERENCES sessions(id)
            )
          `);

          this.db.run(`
            CREATE TABLE IF NOT EXISTS configs (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            )
          `, (err2) => {
            if (err2) return reject(err2);
            resolve();
          });
        });
      });
    });
  }

  public saveMessage(sessionId: string, agentId: string, msg: AgentMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO messages (id, sessionId, agentId, role, content, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
        [msg.id, sessionId, agentId, msg.role, msg.content, msg.timestamp],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  public getHistory(sessionId: string): Promise<AgentMessage[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT id, role, content, timestamp FROM messages WHERE sessionId = ? ORDER BY timestamp ASC`,
        [sessionId],
        (err, rows: any[]) => {
          if (err) return reject(err);
          resolve(rows.map(row => ({
            id: row.id,
            role: row.role as any,
            content: row.content,
            timestamp: row.timestamp
          })));
        }
      );
    });
  }

  public saveConfig(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO configs (key, value) VALUES (?, ?)`,
        [key, value],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  public getConfig(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT value FROM configs WHERE key = ?`,
        [key],
        (err, row: any) => {
          if (err) return reject(err);
          resolve(row ? row.value : null);
        }
      );
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}
