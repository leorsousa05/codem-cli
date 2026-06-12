import sqlite3 from 'sqlite3';
import { AgentSession, AgentStatus, IDatabaseStore } from '../common/types.js';
import path from 'path';
import fs from 'fs';

export class DatabaseStore implements IDatabaseStore {
  private db!: sqlite3.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    if (dbPath) {
      this.dbPath = dbPath;
    } else {
      const home = process.env.HOME || process.env.USERPROFILE || '.';
      const dir = path.join(home, '.codem');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.dbPath = path.join(dir, 'codem.db');
    }
  }

  public initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) return reject(err);
        
        this.db.serialize(() => {
          this.db.all(`PRAGMA table_info(sessions)`, (err2, rows: any[]) => {
            if (err2) return reject(err2);
            
            const createLogs = () => {
              this.db.run(`
                CREATE TABLE IF NOT EXISTS logs (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  agentId TEXT NOT NULL,
                  text TEXT NOT NULL,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY(agentId) REFERENCES sessions(id) ON DELETE CASCADE
                )
              `, (err3) => {
                if (err3) return reject(err3);
                resolve();
              });
            };

            const buildFreshSchema = () => {
              this.db.run(`DROP TABLE IF EXISTS logs`, (errLogs) => {
                if (errLogs) return reject(errLogs);
                this.db.run(`DROP TABLE IF EXISTS sessions`, (errSess) => {
                  if (errSess) return reject(errSess);
                  this.db.run(`
                    CREATE TABLE sessions (
                      id TEXT PRIMARY KEY,
                      parentId TEXT,
                      name TEXT NOT NULL,
                      status TEXT NOT NULL,
                      isSubtask INTEGER NOT NULL
                    )
                  `, (errNewSess) => {
                    if (errNewSess) return reject(errNewSess);
                    createLogs();
                  });
                });
              });
            };

            if (rows && rows.length > 0) {
              const hasStatus = rows.some(row => row.name === 'status');
              const hasParentId = rows.some(row => row.name === 'parentId');
              
              if (!hasStatus || !hasParentId) {
                buildFreshSchema();
              } else {
                createLogs();
              }
            } else {
              // Não existe sessions, cria do zero
              this.db.run(`
                CREATE TABLE sessions (
                  id TEXT PRIMARY KEY,
                  parentId TEXT,
                  name TEXT NOT NULL,
                  status TEXT NOT NULL,
                  isSubtask INTEGER NOT NULL
                )
              `, (errNewSess) => {
                if (errNewSess) return reject(errNewSess);
                createLogs();
              });
            }
          });
        });
      });
    });
  }

  public createSession(session: Omit<AgentSession, 'logs'>): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO sessions (id, parentId, name, status, isSubtask)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status
      `;
      this.db.run(
        query,
        [session.id, session.parentId || null, session.name, session.status, session.isSubtask ? 1 : 0],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  public updateSessionStatus(id: string, status: AgentStatus): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE sessions SET status = ? WHERE id = ?',
        [status, id],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  public appendLog(agentId: string, text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO logs (agentId, text) VALUES (?, ?)',
        [agentId, text],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  public getSessionLogs(agentId: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT text FROM logs WHERE agentId = ? ORDER BY id ASC',
        [agentId],
        (err, rows: any[]) => {
          if (err) return reject(err);
          resolve(rows.map(r => r.text));
        }
      );
    });
  }

  public getAllSessions(): Promise<AgentSession[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM sessions', [], async (err, sRows: any[]) => {
        if (err) return reject(err);
        
        try {
          const sessions: AgentSession[] = [];
          for (const row of sRows) {
            const logs = await this.getSessionLogs(row.id);
            sessions.push({
              id: row.id,
              parentId: row.parentId || undefined,
              name: row.name,
              status: row.status as AgentStatus,
              isSubtask: row.isSubtask === 1,
              logs
            });
          }
          resolve(sessions);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  public deleteSession(agentId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM sessions WHERE id = ?', [agentId], (err) => {
        if (err) return reject(err);
        resolve();
      });
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
