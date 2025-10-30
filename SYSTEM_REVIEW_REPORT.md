# なずなポータル システム全体レビューレポート

## レビュー実施日
2025年1月

## 確認範囲
- Google Apps Script (GAS) コード
- フロントエンド JavaScript ファイル
- フロントエンドとバックエンドの連携
- 認証システム
- 通知システム

## 発見された問題

### 🔴 重大な問題

#### 1. 通知送信APIの不整合
**ファイル**: `js/admin.js` (663行目)
**問題**: 
- フロントエンドが `sendBulkNotifications`（複数形）を呼び出している
- GAS側は `sendBulkNotification`（単数形）を実装
- データ形式も異なる：フロントエンドは `{title, body, target}` 形式だが、GASは `{notifications: [...]}` 配列を期待

**影響**: 管理画面からの通知送信が機能しない

**修正が必要な箇所**:
```javascript
// js/admin.js:663
// 現在:
const result = await window.apiClient.sendRequest('sendBulkNotifications', {
    title: title,
    body: body,
    target: target,
    url: '/',
    category: 'general'
});

// 修正後（オプション1: sendNotificationを使用）:
const result = await window.apiClient.sendRequest('sendNotification', {
    preferCustom: true,
    templateData: {
        title: title,
        message: body,
        url: '/',
        category: 'general'
    },
    targetType: target || 'all',
    targetCriteria: {},
    adminEmail: currentUser?.email
});

// または（オプション2: sendBulkNotificationに対応）:
const result = await window.apiClient.sendRequest('sendBulkNotification', {
    notifications: [{
        preferCustom: true,
        templateData: {
            title: title,
            message: body,
            url: '/',
            category: 'general'
        },
        targetType: target || 'all',
        targetCriteria: {},
        adminEmail: currentUser?.email
    }]
});
```

#### 2. adminLogin関数の変数参照
**ファイル**: `backend/gas-sample.gs` (684行目)
**状態**: ✅ **問題なし** 
**確認結果**: 
- `admin` 変数は正しく定義されている（684行目）
- ロジックは正常に動作する

#### 3. isAuthorized関数のロジックミス
**ファイル**: `backend/gas-sample.gs` (788-793行目)
**問題**: 
- `isAuthorized` 関数が `adminCredentials[email].password` をチェックしている
- しかし、実際のデータ構造では `passwordHash` が保存されている
- この関数は使われていないが、後方互換性のために残されている

**影響**: この関数を使用する場合、認証が機能しない

**修正が必要な箇所**:
```javascript
// backend/gas-sample.gs:788-793
// 現在:
function isAuthorized(email, password) {
  if (!email || !password) return false;
  
  const adminCredentials = getAdminCredentials();
  return adminCredentials[email] && adminCredentials[email].password === password;
}

// 修正後:
function isAuthorized(email, password) {
  if (!email || !password) return false;
  
  const adminCredentials = getAdminCredentials();
  if (!adminCredentials[email]) return false;
  
  // パスワードをハッシュ化して比較
  const passwordHash = hashPassword(password);
  return adminCredentials[email].passwordHash === passwordHash;
}
```

### ⚠️ 中程度の問題

#### 4. 2つのGASファイルの存在
**ファイル**: 
- `backend/gas-sample.gs` (より新しいバージョン、パスワードハッシュ化対応)
- `gas-sample.gs` (古いバージョン、生パスワード)

**問題**: 
- どちらが実際に使用されているか不明
- 古いバージョンが使用されている場合、セキュリティ上の問題

**推奨**: 
- 使用中のGASファイルを確認し、不要なファイルを削除
- `backend/gas-sample.gs` の方が新しいので、こちらを使用すべき

#### 5. admin.jsのレスポンス形式の不一致
**ファイル**: `js/admin.js` (672行目)
**問題**: 
- `result.results.success` と `result.results.failed` を参照しているが
- GAS側の `sendBulkNotification` は `summary.success`, `summary.failure` を返す

**修正が必要な箇所**:
```javascript
// js/admin.js:672
// 現在:
showSuccess(`通知を送信しました（成功: ${result.results.success}, 失敗: ${result.results.failed}）`);

// 修正後:
showSuccess(`通知を送信しました（成功: ${result.data?.summary?.success || 0}, 失敗: ${result.data?.summary?.failure || 0}）`);
```

### ✅ 正しく実装されている機能

1. **Supabase連携**: `supabase-queries.js` が統一されたクエリインターフェースを提供
2. **通知システム**: `notification-manager.js` が適切にFCMトークンを管理
3. **メンテナンスモード**: `maintenance-checker.js` が正しく実装されている
4. **Firebase設定**: `firebase-config.js` が適切に初期化されている
5. **セッション管理**: `admin.js` のセッション管理が実装されている

## フロントエンドとバックエンドの連携状況

### 正常に連携している機能
- ✅ デバイス登録 (`registerDevice`, `registerFCMToken`)
- ✅ 管理者ログイン (`adminLogin`) - ただし変数参照の問題あり
- ✅ セッション検証 (`verifyAdminSession`)
- ✅ メンテナンスモード管理 (`checkMaintenance`, `enableMaintenance`, `disableMaintenance`)
- ✅ データ取得 (`getClubs`, `getNews`, `getMembers`, `getPosts`)

### 連携に問題がある機能
- ✅ 通知送信 (`sendNotification`) - **修正済み**
- ⚠️ 一括通知送信 (`sendBulkNotification`) - 現在は使用されていない（単一通知で対応）

## 修正実施済み ✅

1. ✅ **完了**: `js/admin.js` の通知送信関数の修正（`sendNotification` APIを使用）
2. ✅ **完了**: `isAuthorized` 関数の修正（パスワードハッシュ化に対応）

## 残っている推奨事項

1. **低優先度**: 使用されていないGASファイル（`gas-sample.gs`）の削除または統合確認
2. **検証**: 通知送信機能の動作確認（管理画面から実際に送信してテスト）

## 追加の確認事項

1. **GASファイルのデプロイ**: どちらのGASファイルが実際にデプロイされているか確認
2. **CORS設定**: GAS WebAppの設定でCORSが正しく有効になっているか確認
3. **環境変数**: PropertiesServiceに必要な設定値が設定されているか確認
4. **Supabase RLS**: Row Level Security (RLS) ポリシーが適切に設定されているか確認

