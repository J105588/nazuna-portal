# シンプルFCM通知システム（既存システム統合版）

## 概要
既存のGASとconfigを活用し、複雑なテンプレートシステムを廃止したシンプルで確実なFCM通知システムです。

## アーキテクチャ

```
Admin UI → 既存GAS → FCM → Service Worker → Browser Notification
```

## ファイル構成

### クライアント側
- `js/simple-notification-manager.js` - 通知管理クラス（既存設定を活用）
- `admin-simple.html` - 管理者UI
- `config-simple.js` - 統合設定ファイル（既存configから取得）
- `sw-simple.js` - Service Worker

### サーバー側
- 既存の `gas-sample.gs` に統合済み（シンプル通知機能追加）

## セットアップ手順（既存システム統合版）

### 1. 既存システムの確認
- 既存の `gas-sample.gs` が動作していることを確認
- 既存の `js/config.js` と `js/firebase-config.js` の設定を確認
- Supabaseのテーブルが既に存在することを確認

### 2. GAS統合（完了済み）
✅ 既存の `gas-sample.gs` にシンプル通知機能を統合済み

**統合された機能:**
- `registerDeviceSimple()` - デバイス登録（シンプル版）
- `sendNotificationSimple()` - 通知送信（シンプル版）
- `getDevicesSimple()` - デバイス取得（シンプル版）

**新しいアクション:**
- `registerDeviceSimple` - シンプルデバイス登録
- `sendNotificationSimple` - シンプル通知送信
- `getDevicesSimple` - シンプルデバイス取得

**次のステップ:**
1. GASを再デプロイ
2. 新しいアクションが正常に動作することを確認

### 3. クライアント設定
1. `config-simple.js` は既存の設定を自動取得
2. `admin-simple.html` を開いて管理者UIにアクセス
3. 既存のService Workerを `sw-simple.js` に置き換え（オプション）

## 使用方法

### 管理者UI
1. `admin-simple.html` にアクセス
2. 通知のタイトルとメッセージを入力
3. 配信対象を選択
4. 「通知を送信」ボタンをクリック

### プログラムからの送信
```javascript
// 通知マネージャーを初期化
await window.simpleNotificationManager.initialize();

// 通知を送信
await window.simpleNotificationManager.sendNotification(
  'タイトル',
  'メッセージ',
  'all' // 配信対象
);
```

## 主な特徴

### 既存システム統合
- 既存のGASとconfigを活用
- 既存のSupabaseテーブルを使用
- 既存のFirebase設定を継承

### シンプル設計
- テンプレートシステムを廃止
- 管理者入力内容をそのまま送信
- 複雑な設定不要

### 確実な動作
- 既存のエラーハンドリングを活用
- 詳細なログ出力
- フォールバック処理

### 保守性
- 既存コードとの互換性
- デバッグが容易
- 段階的な移行が可能

## トラブルシューティング

### 通知が表示されない
1. ブラウザの通知権限を確認
2. Service Workerが正しく登録されているか確認
3. FCMトークンが正しく取得されているか確認

### GAS通信エラー
1. スクリプトIDが正しいか確認
2. GASのデプロイが完了しているか確認
3. ネットワーク接続を確認

### Firebase認証エラー
1. サービスアカウントキーが正しいか確認
2. Firebase Cloud Messaging APIが有効化されているか確認
3. プロジェクトIDが正しいか確認

## ログ確認

### ブラウザコンソール
```javascript
// デバッグログを有効化
window.SIMPLE_NOTIFICATION_CONFIG.debug.enabled = true;
window.SIMPLE_NOTIFICATION_CONFIG.debug.logLevel = 'debug';
```

### GASログ
1. GASエディタで「実行」→「ログを表示」
2. エラーメッセージを確認

## 今後の拡張

### 予定機能
- 通知のスケジュール送信
- ユーザーグループ管理
- 通知の開封率追跡
- 多言語対応

### カスタマイズ
- 通知アイコンの変更
- 音声設定の追加
- 通知の優先度設定
- カスタムアクション

## サポート

問題が発生した場合は、以下を確認してください：

1. ブラウザの開発者ツールでエラーログを確認
2. GASの実行ログを確認
3. Firebase Consoleでメッセージ送信状況を確認
4. Supabaseのデータベースログを確認
