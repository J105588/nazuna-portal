# Supabase CORS エラー解決ガイド

## 問題の概要
以下のエラーが発生しています：
- `Access to fetch at 'https://jirppalacwwinwnsyauo.supabase.co/...' has been blocked by CORS policy`
- `GET https://jirppalacwwinwnsyauo.supabase.co/... net::ERR_FAILED 410 (Gone)`

## 原因
1. **古いSupabaseプロジェクトURL**: エラーメッセージに表示されている `jirppalacwwinwnsyauo.supabase.co` は削除されたか利用できないプロジェクトです
2. **ブラウザキャッシュ**: 古いURLがブラウザのキャッシュに残っている可能性があります
3. **CORS設定**: SupabaseプロジェクトのCORS設定が適切でない可能性があります

## 解決方法

### 1. 自動解決（推奨）
ページをリロードしてください。新しいコードが自動的にキャッシュをクリアし、正しいSupabase URLを使用します。

### 2. 手動キャッシュクリア
ブラウザの開発者ツール（F12）を開き、コンソールで以下を実行：

```javascript
// Supabaseキャッシュをクリアして再初期化
clearSupabaseCacheAndReinit();
```

### 3. ブラウザキャッシュクリア
1. **Chrome/Edge**: Ctrl+Shift+Delete → 「キャッシュされた画像とファイル」を選択 → 削除
2. **Firefox**: Ctrl+Shift+Delete → 「キャッシュ」を選択 → 今すぐ消去
3. **Safari**: Cmd+Option+E → キャッシュを空にする

### 4. デバッグツールの使用
`debug-supabase.html` ファイルを開いて、以下の操作を実行：
- 接続テストを実行
- Supabaseキャッシュをクリア
- Supabaseを再初期化

### 5. ハードリフレッシュ
- **Windows**: Ctrl+F5 または Ctrl+Shift+R
- **Mac**: Cmd+Shift+R

## 現在の設定
正しいSupabase設定は以下の通りです：
- **URL**: `https://jffjacpedwldbgmggdcy.supabase.co`
- **ANON_KEY**: 設定済み（config.jsで確認可能）

## 管理者認証情報
- **メールアドレス**: `admin@nazuna-portal.com`
- **パスワード**: `Nazuna-portal@igsc`
- **ハッシュ**: `bd61359f215d97e146dec8928131df490382cea699abd2aacf50be0d3ae5d589` (ブラウザ互換)

## 追加のトラブルシューティング

### Supabaseプロジェクトの確認
1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクト `jffjacpedwldbgmggdcy` が存在することを確認
3. プロジェクトがアクティブであることを確認

### CORS設定の確認
Supabaseプロジェクトで以下を確認：
1. **Authentication** → **Settings** → **Site URL** に `http://127.0.0.1:5500` を追加
2. **Authentication** → **Settings** → **Redirect URLs** に `http://127.0.0.1:5500` を追加

### ネットワーク設定の確認
1. ファイアウォールがSupabaseへの接続をブロックしていないか確認
2. プロキシ設定が正しいか確認
3. DNS設定が正しいか確認

## 連絡先
問題が解決しない場合は、以下の情報と共に管理者に連絡してください：
- ブラウザの種類とバージョン
- エラーメッセージの全文
- 実行した解決手順
- デバッグツールの結果
