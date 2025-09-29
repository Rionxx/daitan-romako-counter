import sqlite3 from 'sqlite3';
import path from 'path';
import { Entry, User } from './types';

const dbPath = process.env.NODE_ENV === 'test' 
  ? ':memory:' // テスト時はメモリ内データベースを使用
  : path.join(__dirname, '../database.sqlite');

export class Database {
  private db: sqlite3.Database;
  private initPromise: Promise<void>;

  constructor() {
    this.db = new sqlite3.Database(dbPath);
    this.initPromise = this.init();
  }

  private init(): Promise<void> {
    return new Promise((resolve, reject) => {
    // Enable foreign key constraints
    this.db.run('PRAGMA foreign_keys = ON');

    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createEntriesTableQuery = `
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL UNIQUE,
        count INTEGER DEFAULT 1,
        user_id TEXT,
        user_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `;

      // Create tables sequentially to ensure proper order
      this.db.serialize(() => {
        this.db.run(createUsersTableQuery, (err: any) => {
          if (err) {
            console.error('Error creating users table:', err);
            reject(err);
          } else {
            console.log('Users table initialized successfully');
            
            this.db.run(createEntriesTableQuery, (err: any) => {
              if (err) {
                console.error('Error creating entries table:', err);
                reject(err);
              } else {
                console.log('Entries table initialized successfully');
                resolve();
              }
            });
          }
        });
      });
    });
  }

  async waitForInit(): Promise<void> {
    await this.initPromise;
  }

  createOrUpdateEntry(text: string, userId?: string, userName?: string): Promise<Entry> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.waitForInit();
        
        // ユーザーが提供されている場合、まずユーザーを作成/更新
        if (userId && userName) {
          await this.createUser(userId, userName);
        }

        const checkQuery = 'SELECT * FROM entries WHERE text = ?';
        
        this.db.get(checkQuery, [text], (err: any, row: any) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            const updateQuery = `
              UPDATE entries 
              SET count = count + 1, updated_at = CURRENT_TIMESTAMP, user_id = ?, user_name = ?
              WHERE text = ?
            `;
            
            this.db.run(updateQuery, [userId, userName, text], (err: any) => {
              if (err) {
                reject(err);
                return;
              }

              const selectQuery = 'SELECT * FROM entries WHERE text = ?';
              this.db.get(selectQuery, [text], (err: any, updatedRow: any) => {
                if (err) {
                  reject(err);
                  return;
                }
                if (!updatedRow) {
                  reject(new Error('Failed to retrieve updated row'));
                  return;
                }
                resolve(this.mapRowToEntry(updatedRow));
              });
            });
          } else {
            const insertQuery = `
              INSERT INTO entries (text, count, user_id, user_name, created_at, updated_at) 
              VALUES (?, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `;
            
            this.db.run(insertQuery, [text, userId, userName], (err: any) => {
              if (err) {
                reject(err);
                return;
              }

              const selectQuery = 'SELECT * FROM entries WHERE id = last_insert_rowid()';
              this.db.get(selectQuery, [], (err: any, newRow: any) => {
                if (err) {
                  reject(err);
                  return;
                }
                if (!newRow) {
                  reject(new Error('Failed to retrieve inserted row'));
                  return;
                }
                resolve(this.mapRowToEntry(newRow));
              });
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  getAllEntries(): Promise<Entry[]> {
    return new Promise(async (resolve, reject) => {
      await this.waitForInit();
      const query = 'SELECT * FROM entries ORDER BY updated_at DESC';
      
      this.db.all(query, [], (err: any, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        const entries = rows.map(row => this.mapRowToEntry(row));
        resolve(entries);
      });
    });
  }

  getRanking(): Promise<Entry[]> {
    return new Promise(async (resolve, reject) => {
      await this.waitForInit();
      const query = 'SELECT * FROM entries ORDER BY count DESC, updated_at DESC';
      
      this.db.all(query, [], (err: any, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        const entries = rows.map(row => this.mapRowToEntry(row));
        resolve(entries);
      });
    });
  }

  createUser(id: string, name: string): Promise<User> {
    return new Promise(async (resolve, reject) => {
      await this.waitForInit();
      const insertQuery = `
        INSERT OR REPLACE INTO users (id, name, created_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `;
      
      this.db.run(insertQuery, [id, name], (err: any) => {
        if (err) {
          reject(err);
          return;
        }

        const selectQuery = 'SELECT * FROM users WHERE id = ?';
        this.db.get(selectQuery, [id], (err: any, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          if (!row) {
            reject(new Error('Failed to retrieve user'));
            return;
          }
          resolve(this.mapRowToUser(row));
        });
      });
    });
  }

  getUser(id: string): Promise<User | null> {
    return new Promise(async (resolve, reject) => {
      await this.waitForInit();
      const query = 'SELECT * FROM users WHERE id = ?';
      
      this.db.get(query, [id], (err: any, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row) {
          resolve(this.mapRowToUser(row));
        } else {
          resolve(null);
        }
      });
    });
  }

  private mapRowToEntry(row: any): Entry {
    if (!row) {
      throw new Error('Row is undefined or null');
    }
    return {
      id: row.id,
      text: row.text,
      count: row.count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userId: row.user_id,
      userName: row.user_name
    };
  }

  private mapRowToUser(row: any): User {
    if (!row) {
      throw new Error('Row is undefined or null');
    }
    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at
    };
  }

  close(): void {
    this.db.close();
  }
}