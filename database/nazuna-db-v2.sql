-- ========================================
-- なずなポータル データベース v2.0
-- フォーラム承認機能対応版
-- ========================================

-- 既存のテーブルをバックアップして新規作成
-- 注意: 本番環境では既存データをバックアップしてから実行してください

-- ========================================
-- 1. フォーラム投稿テーブル（改良版）
-- ========================================

-- 既存のpostsテーブルに列を追加（新しいデータベースでは最初から作成）
DROP TABLE IF EXISTS posts CASCADE;

CREATE TABLE posts (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    content TEXT NOT NULL,
    
    -- 承認ステータス
    approval_status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
    approval_admin_email VARCHAR(200),
    approval_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- 従来のステータス（返信管理用）
    status VARCHAR(20) DEFAULT 'pending',  -- pending, in_progress, resolved, closed
    
    -- その他
    reply TEXT,
    category VARCHAR(50) DEFAULT 'general',
    priority INTEGER DEFAULT 0,
    student_number VARCHAR(50),
    is_featured BOOLEAN DEFAULT false,  -- おすすめ投稿フラグ
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    replied_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_posts_approval_status ON posts(approval_status);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_student_number ON posts(student_number);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(is_featured) WHERE is_featured = true;

-- ========================================
-- 2. 投稿アクションログテーブル（新規追加）
-- ========================================

CREATE TABLE IF NOT EXISTS post_action_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id VARCHAR(50) REFERENCES posts(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,  -- approve, reject, edit, delete
    admin_email VARCHAR(200) NOT NULL,
    admin_name VARCHAR(100),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_action_logs_post_id ON post_action_logs(post_id);
CREATE INDEX IF NOT EXISTS idx_post_action_logs_created_at ON post_action_logs(created_at DESC);

-- ========================================
-- 3. チャットテーブル（既存）
-- ========================================

CREATE TABLE IF NOT EXISTS chats (
    id SERIAL PRIMARY KEY,
    post_id VARCHAR(50) REFERENCES posts(id) ON DELETE CASCADE,
    sender VARCHAR(50),
    message TEXT,
    is_admin BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_post_id ON chats(post_id);
CREATE INDEX IF NOT EXISTS idx_chats_sent_at ON chats(sent_at DESC);

-- ========================================
-- 4. お知らせテーブル（既存・保持）
-- ========================================

CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    summary TEXT,
    date DATE DEFAULT CURRENT_DATE,
    type VARCHAR(50) DEFAULT 'general',
    priority INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    author VARCHAR(100),
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_published ON news(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_news_date ON news(date DESC);
CREATE INDEX IF NOT EXISTS idx_news_type ON news(type);

-- ========================================
-- 5. 部活動テーブル（既存・保持）
-- ========================================

CREATE TABLE IF NOT EXISTS clubs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    members INTEGER DEFAULT 0,
    schedule VARCHAR(200),
    category VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clubs_active ON clubs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clubs_category ON clubs(category);

-- ========================================
-- 6. アンケートテーブル（既存・保持）
-- ========================================

CREATE TABLE IF NOT EXISTS surveys (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    questions JSONB,
    settings JSONB,
    is_active BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT false,
    max_responses INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveys_active ON surveys(is_active, is_published) WHERE is_active = true AND is_published = true;

-- ========================================
-- 7. 生徒会メンバーテーブル（既存・保持）
-- ========================================

CREATE TABLE IF NOT EXISTS council_members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(100) NOT NULL,
    grade VARCHAR(20),
    message TEXT,
    bio TEXT,
    image_url VARCHAR(500),
    email VARCHAR(200),
    responsibilities TEXT[],
    achievements TEXT[],
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_council_members_active ON council_members(is_active, display_order) WHERE is_active = true;

-- ========================================
-- 8. 活動実績テーブル（既存・保持）
-- ========================================

CREATE TABLE IF NOT EXISTS member_achievements (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES council_members(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    achievement_year INTEGER NOT NULL,
    achievement_month INTEGER NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    priority INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_achievements_member_id ON member_achievements(member_id);
CREATE INDEX IF NOT EXISTS idx_member_achievements_public ON member_achievements(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_member_achievements_year_month ON member_achievements(achievement_year DESC, achievement_month DESC);

-- ========================================
-- 9. 学生アカウントテーブル（既存・保持）
-- ========================================

CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    student_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 10. 通知システムテーブル（既存・保持）
-- ========================================

CREATE TABLE IF NOT EXISTS device_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fcm_token TEXT UNIQUE NOT NULL,
    user_agent TEXT,
    platform VARCHAR(50) DEFAULT 'web',
    browser VARCHAR(100),
    device_info JSONB,
    user_info JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_registrations_fcm_token ON device_registrations(fcm_token);
CREATE INDEX IF NOT EXISTS idx_device_registrations_active ON device_registrations(is_active) WHERE is_active = true;

-- ========================================
-- 11. Row Level Security (RLS) ポリシー設定
-- ========================================
-- 注意: Service Keyでアクセスする場合はRLSをバイパスします
-- Anon KeyでのみRLSが適用されます

-- postsテーブル
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON posts;
CREATE POLICY "Allow all for anon" ON posts AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

-- post_action_logsテーブル（管理者のみ閲覧可能）
ALTER TABLE post_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON post_action_logs;
CREATE POLICY "Allow all for anon" ON post_action_logs AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

-- chatsテーブル
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON chats;
CREATE POLICY "Allow all for anon" ON chats AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

-- studentsテーブル（認証用）
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON students;
CREATE POLICY "Allow all for anon" ON students AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

-- newsテーブル
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public to view published news" ON news;
CREATE POLICY "Allow public to view published news" ON news
    FOR SELECT USING (is_published = true);

-- clubsテーブル
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public to view active clubs" ON clubs;
CREATE POLICY "Allow public to view active clubs" ON clubs
    FOR SELECT USING (is_active = true);

-- surveysテーブル
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public to view published surveys" ON surveys;
CREATE POLICY "Allow public to view published surveys" ON surveys
    FOR SELECT USING (is_active = true AND is_published = true);

-- council_membersテーブル
ALTER TABLE council_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public to view active members" ON council_members;
CREATE POLICY "Allow public to view active members" ON council_members
    FOR SELECT USING (is_active = true);

-- member_achievementsテーブル
ALTER TABLE member_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public to view public achievements" ON member_achievements;
CREATE POLICY "Allow public to view public achievements" ON member_achievements
    FOR SELECT USING (is_public = true);

-- device_registrationsテーブル（通知システム用）
ALTER TABLE device_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON device_registrations;
CREATE POLICY "Allow all for anon" ON device_registrations AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- 12. 更新トリガー
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_posts_updated_at 
    BEFORE UPDATE ON posts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 13. ビュー作成
-- ========================================

-- 承認済み投稿の統計ビュー
CREATE OR REPLACE VIEW approved_posts_stats AS
SELECT 
    COUNT(*) as total_approved,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reply,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
    COUNT(CASE WHEN is_featured = true THEN 1 END) as featured
FROM posts
WHERE approval_status = 'approved';

-- 管理者用の全投稿ビュー
CREATE OR REPLACE VIEW admin_all_posts AS
SELECT 
    p.*,
    COUNT(c.id) as chat_count
FROM posts p
LEFT JOIN chats c ON p.id = c.post_id
GROUP BY p.id
ORDER BY p.created_at DESC;

-- ========================================
-- 14. 初期データ（テスト用）
-- ========================================

-- サンプル投稿データ（必要に応じて）
INSERT INTO posts (content, approval_status, category, status) VALUES
('図書室の開館時間を延長してほしいです。現在は放課後しか開いていませんが、朝の時間にも開館していただけると助かります。', 'approved', 'suggestion', 'pending'),
('体育祭の種目について提案があります。みんなで楽しめる障害物競走を追加してほしいです。', 'approved', 'event', 'in_progress'),
('校舎3階のトイレのドアが故障しています。修理をお願いします。', 'pending', 'facility', 'pending')
ON CONFLICT DO NOTHING;

-- ========================================
-- 完了メッセージ
-- ========================================

-- データベース再設計が完了しました
-- 主な変更点:
-- 1. postsテーブルにapproval_statusカラムを追加
-- 2. 投稿承認ログテーブル（post_action_logs）を新規作成
-- 3. RLSポリシーで承認済み投稿のみ表示
-- 4. 統計ビューの追加

-- マイグレーション手順:
-- 1. 既存データをバックアップ
-- 2. 上記SQLを実行
-- 3. admin.htmlで承認機能を使用
-- 4. forum.htmlは自動的に承認済み投稿のみ表示

