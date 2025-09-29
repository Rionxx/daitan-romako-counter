"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_validator_1 = require("express-validator");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const uuid_1 = require("uuid");
const database_1 = require("./database");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3001;
const db = new database_1.Database();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.post('/api/entries', (0, express_validator_1.body)('text').notEmpty().withMessage('Text is required'), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error: Text is required'
            });
        }
        const { text, userId, userName } = req.body;
        if (!(text.includes('だいたいロマ子') || text.includes('大体ロマ子'))) {
            return res.status(400).json({
                success: false,
                message: 'Text must contain "だいたいロマ子" or "大体ロマ子"'
            });
        }
        const entry = await db.createOrUpdateEntry(text, userId, userName);
        // Broadcast the new entry to all connected clients
        io.emit('entryCreated', entry);
        res.json({
            success: true,
            message: 'Entry saved successfully',
            entry
        });
    }
    catch (error) {
        console.error('Error creating entry:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
app.get('/api/entries', async (req, res) => {
    try {
        const entries = await db.getAllEntries();
        res.json(entries);
    }
    catch (error) {
        console.error('Error fetching entries:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
app.get('/api/ranking', async (req, res) => {
    try {
        const ranking = await db.getRanking();
        res.json(ranking);
    }
    catch (error) {
        console.error('Error fetching ranking:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
// User management endpoints
app.post('/api/users', (0, express_validator_1.body)('name').notEmpty().withMessage('Name is required'), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error: Name is required'
            });
        }
        const { name } = req.body;
        const userId = (0, uuid_1.v4)();
        const user = await db.createUser(userId, name);
        res.json({
            success: true,
            message: 'User created successfully',
            user
        });
    }
    catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await db.getUser(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            message: 'User found',
            user
        });
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', message: 'ロマ子あるある挨拶カウンター API is running' });
});
// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
    socket.on('join', (data) => {
        console.log('User joined:', data);
    });
});
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    db.close();
    process.exit(0);
});
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`WebSocket server is running`);
});
