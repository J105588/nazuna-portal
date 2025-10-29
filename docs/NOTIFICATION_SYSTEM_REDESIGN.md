# 通知システム再設計 - カスタムメッセージ対応版

## 問題の概要
従来の通知システムでは、テンプレートに依存した設計のため、カスタムメッセージが正しく表示されない問題がありました。

## 実装した解決策

### 1. GAS側の修正 (`gas-sample.gs`)

#### `sendNotification` 関数の改修
- **カスタムメッセージ優先処理**: `templateData`に`title`と`message`がある場合、テンプレートを使わずに直接カスタムメッセージを送信
- **フォールバック処理**: テンプレートベースの処理も後方互換性のため残存
- **カスタムデータ構造**: 通知の詳細設定（アイコン、バッジ、アクション等）をカスタムメッセージで直接指定可能

#### `sendFCMMessage` 関数の改修
- **カスタムデータのFCM送信**: カスタムメッセージのデータをFCMの`data`フィールドに直接渡す
- **プラットフォーム対応**: Web、iOS、Androidそれぞれでカスタムデータを適切に処理

### 2. フロントエンド側の修正 (`js/admin.js`)

#### `sendPushNotification` 関数の改修
- **テンプレートキー無効化**: `templateKey: ''`でテンプレートを使用しないことを明示
- **カスタムデータ直接送信**: `templateData`にカスタムメッセージの全情報を含める
- **自動カテゴリ判定**: タイトルから自動的にカテゴリと優先度を判定

#### 新規ヘルパー関数の追加
- `getCategoryFromTitle()`: タイトルからカテゴリを自動判定
- `getPriorityFromTitle()`: タイトルから優先度を自動判定

### 3. サービスワーカーの修正

#### `sw.js` の改修
- **カスタムデータ優先処理**: プッシュデータの解析でカスタムメッセージの情報を優先使用
- **詳細ログ出力**: デバッグ用にプッシュデータの内容をコンソールに出力
- **アクション設定**: カスタムアクションまたはデフォルトアクションを設定

#### `firebase-messaging-sw.js` の改修
- **Firebase Messaging対応**: Firebase Messaging用のサービスワーカーでもカスタムデータを適切に処理
- **iOS対応強化**: iOS PWAでの通知表示を改善

## 主な改善点

### 1. カスタムメッセージの直接送信
```javascript
// 従来（テンプレート依存）
const message = generateMessage(template, templateData);

// 新方式（カスタムメッセージ直接）
if (templateData && templateData.title && templateData.message) {
  message = {
    title: templateData.title,
    body: templateData.message,
    // その他のカスタム設定...
  };
}
```

### 2. 自動カテゴリ・優先度判定
```javascript
// タイトルから自動判定
function getCategoryFromTitle(title) {
  if (title.includes('緊急')) return 'urgent';
  if (title.includes('アンケート')) return 'survey';
  // ...
}
```

### 3. FCMデータの最適化
```javascript
// カスタムデータをFCMに直接送信
const customData = {
  title: message.title,
  body: message.body,
  // その他のカスタム設定...
};
```

## 使用方法

### 管理者画面での通知送信
1. タイトルとメッセージを入力
2. 対象を選択（全員、特定のグループ等）
3. 送信ボタンをクリック
4. カスタムメッセージがそのまま通知として表示される

### カスタム設定の例
```javascript
const notificationData = {
  templateKey: '', // テンプレート不使用
  templateData: {
    title: '緊急のお知らせ',
    message: '明日の授業は休講です。',
    category: 'urgent', // 自動判定される
    priority: 3, // 自動判定される
    requireInteraction: true, // 緊急通知のため
    actions: [
      { action: 'view', title: '詳細を見る' },
      { action: 'dismiss', title: '閉じる' }
    ]
  }
};
```

## 後方互換性
- 既存のテンプレートベースの通知も引き続き動作
- 段階的な移行が可能
- 既存のAPIエンドポイントは変更なし

## テスト方法
1. 管理者画面で通知を送信
2. ブラウザの開発者ツールでコンソールを確認
3. 通知が正しく表示されることを確認
4. 通知クリック時の動作を確認

## 今後の改善案
- 通知テンプレートの管理画面の追加
- 通知の配信統計の詳細化
- 通知のスケジュール送信機能
- 通知の既読管理機能
