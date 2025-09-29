"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_validator_1 = require("express-validator");
const database_1 = require("../src/database");
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// 統合テスト用のアプリケーション全体をテスト
describe('Integration Tests', () => {
    let app;
    let db;
    const testDbPath = path_1.default.join(__dirname, '../test-database.sqlite');
    beforeEach(() => {
        // テスト用の一時データベースファイルを削除
        if (fs_1.default.existsSync(testDbPath)) {
            fs_1.default.unlinkSync(testDbPath);
        }
        process.env.NODE_ENV = 'test';
        // フルアプリケーションを作成
        app = (0, express_1.default)();
        db = new database_1.Database();
        app.use((0, cors_1.default)());
        app.use(express_1.default.json());
        // エントリー作成API
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
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
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
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    });
    afterEach(() => {
        db.close();
        if (fs_1.default.existsSync(testDbPath)) {
            fs_1.default.unlinkSync(testDbPath);
        }
    });
    describe('Complete User Flow', () => {
        test('should handle complete user registration and entry creation flow', async () => {
            // 1. ユーザー登録
            const userResponse = await (0, supertest_1.default)(app)
                .post('/api/users')
                .send({ name: '統合テストユーザー' });
            expect(userResponse.status).toBe(200);
            expect(userResponse.body.success).toBe(true);
            const user = userResponse.body.user;
            expect(user.name).toBe('統合テストユーザー');
            expect(user.id).toBeDefined();
            // 2. ユーザー情報取得
            const getUserResponse = await (0, supertest_1.default)(app)
                .get(`/api/users/${user.id}`);
            expect(getUserResponse.status).toBe(200);
            expect(getUserResponse.body.user.name).toBe('統合テストユーザー');
            // 3. エントリー作成
            const entryResponse = await (0, supertest_1.default)(app)
                .post('/api/entries')
                .send({
                text: 'だいたいロマ子の統合テスト投稿',
                userId: user.id,
                userName: user.name
            });
            expect(entryResponse.status).toBe(200);
            expect(entryResponse.body.success).toBe(true);
            expect(entryResponse.body.entry.userId).toBe(user.id);
            expect(entryResponse.body.entry.userName).toBe(user.name);
            // 4. エントリー一覧取得
            const entriesResponse = await (0, supertest_1.default)(app).get('/api/entries');
            expect(entriesResponse.status).toBe(200);
            expect(entriesResponse.body).toHaveLength(1);
            expect(entriesResponse.body[0].text).toBe('だいたいロマ子の統合テスト投稿');
            // 5. ランキング取得
            const rankingResponse = await (0, supertest_1.default)(app).get('/api/ranking');
            expect(rankingResponse.status).toBe(200);
            expect(rankingResponse.body).toHaveLength(1);
            expect(rankingResponse.body[0].count).toBe(1);
        });
        test('should handle multiple users and entries correctly', async () => {
            // 複数ユーザーを作成
            const user1Response = await (0, supertest_1.default)(app)
                .post('/api/users')
                .send({ name: 'ユーザー1' });
            const user2Response = await (0, supertest_1.default)(app)
                .post('/api/users')
                .send({ name: 'ユーザー2' });
            const user1 = user1Response.body.user;
            const user2 = user2Response.body.user;
            // 複数エントリーを作成
            await (0, supertest_1.default)(app)
                .post('/api/entries')
                .send({
                text: 'だいたいロマ子テスト1',
                userId: user1.id,
                userName: user1.name
            });
            await (0, supertest_1.default)(app)
                .post('/api/entries')
                .send({
                text: 'だいたいロマ子テスト2',
                userId: user2.id,
                userName: user2.name
            });
            // 同じテキストで重複投稿
            await (0, supertest_1.default)(app)
                .post('/api/entries')
                .send({
                text: 'だいたいロマ子テスト1',
                userId: user2.id,
                userName: user2.name
            });
            // エントリー一覧確認
            const entriesResponse = await (0, supertest_1.default)(app).get('/api/entries');
            expect(entriesResponse.body).toHaveLength(2);
            // ランキング確認（カウント順）
            const rankingResponse = await (0, supertest_1.default)(app).get('/api/ranking');
            expect(rankingResponse.body).toHaveLength(2);
            expect(rankingResponse.body[0].count).toBe(2); // 重複投稿されたもの
            expect(rankingResponse.body[1].count).toBe(1);
        });
        test('should maintain data consistency across operations', async () => {
            // ユーザー作成
            const userResponse = await (0, supertest_1.default)(app)
                .post('/api/users')
                .send({ name: 'データ整合性テストユーザー' });
            const user = userResponse.body.user;
            // 同じテキストで複数回投稿
            const text = 'だいたいロマ子のデータ整合性テスト';
            for (let i = 0; i < 5; i++) {
                const entryResponse = await (0, supertest_1.default)(app)
                    .post('/api/entries')
                    .send({
                    text,
                    userId: user.id,
                    userName: user.name
                });
                expect(entryResponse.status).toBe(200);
                expect(entryResponse.body.entry.count).toBe(i + 1);
            }
            // 最終的なカウント確認
            const entriesResponse = await (0, supertest_1.default)(app).get('/api/entries');
            expect(entriesResponse.body).toHaveLength(1);
            expect(entriesResponse.body[0].count).toBe(5);
            const rankingResponse = await (0, supertest_1.default)(app).get('/api/ranking');
            expect(rankingResponse.body).toHaveLength(1);
            expect(rankingResponse.body[0].count).toBe(5);
        });
        test('should handle edge cases properly', async () => {
            // 空のデータベース状態での取得
            const emptyEntriesResponse = await (0, supertest_1.default)(app).get('/api/entries');
            expect(emptyEntriesResponse.body).toEqual([]);
            const emptyRankingResponse = await (0, supertest_1.default)(app).get('/api/ranking');
            expect(emptyRankingResponse.body).toEqual([]);
            // 存在しないユーザーの取得
            const nonExistentUserResponse = await (0, supertest_1.default)(app)
                .get('/api/users/non-existent-id');
            expect(nonExistentUserResponse.status).toBe(404);
            // 無効なテキストでのエントリー作成
            const invalidEntryResponse = await (0, supertest_1.default)(app)
                .post('/api/entries')
                .send({
                text: 'ロマ子なしのテキスト',
                userId: 'test-user',
                userName: 'テストユーザー'
            });
            expect(invalidEntryResponse.status).toBe(400);
        });
    });
});
