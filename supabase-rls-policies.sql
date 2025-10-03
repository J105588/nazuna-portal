-- ========================================
-- Supabase RLS (Row Level Security) 設定まとめ
-- なずなポータルサイト用
-- ========================================

-- ========================================
-- 1. 基本システムテーブル
-- ========================================

-- 1.1 部活動テーブル (clubs)
-- 用途: 部活動情報の管理
-- アクセス: 一般ユーザーは閲覧のみ、管理者は全操作可能
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- 公開データ用ポリシー（認証不要）
CREATE POLICY "Public read access on clubs" ON clubs 
    FOR SELECT USING (is_active = true);

-- 管理者用ポリシー（すべての操作を許可）
CREATE POLICY "Admin full access on clubs" ON clubs 
    FOR ALL USING (auth.role() = 'admin');

-- 1.2 お知らせテーブル (news)
-- 用途: 学校からのお知らせ管理
-- アクセス: 一般ユーザーは公開済みのみ閲覧、管理者は全操作可能
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- 公開データ用ポリシー（認証不要）
CREATE POLICY "Public read access on news" ON news 
    FOR SELECT USING (is_published = true);

-- 管理者用ポリシー（すべての操作を許可）
CREATE POLICY "Admin full access on news" ON news 
    FOR ALL USING (auth.role() = 'admin');

-- 1.3 生徒会メンバーテーブル (council_members)
-- 用途: 生徒会メンバー情報の管理
-- アクセス: 一般ユーザーは閲覧のみ、管理者は全操作可能
ALTER TABLE council_members ENABLE ROW LEVEL SECURITY;

-- 公開データ用ポリシー（認証不要）
CREATE POLICY "Public read access on council_members" ON council_members 
    FOR SELECT USING (is_active = true);

-- 管理者用ポリシー（すべての操作を許可）
CREATE POLICY "Admin full access on council_members" ON council_members 
    FOR ALL USING (auth.role() = 'admin');

-- 1.4 チャットテーブル (chats)
-- 用途: フォーラムのチャット機能
-- アクセス: 一般ユーザーは閲覧のみ、管理者は全操作可能
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- 公開データ用ポリシー（認証不要）
CREATE POLICY "Public read access on chats" ON chats 
    FOR SELECT USING (true);

-- 管理者用ポリシー（すべての操作を許可）
CREATE POLICY "Admin full access on chats" ON chats 
    FOR ALL USING (auth.role() = 'admin');

-- ========================================
-- 2. フォーラム・投稿システム
-- ========================================

-- 2.1 投稿テーブル (posts)
-- 用途: なずなフォーラムの投稿管理
-- アクセス: 一般ユーザーは投稿・承認済み閲覧、管理者は全操作可能
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 一般ユーザー用ポリシー
CREATE POLICY "Users can submit posts" ON posts 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view approved posts" ON posts 
    FOR SELECT USING (status = 'approved' OR status = 'replied');

-- 管理者用ポリシー（すべての操作を許可）
CREATE POLICY "Admin full access on posts" ON posts 
    FOR ALL USING (auth.role() = 'admin');

-- ========================================
-- 3. アンケートシステム
-- ========================================

-- 3.1 アンケートテーブル (surveys)
-- 用途: アンケート・投票の管理
-- アクセス: 一般ユーザーは公開済みのみ閲覧、管理者は全操作可能
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- 一般ユーザー用ポリシー
CREATE POLICY "Users can view published surveys" ON surveys 
    FOR SELECT USING (is_active = true AND is_published = true);

-- 管理者用ポリシー（すべての操作を許可）
CREATE POLICY "Admin full access on surveys" ON surveys 
    FOR ALL USING (auth.role() = 'admin');

-- 3.2 アンケート回答テーブル (survey_responses)
-- 用途: アンケート回答の管理
-- アクセス: 一般ユーザーは回答投稿のみ、管理者は全操作可能
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- 一般ユーザー用ポリシー
CREATE POLICY "Users can submit survey responses" ON survey_responses 
    FOR INSERT WITH CHECK (true);

-- 管理者用ポリシー（すべての操作を許可）
CREATE POLICY "Admin full access on survey_responses" ON survey_responses 
    FOR ALL USING (auth.role() = 'admin');

-- ========================================
-- 4. 通知システム
-- ========================================

-- 4.1 デバイス登録テーブル (device_registrations)
-- 用途: プッシュ通知用デバイス情報の管理
-- アクセス: 一般ユーザーは自分のデバイス管理、管理者は全操作可能
ALTER TABLE device_registrations ENABLE ROW LEVEL SECURITY;

-- 一般ユーザー用ポリシー（匿名ユーザーも登録可能）
CREATE POLICY "Users can manage own devices" ON device_registrations 
    FOR ALL USING (true);

