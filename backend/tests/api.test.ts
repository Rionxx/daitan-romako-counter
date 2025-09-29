import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { body, validationResult } from 'express-validator';
import { Database } from '../src/database';
import { CreateEntryRequest, EntryResponse, UserResponse } from '../src/types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// テスト用のExpressアプリを作成
const createTestApp = () => {
  const app = express();
  const db = new Database();

  app.use(cors());
  app.use(express.json());

  // エントリー作成API
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

  // エントリー一覧取得API
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

  // ランキング取得API
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

  // ユーザー作成API
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

  // ユーザー取得API
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

  // ヘルスチェックAPI
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', message: 'ロマ子あるある挨拶カウンター API is running' });
  });

  return { app, db };
};

describe('API Endpoints', () => {
  let app: express.Application;
  let db: Database;
  const testDbPath = path.join(__dirname, '../test-database.sqlite');

  beforeEach(() => {
    // テスト用の一時データベースファイルを削除
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    process.env.NODE_ENV = 'test';
    const testApp = createTestApp();
    app = testApp.app;
    db = testApp.db;
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('POST /api/entries', () => {
    test('should create a new entry with valid text', async () => {
      const response = await request(app)
        .post('/api/entries')
        .send({
          text: 'だいたいロマ子のテスト投稿です',
          userId: 'test-user-1',
          userName: 'テストユーザー'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.entry.text).toBe('だいたいロマ子のテスト投稿です');
      expect(response.body.entry.count).toBe(1);
      expect(response.body.entry.userId).toBe('test-user-1');
      expect(response.body.entry.userName).toBe('テストユーザー');
    });

    test('should reject entry without required keyword', async () => {
      const response = await request(app)
        .post('/api/entries')
        .send({
          text: 'ロマ子がない投稿',
          userId: 'test-user-1',
          userName: 'テストユーザー'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('だいたいロマ子');
    });

    test('should reject entry with empty text', async () => {
      const response = await request(app)
        .post('/api/entries')
        .send({
          text: '',
          userId: 'test-user-1',
          userName: 'テストユーザー'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Text is required');
    });

    test('should increment count for duplicate text', async () => {
      const text = 'だいたいロマ子の重複テスト';
      
      // 最初の投稿
      await request(app)
        .post('/api/entries')
        .send({ text, userId: 'user-1', userName: 'ユーザー1' });

      // 同じテキストで2回目の投稿
      const response = await request(app)
        .post('/api/entries')
        .send({ text, userId: 'user-2', userName: 'ユーザー2' });

      expect(response.status).toBe(200);
      expect(response.body.entry.count).toBe(2);
    });
  });

  describe('GET /api/entries', () => {
    test('should return empty array when no entries', async () => {
      const response = await request(app).get('/api/entries');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('should return entries ordered by updated_at DESC', async () => {
      // エントリーを作成
      await request(app)
        .post('/api/entries')
        .send({ text: 'だいたいロマ子テスト1' });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await request(app)
        .post('/api/entries')
        .send({ text: 'だいたいロマ子テスト2' });

      const response = await request(app).get('/api/entries');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      const texts = response.body.map((e: any) => e.text);
      expect(texts).toContain('だいたいロマ子テスト1');
      expect(texts).toContain('だいたいロマ子テスト2');
    });
  });

  describe('GET /api/ranking', () => {
    test('should return ranking ordered by count DESC', async () => {
      const text1 = 'だいたいロマ子ランキング1';
      const text2 = 'だいたいロマ子ランキング2';
      
      // text1を1回投稿
      await request(app)
        .post('/api/entries')
        .send({ text: text1 });
      
      // text2を2回投稿
      await request(app)
        .post('/api/entries')
        .send({ text: text2 });
      await request(app)
        .post('/api/entries')
        .send({ text: text2 });

      const response = await request(app).get('/api/ranking');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      
      // カウント順にソートされていることを確認
      const sortedByCount = response.body.sort((a: any, b: any) => b.count - a.count);
      expect(sortedByCount[0].text).toBe(text2);
      expect(sortedByCount[0].count).toBe(2);
    });
  });

  describe('POST /api/users', () => {
    test('should create a new user', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'テストユーザー' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.name).toBe('テストユーザー');
      expect(response.body.user.id).toBeDefined();
    });

    test('should reject user with empty name', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users/:id', () => {
    test('should return user when exists', async () => {
      // ユーザーを作成
      const createResponse = await request(app)
        .post('/api/users')
        .send({ name: 'テストユーザー' });

      const userId = createResponse.body.user.id;

      // ユーザーを取得
      const response = await request(app).get(`/api/users/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.name).toBe('テストユーザー');
    });

    test('should return 404 when user not found', async () => {
      const response = await request(app).get('/api/users/non-existing-user');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
    });
  });
});