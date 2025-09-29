"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const dbPath = process.env.NODE_ENV === 'test'
    ? ':memory:' // テスト時はメモリ内データベースを使用
    : path_1.default.join(__dirname, '../database.sqlite');
class Database {
    constructor() {
        this.db = new sqlite3_1.default.Database(dbPath);
        this.initPromise = this.init();
    }
    init() {
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
                this.db.run(createUsersTableQuery, (err) => {
                    if (err) {
                        console.error('Error creating users table:', err);
                        reject(err);
                    }
                    else {
                        console.log('Users table initialized successfully');
                        this.db.run(createEntriesTableQuery, (err) => {
                            if (err) {
                                console.error('Error creating entries table:', err);
                                reject(err);
                            }
                            else {
                                console.log('Entries table initialized successfully');
                                resolve();
                            }
                        });
                    }
                });
            });
        });
    }
    async waitForInit() {
        await this.initPromise;
    }
    createOrUpdateEntry(text, userId, userName) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.waitForInit();
                // ユーザーが提供されている場合、まずユーザーを作成/更新
                if (userId && userName) {
                    await this.createUser(userId, userName);
                }
                const checkQuery = 'SELECT * FROM entries WHERE text = ?';
                this.db.get(checkQuery, [text], (err, row) => {
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
                        this.db.run(updateQuery, [userId, userName, text], (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            const selectQuery = 'SELECT * FROM entries WHERE text = ?';
                            this.db.get(selectQuery, [text], (err, updatedRow) => {
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
                    }
                    else {
                        const insertQuery = `
              INSERT INTO entries (text, count, user_id, user_name, created_at, updated_at) 
              VALUES (?, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `;
                        this.db.run(insertQuery, [text, userId, userName], (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            const selectQuery = 'SELECT * FROM entries WHERE id = last_insert_rowid()';
                            this.db.get(selectQuery, [], (err, newRow) => {
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
            }
            catch (error) {
                reject(error);
            }
        });
    }
    getAllEntries() {
        return new Promise(async (resolve, reject) => {
            await this.waitForInit();
            const query = 'SELECT * FROM entries ORDER BY updated_at DESC';
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                const entries = rows.map(row => this.mapRowToEntry(row));
                resolve(entries);
            });
        });
    }
    getRanking() {
        return new Promise(async (resolve, reject) => {
            await this.waitForInit();
            const query = 'SELECT * FROM entries ORDER BY count DESC, updated_at DESC';
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                const entries = rows.map(row => this.mapRowToEntry(row));
                resolve(entries);
            });
        });
    }
    createUser(id, name) {
        return new Promise(async (resolve, reject) => {
            await this.waitForInit();
            const insertQuery = `
        INSERT OR REPLACE INTO users (id, name, created_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `;
            this.db.run(insertQuery, [id, name], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                const selectQuery = 'SELECT * FROM users WHERE id = ?';
                this.db.get(selectQuery, [id], (err, row) => {
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
    getUser(id) {
        return new Promise(async (resolve, reject) => {
            await this.waitForInit();
            const query = 'SELECT * FROM users WHERE id = ?';
            this.db.get(query, [id], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (row) {
                    resolve(this.mapRowToUser(row));
                }
                else {
                    resolve(null);
                }
            });
        });
    }
    mapRowToEntry(row) {
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
    mapRowToUser(row) {
        if (!row) {
            throw new Error('Row is undefined or null');
        }
        return {
            id: row.id,
            name: row.name,
            createdAt: row.created_at
        };
    }
    close() {
        this.db.close();
    }
}
exports.Database = Database;