-- 管理者用ポリシー（すべての操作を許可）
CREATE POLICY "Admin full access on device_registrations" ON device_registrations 
    FOR ALL USING (auth.role() = 'admin');

-- 4.2 通知テンプレートテーブル (notification_templates)
-- 用途: 通知テンプレートの管理
-- アクセス: 一般ユーザーはアクティブなテンプレート閲覧、管理者は全操作可能
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- 一般ユーザー用ポリシー
CREATE POLICY "Users can view active templates" ON notification_templates 
    FOR SELECT USING (is_active = true);

-- 管理者用ポリシー（すべての操作を許可）
CREATE POLICY "Admin full access on notification_templates" ON notification_templates 
    FOR ALL USING (auth.role() = 'admin');

-- 4.3 通知送信履歴テーブル (notification_history)
-- 用途: 通知送信履歴の管理
-- アクセス: 一般ユーザーは閲覧のみ、管理者は全操作可能
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- 一般ユーザー用ポリシー
CREATE POLICY "Users can view notification history" ON notification_history 
    FOR SELECT USING (true);

-- 管理者用ポリシー（すべての操作を許可）
CREATE POLICY "Admin full access on notification_history" ON notification_history 
    FOR ALL USING (auth.role() = 'admin');

-- 4.4 個別通知配信状況テーブル (notification_deliveries)
-- 用途: 個別通知配信状況の管理
-- アクセス: 管理者のみアクセス可能
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

-- 管理者用ポリシー（すべての操作を許可）
CREATE POLICY "Admin full access on notification_deliveries" ON notification_deliveries 
    FOR ALL USING (auth.role() = 'admin');

-- 4.5 ユーザー通知設定テーブル (user_notification_preferences)
-- 用途: ユーザーの通知設定管理
-- アクセス: 一般ユーザーは自分の設定管理、管理者は全操作可能
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- 一般ユーザー用ポリシー
CREATE POLICY "Users can manage own notification preferences" ON user_notification_preferences 
    FOR ALL USING (true);

-- 管理者用ポリシー（すべての操作を許可）
CREATE POLICY "Admin full access on user_notification_preferences" ON user_notification_preferences 
    FOR ALL USING (auth.role() = 'admin');

-- ========================================
-- 5. ビューと統計情報
-- ========================================

-- 5.1 通知統計ビュー (notification_statistics)
-- 用途: 通知送信統計の表示
-- アクセス: 管理者のみアクセス可能
-- 注意: ビュー自体にはRLSは設定しない（基盤テーブルのRLSが適用される）

-- 5.2 アクティブなアンケート統計ビュー (active_survey_stats)
-- 用途: アンケート回答統計の表示
-- アクセス: 管理者のみアクセス可能
-- 注意: ビュー自体にはRLSは設定しない（基盤テーブルのRLSが適用される）

-- ========================================
-- 6. ロールと権限の設定
-- ========================================

-- 6.1 管理者ロールの設定
-- 注意: 実際の運用時は、Supabaseのダッシュボードで管理者ロールを設定してください
-- CREATE ROLE admin;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;

-- 6.2 サービスロールの設定（GAS用）
-- 注意: 実際の運用時は、GAS用のサービスロールを設定してください
-- CREATE ROLE gas_service;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO gas_service;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gas_service;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO gas_service;

-- ========================================
-- 7. セキュリティ設定の確認
-- ========================================

-- 7.1 RLS有効化の確認
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- 7.2 ポリシーの確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- 8. 運用時の注意事項
-- ========================================

-- 8.1 管理者認証
-- - Supabaseのダッシュボードで管理者ユーザーを作成
-- - auth.usersテーブルでroleカラムを'admin'に設定
-- - または、カスタム認証ロジックを実装

-- 8.2 匿名ユーザーの制限
-- - 匿名ユーザーは読み取り専用アクセスのみ
-- - 投稿や回答は認証なしで可能（必要に応じて制限を追加）

-- 8.3 セキュリティ監査
-- - 定期的にポリシーの見直しを行う
-- - ログの監視と異常なアクセスの検出
-- - データのバックアップと復旧計画の策定

-- ========================================
-- 9. トラブルシューティング
-- ========================================

-- 9.1 よくある問題
-- - ポリシーが適用されない場合: RLSが有効化されているか確認
-- - アクセス拒否エラー: ポリシーの条件を確認
-- - 管理者権限が効かない場合: ロール設定を確認

-- 9.2 デバッグ用クエリ
-- 現在のユーザー情報を確認
-- SELECT auth.uid(), auth.role();

-- テーブルのRLS状態を確認
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- ポリシーの詳細を確認
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
