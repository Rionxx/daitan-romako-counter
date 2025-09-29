import express from 'express';
import cors from 'cors';
import { body, validationResult } from 'express-validator';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Database } from './database';
import { CreateEntryRequest, EntryResponse, UserResponse } from './types';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const db = new Database();

app.use(cors());
app.use(express.json());

app.post('/api/entries',
  body('text').notEmpty().withMessage('Text is required'),
  async (req: express.Request<{}, EntryResponse, CreateEntryRequest>, res) => {
    try {
      const errors = validationResult(req);
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
    } catch (error) {
      console.error('Error creating entry:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

app.get('/api/entries', async (req, res) => {
  try {
    const entries = await db.getAllEntries();
    res.json(entries);
  } catch (error) {
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
  } catch (error) {
    console.error('Error fetching ranking:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// User management endpoints
app.post('/api/users', 
  body('name').notEmpty().withMessage('Name is required'),
  async (req: express.Request<{}, UserResponse, { name: string }>, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error: Name is required'
        });
      }

      const { name } = req.body;
      const userId = uuidv4();
      const user = await db.createUser(userId, name);
      
      res.json({
        success: true,
        message: 'User created successfully',
        user
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

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
  } catch (error) {
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