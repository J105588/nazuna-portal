
# なずなポータルサイト

### みんなでつくる学校生活をサポートするなずなポータルサイトです。

## 🚀 機能

- **生徒会紹介**: メンバー紹介と活動内容
- **部活動紹介**: 各部活動の詳細情報とフィルタリング機能
- **なずなフォーラム**: 匿名での意見投稿と生徒会からの返信
- **お知らせ**: 学校行事や重要な情報の配信
- **アンケート・投票**: 生徒の意見収集
- **PWA対応**: スマートフォンにアプリとしてインストール可能
- **サイドバーナビゲーション**: オーバーレイ式の美しいサイドバー
- **オープニング画面**: アニメーション付きのローディング画面
- **Supabase統合**: リアルタイムデータベース対応

## 📁 ファイル構成

```
homepage/
├── index.html          # ホームページ
├── council.html        # 生徒会紹介
├── clubs.html          # 部活動紹介
├── forum.html          # なずなフォーラム
├── news.html           # お知らせ
├── survey.html         # アンケート・投票
├── css/
│   └── style.css       # スタイルシート
├── js/
│   ├── config.js       # 設定ファイル
│   └── app.js          # メインJavaScript
├── manifest.json       # PWAマニフェスト
├── sw.js              # Service Worker
├── gas-sample.js      # GAS連携サンプルコード
└── README.md          # このファイル
```

## ⚙️ セットアップ

### 1. Supabaseの設定（推奨）

1. [Supabase](https://supabase.com/) にアクセスしてアカウントを作成
2. 新しいプロジェクトを作成
3. データベースに以下のテーブルを作成：

```sql
-- 部活動テーブル
CREATE TABLE clubs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    members INTEGER,
    schedule VARCHAR(255),
    image_url VARCHAR(255),
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- お知らせテーブル
CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT NOW()
);

-- フォーラム投稿テーブル
CREATE TABLE forum_posts (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    reply TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

4. Settings > API からプロジェクトURLとAnonキーを取得

### 2. 設定ファイルの更新

`js/config.js` を編集：

```javascript
const CONFIG = {
    // Supabase設定
    SUPABASE: {
        URL: 'YOUR_SUPABASE_URL_HERE',
        ANON_KEY: 'YOUR_SUPABASE_ANON_KEY_HERE'
    },
    
    // その他の設定は必要に応じて調整
    // ...
};
```

### 3. Google Apps Script (GAS) の設定（オプション）

1. [Google Apps Script](https://script.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. `gas-sample.js` の内容をコピー&ペースト
4. スプレッドシートを作成し、IDを取得
5. `SPREADSHEET_ID` を実際のIDに変更
6. `initializeSpreadsheet()` 関数を実行してシートを初期化
7. WebAppとしてデプロイ
8. デプロイURLを取得

### 4. PWA用アイコンの準備

`images/` フォルダに以下のサイズのアイコンを配置：
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## ✨ 新機能

### サイドバーナビゲーション
- オーバーレイ式の美しいサイドバー
- スムーズなアニメーション
- レスポンシブ対応（モバイル・デスクトップ）
- ESCキーで閉じる機能

### オープニング画面
- アニメーション付きのローディング画面
- ブランドロゴとメッセージ表示
- 2秒後に自動的にメインコンテンツを表示

### Supabase統合
- リアルタイムデータベース対応
- 自動的なデータ同期
- データがない場合の「まだ情報はありません」表示
- フォールバック機能（Supabaseが利用できない場合はデモデータを表示）

## 🔧 カスタマイズ

### 色とテーマの変更

`css/style.css` の CSS変数を編集：

```css
:root {
    --primary-color: #2c3e50;      /* メインカラー */
    --secondary-color: #3498db;    /* アクセントカラー */
    --accent-color: #e74c3c;       /* 強調カラー */
    /* ... */
}
```

### カテゴリの追加・変更

`js/config.js` の `CATEGORIES` オブジェクトを編集：

```javascript
CATEGORIES: {
    CLUBS: {
        'sports': '運動部',
        'culture': '文化部',
        'academic': '学術部',
        'music': '音楽部',
        'volunteer': 'ボランティア'
    },
    // ...
}
```

### メッセージの変更

`js/config.js` の `MESSAGES` オブジェクトを編集：

```javascript
MESSAGES: {
    SUCCESS: {
        POST_SUBMITTED: '投稿が完了しました！',
        // ...
    },
    // ...
}
```

## 📱 PWA機能

このサイトはPWA（Progressive Web App）として動作します：

- **オフライン対応**: Service Workerによるキャッシュ
- **インストール可能**: ホーム画面に追加可能
- **プッシュ通知**: 重要なお知らせの通知

## 🔒 セキュリティ

- 投稿は匿名で処理されます
- 不適切な投稿は管理者が削除できます
- XSS対策のためHTMLエスケープを実装

## 🚀 デプロイ

### GitHub Pages
1. GitHubリポジトリにプッシュ
2. Settings > Pages でデプロイ設定
3. GAS URLを本番環境用に更新

### その他のホスティング
- Netlify
- Vercel
- Firebase Hosting

## 🛠️ 開発

### ローカル開発
```bash
# 簡易サーバーの起動（Python）
python -m http.server 8000

# または Node.js
npx http-server
```

### デバッグモード
`js/config.js` でデバッグモードを有効化：

```javascript
APP: {
    DEBUG: true,  // デバッグ情報をコンソールに出力
    // ...
}
```

### 使用方法

1. **サイドバー**: ハンバーガーメニュー（☰）をクリックしてサイドバーを開く
2. **オープニング**: 初回アクセス時にオープニング画面が表示される
3. **データ管理**: Supabaseダッシュボードからデータの追加・編集が可能
4. **フォールバック**: Supabaseが設定されていない場合はデモデータを表示

## 📞 サポート

問題や質問がある場合は、生徒会室までお越しください。

平日 12:30-13:00

---

© 2024 生徒会. All rights reserved.
```
