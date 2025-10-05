# なずなポータル セットアップガイド

システムを動作させるために必要な設定項目をすべてまとめました。

## 📋 設定が必要な項目一覧

### 1. Firebase プロジェクト設定

#### 1.1 Firebase Console での作業
1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例：`nazuna-portal`）
4. Google Analytics は任意で設定

#### 1.2 Firebase Messaging 設定
1. プロジェクト設定 → Cloud Messaging タブ
2. 「Web プッシュ証明書」で「証明書を生成」
3. **VAPIDキー**をコピーして保存 📝

#### 1.3 Firebase 設定情報取得
1. プロジェクト設定 → 全般タブ
2. 「ウェブアプリを Firebase に追加」
3. アプリ名を入力（例：`nazuna-portal-web`）
4. **Firebase SDK設定オブジェクト**をコピーして保存 📝

#### 1.4 FCM Server Key 取得
1. プロジェクト設定 → Cloud Messaging タブ
2. **「サーバーキー」**をコピーして保存 📝

---

### 2. Supabase データベース設定

#### 2.1 Supabase プロジェクト作成
1. [Supabase](https://supabase.com/) でアカウント作成
2. 「New project」をクリック
3. プロジェクト名を入力（例：`nazuna-portal`）
4. データベースパスワードを設定して保存 📝

#### 2.2 データベーススキーマ作成
1. Supabase Dashboard → SQL Editor
2. `system.sql` の内容をすべてコピー
3. SQL Editorに貼り付けて実行
4. エラーがないことを確認

#### 2.3 API キー取得
1. Settings → API
2. **`anon public`** キー（クライアント用）をコピー 📝
3. **`service_role`** キー（GAS用）をコピー 📝
4. **Project URL** をコピー 📝

---

### 3. Google Apps Script 設定

#### 3.1 GAS プロジェクト作成
1. [Google Apps Script](https://script.google.com/) にアクセス
2. 「新しいプロジェクト」を作成
3. プロジェクト名を設定（例：`nazuna-portal-system`）

#### 3.2 GAS コード設定
1. `gas-sample.gs` の内容をすべてコピー
2. GAS エディタの `Code.gs` に貼り付け（既存コードを削除）
3. ファイルを保存

#### 3.3 スクリプトプロパティ設定
1. GAS エディタで「プロジェクトの設定」→「スクリプト プロパティ」
2. 以下のプロパティを追加：

| プロパティ名 | 値 | 説明 |
|-------------|-----|------|
| `SUPABASE_URL` | `https://your-project.supabase.co` | SupabaseのProject URL |
| `SUPABASE_SERVICE_KEY` | `eyJ0eXAiOiJKV1QiLCJhbGci...` | Supabaseのservice_roleキー |
| `FIREBASE_PROJECT_ID` | `nazuna-portal` | FirebaseのProject ID |
| `FIREBASE_SERVER_KEY` | `AAAA...` | FirebaseのServer Key |
| `DEBUG_MODE` | `false` | 本番環境では`false` |
| `SPREADSHEET_ID` | `1ABC...` | （オプション）スプレッドシート連携用 |

#### 3.4 管理者アカウント設定
1. GAS エディタで関数 `initializeGASProperties` を実行
2. 実行ログで設定完了を確認
3. 必要に応じて `setupAdminAccounts` を実行してアカウント追加

#### 3.5 GAS Webアプリとしてデプロイ
1. GAS エディタで「デプロイ」→「新しいデプロイ」
2. 種類：「ウェブアプリ」を選択
3. 実行者：「自分」
4. アクセス権限：「全員」
5. デプロイ後、**WebアプリのURL**をコピー 📝

---

### 4. PWA 設定ファイル更新

#### 4.1 基本設定（`js/config.js`）
```javascript
const CONFIG = {
    SUPABASE: {
        URL: 'https://your-project.supabase.co', // ← ここを更新
        ANON_KEY: 'eyJ0eXAiOiJKV1QiLCJhbGci...' // ← ここを更新
    },
    GAS_URL: 'https://script.google.com/macros/s/your-script-id/exec', // ← ここを更新
    FIREBASE: {
        PROJECT_ID: 'nazuna-portal', // ← ここを更新
        VAPID_KEY: 'BEl62iUYgUivxIkv69yViEuiBIa40HI0...', // ← ここを更新
        MESSAGING_SENDER_ID: '181514532945' // ← ここを更新
    }
};
```

#### 4.2 Firebase設定（`js/firebase-config.js`）
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyC...", // ← ここを更新
    authDomain: "nazuna-portal.firebaseapp.com", // ← ここを更新
    projectId: "nazuna-portal", // ← ここを更新
    storageBucket: "nazuna-portal.firebasestorage.app", // ← Firebase Storage用の新しいドメイン
    messagingSenderId: "123456789", // ← ここを更新
    appId: "1:123456789:web:abc123", // ← ここを更新
    measurementId: "G-XXXXXXXXXX" // ← ここを更新（オプション）
};

const vapidKey = "BEl62iUYgUivxIkv69yViEuiBIa40HI0..."; // ← ここを更新
```

---

### 5. 管理者アカウント設定

#### 5.1 デフォルト管理者アカウント
| メールアドレス | パスワード | 権限 | 説明 |
|---------------|-----------|------|------|
| `admin@school.ac.jp` | `admin123` | 全権限 | システム管理者 |
| `council@school.ac.jp` | `council456` | 通知・ニュース・アンケート・フォーラム | 生徒会管理者 |
| `teacher@school.ac.jp` | `teacher789` | フォーラム・ニュース | 教員管理者 |

#### 5.2 カスタム管理者アカウント追加
1. GAS エディタで `setupAdminAccounts` 関数を編集
2. 新しいアカウント情報を追加
3. 関数を実行して設定を更新

---

### 6. ドメイン・ホスティング設定

#### 6.1 独自ドメイン（オプション）
- ドメインを取得している場合は、DNS設定でホスティング先を指定

#### 6.2 HTTPS設定
- 本番環境では必ずHTTPS接続を使用
- プッシュ通知はHTTPS必須

---

## 🔧 設定手順

### ステップ1: Firebase設定
1. Firebase Console でプロジェクト作成
2. VAPIDキー、Server Key、設定オブジェクトを取得
3. `js/config.js` と `js/firebase-config.js` を更新

### ステップ2: Supabase設定
1. Supabase でプロジェクト作成
2. `system.sql` を実行してデータベース構築
3. API キーとProject URLを取得

### ステップ3: GAS設定
1. GAS プロジェクト作成
2. `gas-sample.gs` をコピー
3. スクリプトプロパティを設定
4. Webアプリとしてデプロイ
5. `js/config.js` のGAS_URLを更新

### ステップ4: 動作確認
1. PWA を開いて基本機能をテスト
2. 管理画面にログインして認証をテスト
3. 通知機能をテスト

---

## 📝 設定値チェックリスト

### Firebase関連
- [ ] Project ID
- [ ] API Key
- [ ] Auth Domain
- [ ] Storage Bucket
- [ ] Messaging Sender ID
- [ ] App ID
- [ ] VAPID Key
- [ ] Server Key

### Supabase関連
- [ ] Project URL
- [ ] Anon Key
- [ ] Service Role Key
- [ ] データベーススキーマ実行完了

### GAS関連
- [ ] WebアプリURL
- [ ] スクリプトプロパティ設定完了
- [ ] 管理者アカウント設定完了

### PWA関連
- [ ] `js/config.js` 更新完了
- [ ] `js/firebase-config.js` 更新完了

---

## ⚠️ セキュリティ注意事項

### 1. 本番環境での設定
- `DEBUG_MODE` を `false` に設定
- 管理者パスワードを強力なものに変更
- Service Role キーは絶対に公開しない

### 2. API キーの管理
- Anon Key は公開されても問題ないが、Service Role Key は秘匿情報
- Firebase Server Key も秘匿情報として管理

### 3. 定期メンテナンス
- 古いデバイス登録の定期クリーンアップ
- 通知配信ログの定期削除
- セキュリティアップデートの適用

---

## 🆘 トラブルシューティング

### 通知が届かない場合
1. FCMトークンの有効性確認
2. Firebase プロジェクト設定の確認
3. GAS実行ログの確認
4. ブラウザの通知許可状況確認

### 管理画面にログインできない場合
1. GAS WebアプリのURL確認
2. スクリプトプロパティの設定確認
3. 管理者アカウントの設定確認

### データベース接続エラーの場合
1. Supabase Project URLの確認
2. API キーの確認
3. RLS（Row Level Security）ポリシーの確認

---

## 📞 サポート

設定で困った場合は、以下の情報を含めてお問い合わせください：
- エラーメッセージ
- ブラウザの開発者ツールのConsoleログ
- GASの実行ログ
- 設定した値（秘匿情報は除く）

設定完了後は、強力で柔軟な学生ポータルシステムをお楽しみください！
