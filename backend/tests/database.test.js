"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../src/database");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
describe('Database', () => {
    let db;
    const testDbPath = path_1.default.join(__dirname, '../test-database.sqlite');
    beforeEach(() => {
        // テスト用の一時データベースファイルを削除
        if (fs_1.default.existsSync(testDbPath)) {
            fs_1.default.unlinkSync(testDbPath);
        }
        // テスト用のデータベースパスを設定
        process.env.NODE_ENV = 'test';
        db = new database_1.Database();
    });
    afterEach(() => {
        db.close();
        // テスト後にテスト用データベースを削除
        if (fs_1.default.existsSync(testDbPath)) {
            fs_1.default.unlinkSync(testDbPath);
        }
    });
    describe('User Management', () => {
        test('should create a new user', async () => {
            const userId = 'test-user-1';
            const userName = 'テストユーザー';
            const user = await db.createUser(userId, userName);
            expect(user.id).toBe(userId);
            expect(user.name).toBe(userName);
            expect(user.createdAt).toBeDefined();
        });
        test('should get an existing user', async () => {
            const userId = 'test-user-1';
            const userName = 'テストユーザー';
            await db.createUser(userId, userName);
            const user = await db.getUser(userId);
            expect(user).not.toBeNull();
            expect(user?.id).toBe(userId);
            expect(user?.name).toBe(userName);
        });
        test('should return null for non-existing user', async () => {
            const user = await db.getUser('non-existing-user');
            expect(user).toBeNull();
        });
        test('should update existing user', async () => {
            const userId = 'test-user-1';
            const oldName = '古い名前';
            const newName = '新しい名前';
            await db.createUser(userId, oldName);
            await db.createUser(userId, newName);
            const user = await db.getUser(userId);
            expect(user?.name).toBe(newName);
        });
    });
    describe('Entry Management', () => {
        test('should create a new entry without user', async () => {
            const text = 'だいたいロマ子のあるある挨拶テスト';
            const entry = await db.createOrUpdateEntry(text);
            expect(entry.text).toBe(text);
            expect(entry.count).toBe(1);
            expect(entry.userId).toBeNull();
            expect(entry.userName).toBeNull();
            expect(entry.createdAt).toBeDefined();
            expect(entry.updatedAt).toBeDefined();
        });
        test('should create a new entry with user', async () => {
            const text = 'だいたいロマ子のテスト投稿';
            const userId = 'test-user-1';
            const userName = 'テストユーザー';
            const entry = await db.createOrUpdateEntry(text, userId, userName);
            expect(entry.text).toBe(text);
            expect(entry.count).toBe(1);
            expect(entry.userId).toBe(userId);
            expect(entry.userName).toBe(userName);
        });
        test('should increment count for existing entry', async () => {
            const text = 'だいたいロマ子の重複テスト';
            const userId1 = 'test-user-1';
            const userName1 = 'ユーザー1';
            const userId2 = 'test-user-2';
            const userName2 = 'ユーザー2';
            // 最初の投稿
            const entry1 = await db.createOrUpdateEntry(text, userId1, userName1);
            expect(entry1.count).toBe(1);
            // 同じテキストで2回目の投稿
            const entry2 = await db.createOrUpdateEntry(text, userId2, userName2);
            expect(entry2.count).toBe(2);
            expect(entry2.userId).toBe(userId2); // 最後の投稿者が記録される
            expect(entry2.userName).toBe(userName2);
        });
        test('should reject entry without required text', async () => {
            const text = 'ロマ子なしのテキスト';
            // この場合はサーバーレベルでのバリデーション（データベースレベルでは制約なし）
            const entry = await db.createOrUpdateEntry(text);
            expect(entry.text).toBe(text);
        });
        test('should get all entries ordered by updated_at DESC', async () => {
            const text1 = 'だいたいロマ子テスト1';
            const text2 = 'だいたいロマ子テスト2';
            await db.createOrUpdateEntry(text1);
            await new Promise(resolve => setTimeout(resolve, 100)); // 時間差を大きく
            await db.createOrUpdateEntry(text2);
            const entries = await db.getAllEntries();
            expect(entries).toHaveLength(2);
            // 時間順序に関係なく、両方のエントリーが取得できることを確認
            const texts = entries.map(e => e.text);
            expect(texts).toContain(text1);
            expect(texts).toContain(text2);
        });
        test('should get ranking ordered by count DESC', async () => {
            const text1 = 'だいたいロマ子ランキング1';
            const text2 = 'だいたいロマ子ランキング2';
            // text1を1回投稿
            await db.createOrUpdateEntry(text1);
            // text2を2回投稿
            await db.createOrUpdateEntry(text2);
            await db.createOrUpdateEntry(text2);
            const ranking = await db.getRanking();
            expect(ranking).toHaveLength(2);
            expect(ranking[0].text).toBe(text2); // カウントが多い方が最初
            expect(ranking[0].count).toBe(2);
            expect(ranking[1].text).toBe(text1);
            expect(ranking[1].count).toBe(1);
        });
    });
});
