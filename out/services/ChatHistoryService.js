"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatHistoryService = void 0;
const fs = require("fs");
const path = require("path");
const os = require("os");
class ChatHistoryService {
    constructor() {
        this.db = null;
        this.dbPath = path.join(os.homedir(), '.inquira', 'history.db');
        this.ensureDatabaseDirectory();
        this.initializeDatabase();
    }
    ensureDatabaseDirectory() {
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    async initializeDatabase() {
        try {
            const { Database } = require('@duckdb/node-api');
            this.db = new Database(this.dbPath);
            // Create messages table if it doesn't exist
            const createTableQuery = `
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    code TEXT,
                    explanation TEXT
                )
            `;
            await this.runQuery(createTableQuery);
        }
        catch (error) {
            console.error('Error initializing chat history database:', error);
        }
    }
    async runQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.run(query, params, (err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
    async getQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    async saveMessage(message) {
        try {
            const query = `
                INSERT INTO messages (timestamp, type, content, code, explanation)
                VALUES (?, ?, ?, ?, ?)
            `;
            const params = [
                message.timestamp.toISOString(),
                message.type,
                message.content,
                message.code || null,
                message.explanation || null
            ];
            await this.runQuery(query, params);
            // Get the last inserted ID
            const result = await this.getQuery('SELECT last_insert_rowid() as id');
            return result[0].id;
        }
        catch (error) {
            console.error('Error saving message:', error);
            throw error;
        }
    }
    async getRecentMessages(limit = 4, offset = 0) {
        try {
            const query = `
                SELECT id, timestamp, type, content, code, explanation
                FROM messages
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
            `;
            const rows = await this.getQuery(query, [limit, offset]);
            return rows.map((row) => ({
                id: row.id,
                timestamp: new Date(row.timestamp),
                type: row.type,
                content: row.content,
                code: row.code,
                explanation: row.explanation
            })).reverse(); // Reverse to show oldest first
        }
        catch (error) {
            console.error('Error getting recent messages:', error);
            return [];
        }
    }
    async getMessageCount() {
        try {
            const result = await this.getQuery('SELECT COUNT(*) as count FROM messages');
            return result[0].count;
        }
        catch (error) {
            console.error('Error getting message count:', error);
            return 0;
        }
    }
    async clearHistory() {
        try {
            await this.runQuery('DELETE FROM messages');
        }
        catch (error) {
            console.error('Error clearing history:', error);
            throw error;
        }
    }
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}
exports.ChatHistoryService = ChatHistoryService;
//# sourceMappingURL=ChatHistoryService.js.map