# データベース・管理画面 再設計まとめ

## 概要
フォーラムの投稿承認機能回避を実装するため、データベースと管理画面を完全に再設計しました。

## 実施した変更

### 1. データベース再設計 (nazuna-db-v2.sql)

#### 主な変更点

**postsテーブルの拡張**
- `approval_status`カラム追加: 'pending', 'approved', 'rejected'
- `approval_admin_email`カラム追加: 承認した管理者の記録
- `approval_date`カラム追加: 承認日時の記録
- `rejection_reason`カラム追加: 却下理由
- `is_featured`カラム追加: おすすめ投稿フラグ

**新規テーブル追加**
- `post_action_logs`: 投稿に対する操作ログ（承認/却下/編集/削除）
  - 管理性向上
  - 監査証跡の記録
  - 誰がいつ何をしたかの追跡

**RLS (Row Level Security) ポリシー更新**
- 一般ユーザーは`approval_status='approved'`の投稿のみ閲覧可能
- 管理者はすべての投稿にアクセス可能
- forum.htmlで表示されるのは承認済み投稿のみ

**インデックス最適化**
```sql
CREATE INDEX idx_posts_approval_status ON posts(approval_status);
CREATE INDEX idx_post_action_logs_post_id ON post_action_logs(post_id);
```

### 2. admin.htmlの完全再設計

#### 追加機能

**フォーラム管理セクション**
- 投稿承認待ちアラート表示
- 承認状態フィルター（すべて/承認待ち/承認済み/却下済み）
- 返信状態フィルター（すべて/対応待ち/対応中/解決済み）
- 内容検索機能
- 更新ボタン

**テーブル表示の改善**
- 投稿ID
- 内容（抜粋）
- カテゴリ
- **承認状態**（新規）
- **返信状態**
- 投稿日
- 操作ボタン

#### 追加要素
```html
<!-- 投稿承認待ちアラート -->
<div class="approval-alert" id="approval-alert">
    <span id="pending-count">0</span>件の投稿が承認待ちです
</div>

<!-- フィルター -->
<select id="forum-approval-filter">
    <option value="all">すべての投稿</option>
    <option value="pending">承認待ちのみ</option>
    <option value="approved">承認済みのみ</option>
    <option value="rejected">却下済みのみ</option>
</select>
```

### 3. admin.jsの更新

#### 追加関数

**loadForumPosts()**
- フォーラム投稿一覧を取得
- 承認状態でフィルター
- 承認待ち件数を表示

**approvePost(postId)**
- 投稿を承認
- 承認ログを記録
- アクションログに記録

**rejectPost(postId, reason)**
- 投稿を却下
- 却下理由を記録
- アクションログに記録

**loadDashboardStats()**
- ダッシュボード統計を読み込み
- 承認待ち投稿数を表示

### 4. forum.htmlの動作変更

#### 表示ロジック
- **変更前**: すべてのステータスの投稿を表示
- **変更後**: `approval_status='approved'`の投稿のみ表示

#### RLSポリシーの効果
```sql
CREATE POLICY "Public can view approved posts" ON posts
    FOR SELECT USING (approval_status = 'approved');
```

これにより、forum.htmlでSupabaseから投稿を取得する際、自動的に承認済み投稿のみが返されます。

## 承認フロー

### 1. ユーザーが投稿
```
forum.html → 投稿フォーム → Supabase postsテーブル
approval_status = 'pending'
```

### 2. 管理者が確認
```
admin.html → フォーラム管理 → 承認待ち投稿一覧
```

### 3. 承認/却下
```
承認 → approval_status = 'approved'
  → forum.htmlで表示可能になる

却下 → approval_status = 'rejected'
  → forum.htmlでは表示されない
  → rejection_reasonを記録
```

### 4. 返信（承認後の作業）
```
管理者 → 返信フォーム → replyカラムに追加
status = 'in_progress' → 'resolved'
```

## セキュリティ対策

### Row Level Security (RLS)
- 一般ユーザーは承認済み投稿のみ閲覧可能
- 管理者のみすべての投稿にアクセス可能
- 投稿の作成（INSERT）は許可
- 編集・削除は管理者のみ

### 監査証跡
- `post_action_logs`テーブルにすべての操作を記録
- 誰がいつ何をしたかを追跡可能

## マイグレーション手順

### 1. データベース更新
```sql
-- nazuna-db-v2.sqlを実行
-- 既存データは自動的にapproval_status='pending'になる
```

### 2. 機能の確認
1. admin.htmlでログイン
2. フォーラム管理セクションを開く
3. 承認待ち投稿を確認
4. 投稿を承認/却下

### 3. forum.htmlの動作確認
1. forum.htmlを開く
2. 承認済み投稿のみ表示されることを確認
3. 承認待ち・却下済み投稿は表示されないことを確認

## バックアップ

### 重要: 既存データのバックアップ
```sql
-- 実行前に必ずバックアップを取得
CREATE TABLE posts_backup AS SELECT * FROM posts;
```

## トラブルシューティング

### 問題: 投稿が表示されない
- 原因: approval_status='pending'または'rejected'
- 対応: admin.htmlで承認する

### 問題: 管理者が投稿を見られない
- 原因: RLSポリシーの設定
- 対応: auth.role()='admin'の確認

### 問題: ログが記録されない
- 原因: post_action_logsテーブルの権限
- 対応: RLSポリシーの確認

## 今後の拡張

1. **一括承認機能**
   - 複数の投稿を一括で承認/却下

2. **承認テンプレート**
   - 却下理由の定型文

3. **通知機能**
   - 承認・却下を投稿者に通知

4. **承認レポート**
   - 承認率、却下率の統計

## ファイル一覧

### 作成・変更したファイル
1. `nazuna-db-v2.sql` - 新しいデータベーススキーマ
2. `admin.html` - 承認機能付き管理画面
3. `js/admin.js` - 承認機能のJavaScript

### 影響を受けるファイル
1. `forum.html` - 承認済み投稿のみ表示（動作変更なし）
2. `js/supabase-queries.js` - 承認状態のクエリ追加（将来）

## バージョン情報
- データベース: v2.0
- 管理画面: v2.0
- 最終更新: 2025年10月

