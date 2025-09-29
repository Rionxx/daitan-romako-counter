"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const dbPath = path_1.default.join(__dirname, '../database.sqlite');
class Database {
    constructor() {
        this.db = new sqlite3_1.default.Database(dbPath);
        this.init();
    }
    init() {
        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL UNIQUE,
        count INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
        this.db.run(createTableQuery, (err) => {
            if (err) {
                console.error('Error creating table:', err);
            }
            else {
                console.log('Database initialized successfully');
            }
        });
    }
    createOrUpdateEntry(text) {
        return new Promise((resolve, reject) => {
            const checkQuery = 'SELECT * FROM entries WHERE text = ?';
            this.db.get(checkQuery, [text], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (row) {
                    const updateQuery = `
            UPDATE entries 
            SET count = count + 1, updated_at = CURRENT_TIMESTAMP 
            WHERE text = ?
          `;
                    this.db.run(updateQuery, [text], function (err) {
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
                            resolve(this.mapRowToEntry(updatedRow));
                        }, bind(this));
                    }.bind(this));
                }
                else {
                    const insertQuery = `
            INSERT INTO entries (text, count, created_at, updated_at) 
            VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `;
                    this.db.run(insertQuery, [text], function (err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        const selectQuery = 'SELECT * FROM entries WHERE id = ?';
                        this.db.get(selectQuery, [this.lastID], (err, newRow) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            resolve(this.mapRowToEntry(newRow));
                        }, bind(this));
                    }.bind(this));
                }
            }, bind(this));
        });
    }
    getAllEntries() {
        return new Promise((resolve, reject) => {
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
        return new Promise((resolve, reject) => {
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
    mapRowToEntry(row) {
        return {
            id: row.id,
            text: row.text,
            count: row.count,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    close() {
        this.db.close();
    }
}
exports.Database = Database;
