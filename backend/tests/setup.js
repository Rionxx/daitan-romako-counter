"use strict";
// テスト環境のセットアップ
process.env.NODE_ENV = 'test';
// コンソールログを抑制（必要に応じて）
if (process.env.SUPPRESS_LOGS) {
    console.log = jest.fn();
    console.error = jest.fn();
}
// テスト後のクリーンアップ
afterAll(async () => {
    // 必要に応じてグローバルクリーンアップを行う
});
