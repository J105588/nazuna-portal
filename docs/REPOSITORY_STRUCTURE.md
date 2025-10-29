# リポジトリ構成案

## 提案する新しい構成

```
nazuna-portal/
├── pages/                    # ページファイル
│   ├── index.html           # ホームページ
│   ├── council.html         # 生徒会紹介
│   ├── province.html        # 部活動
│   ├── forum.html           # フォーラム
│   ├── news.html            # お知らせ
│   ├── survey.html          # アンケート
│   ├── member-detail.html   # メンバー詳細
│   ├── admin.html           # 管理画面
│   └── admin-simple.html    # シンプル管理画面
│
├── assets/                  # 静的ファイル
│   ├── css/
│   │   ├── style.css        # メインスタイル
│   │   ├── admin.css        # 管理画面スタイル
│   │   └── style-optimized.css
│   │
│   ├── js/
│   │   ├── core/            # コア機能
│   │   │   ├── config.js
│   │   │   ├── app.js
│   │   │   └── api-client.js
│   │   │
│   │   ├── features/        # 機能別モジュール
│   │   │   ├── news-loader.js
│   │   │   ├── member-detail.js
│   │   │   ├── forum-manager.js
│   │   │   └── survey-manager.js
│   │   │
│   │   ├── admin/           # 管理機能
│   │   │   └── admin.js
│   │   │
│   │   ├── pwa/             # PWA機能
│   │   │   ├── pwa-install.js
│   │   │   └── pwa-update.js
│   │   │
│   │   ├── notifications/   # 通知機能
│   │   │   ├── firebase-config.js
│   │   │   ├── notification-manager.js
│   │   │   └── simple-notification-manager.js
│   │   │
│   │   ├── database/        # データベース関連
│   │   │   ├── supabase-queries.js
│   │   │   └── supabase-queries-optimized.js
│   │   │
│   │   └── utils/           # ユーティリティ
│   │       ├── cache-manager.js
│   │       └── performance-tester.js
│   │
│   └── images/
│       ├── icon.png
│       ├── icon-*.png
│       └── badge-*.png
│
├── database/                # データベースファイル
│   ├── nazuna.sql           # 基本スキーマ
│   └── nazuna-db-v2.sql     # v2.0（承認機能対応）
│
├── backend/                 # バックエンド（GAS）
│   ├── gas-sample.gs        # Google Apps Script
│   └── backend-config.js    # バックエンド設定
│
├── docs/                    # ドキュメント
│   ├── README.md            # メインREADME
│   ├── SETUP_GUIDE.md       # セットアップガイド
│   ├── INTEGRATION_GUIDE.md # 統合ガイド
│   ├── ADMIN_PANEL_FINAL.md # 管理画面ガイド
│   ├── DB_ADMIN_REDESIGN_SUMMARY.md # DB再設計まとめ
│   ├── NOTIFICATION_SYSTEM_REDESIGN.md
│   ├── SIMPLE_NOTIFICATION_SYSTEM.md
│   └── OPTIMIZATION_GUIDE.md
│
├── news/                    # ニュース記事
│   ├── index.json
│   └── 2024-*.html
│
├── public/                  # 公開ファイル
│   └── firebase-messaging-sw.js
│
├── service-workers/         # Service Workers
│   ├── sw.js               # メインSW
│   ├── sw-optimized.js     # 最適化版
│   └── sw-simple.js        # シンプル版
│
└── config/                  # 設定ファイル
    ├── manifest.json
    ├── browserconfig.xml
    ├── CNAME
    ├── favicon.ico
    └── .gitignore
```

## 現在の整理方針

段階的に整理するために、まず以下を実行:

1. **保留ファイルの整理**
   - `*-optimized.*` → `archive/` に移動
   - `*-simple.*` → `archive/` に移動
   - `*-fixed.*` → `archive/` に移動

2. **ドキュメントの整理**
   - すべての `*.md` ファイルを `docs/` に移動

3. **SQLファイルの整理**
   - `nazuna.sql`, `nazuna-db-v2.sql` を `database/` に移動

4. **GASファイルの整理**
   - `gas-sample.gs` を `backend/` に移動

## 注意事項

- 既存の相対パスを維持する
- 段階的に移動を実行
- バックアップを推奨

