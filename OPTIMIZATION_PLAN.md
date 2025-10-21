# ファイル統合・最適化計画

## 📊 現在の状況分析

### 重複・冗長ファイル
1. **PWA関連**: `pwa-update.js` + `pwa-update-v2.js`, `pwa-install.js` + `pwa-install-v2.js`
2. **設定ファイル**: `config.js` + `config-optimized.js`
3. **アプリケーション**: `app.js` + `app-optimized.js`
4. **Supabase**: `supabase-queries.js` + `supabase-queries-optimized.js`
5. **Service Worker**: `sw.js` + `sw-optimized.js` + `sw-v2.js`
6. **通知システム**: `notification-manager.js` + `simple-notification-manager.js`
7. **メンバー詳細**: `member-detail.js` + `member-detail-fixed.js`

### 統合戦略

## 🎯 統合計画

### 1. コアシステム統合
- **メインアプリ**: `app.js` + `app-optimized.js` → `app-unified.js`
- **設定管理**: `config.js` + `config-optimized.js` → `config-unified.js`
- **データベース**: `supabase-queries.js` + `supabase-queries-optimized.js` → `supabase-unified.js`

### 2. PWAシステム統合
- **PWA管理**: `pwa-update-v2.js` + `pwa-install-v2.js` + `pwa-manager-v2.js` → `pwa-unified.js`
- **Service Worker**: `sw-v2.js` → `sw-unified.js`

### 3. 通知システム統合
- **通知管理**: `notification-manager.js` + `simple-notification-manager.js` → `notification-unified.js`

### 4. 削除対象ファイル
- 古いバージョン（v1.0系）
- 最適化版（統合版に機能をマージ）
- 重複機能ファイル

## 📁 最終ファイル構成

### コアファイル（必須）
```
js/
├── app-unified.js          # 統合アプリケーション
├── config-unified.js       # 統合設定管理
├── supabase-unified.js     # 統合データベース
├── pwa-unified.js          # 統合PWA管理
├── notification-unified.js  # 統合通知管理
├── admin.js                # 管理画面（独立）
└── news-loader.js          # ニュースローダー（独立）
```

### Service Worker
```
sw-unified.js               # 統合Service Worker
```

### HTMLファイル
```
index.html                  # メインページ
admin.html                  # 管理画面
その他のページ              # 個別ページ
```

## 🔧 統合手順

1. **機能分析**: 各ファイルの機能を詳細分析
2. **統合実装**: 最適化された統合ファイルを作成
3. **依存関係解決**: ファイル間の依存関係を整理
4. **テスト**: 統合後の動作確認
5. **削除**: 不要ファイルの削除
6. **ドキュメント更新**: 統合後の構成を文書化
