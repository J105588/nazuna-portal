-- ========================================
-- なずなポータルサイト 統一データベーススキーマ (nazuna.sql)
-- Supabase PostgreSQL用
-- ========================================

-- ========================================
-- 1. 基本システムテーブル
-- ========================================

-- 1.1 部活動テーブル
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

-- 1.2 お知らせテーブル
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

-- 1.3 生徒会メンバーテーブル
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

-- 1.4 メンバー活動実績テーブル
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

-- 1.5 学生アカウントテーブル（生徒番号ログイン用）
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    student_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. フォーラム・投稿システム
-- ========================================

-- 2.1 投稿テーブル
CREATE TABLE IF NOT EXISTS posts (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    reply TEXT,
    category VARCHAR(50) DEFAULT 'general',
    priority INTEGER DEFAULT 0,
    student_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    replied_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 チャットテーブル
CREATE TABLE IF NOT EXISTS chats (
    id SERIAL PRIMARY KEY,
    post_id VARCHAR(50) REFERENCES posts(id) ON DELETE CASCADE,
    sender VARCHAR(50),
    message TEXT,
    is_admin BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 3. アンケートシステム
-- ========================================

-- 3.1 アンケートテーブル
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

-- 3.2 アンケート回答テーブル
CREATE TABLE IF NOT EXISTS survey_responses (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
    answers JSONB,
    respondent_info JSONB,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 4. 通知システム
-- ========================================

-- 4.1 デバイス登録テーブル
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

-- 4.2 通知テンプレートテーブル
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_key VARCHAR(100) UNIQUE NOT NULL,
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    icon_url TEXT,
    action_url TEXT,
    category VARCHAR(50) DEFAULT 'general',
    priority INTEGER DEFAULT 0,
    require_interaction BOOLEAN DEFAULT false,
    actions JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.3 通知送信履歴テーブル
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES notification_templates(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    icon_url TEXT,
    action_url TEXT,
    category VARCHAR(50),
    priority INTEGER DEFAULT 0,
    target_type VARCHAR(20) DEFAULT 'all',
    target_criteria JSONB,
    total_recipients INTEGER DEFAULT 0,
    successful_sends INTEGER DEFAULT 0,
    failed_sends INTEGER DEFAULT 0,
    gas_execution_id TEXT,
    admin_email VARCHAR(200),
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 4.4 個別通知配信状況テーブル
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    history_id UUID REFERENCES notification_history(id) ON DELETE CASCADE,
    device_id UUID REFERENCES device_registrations(id) ON DELETE CASCADE,
    fcm_message_id TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    error_code VARCHAR(50),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE
);

-- 4.5 ユーザー通知設定テーブル
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id UUID REFERENCES device_registrations(id) ON DELETE CASCADE,
    category VARCHAR(50),
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id, category)
);

-- ========================================
-- 5. ビューとインデックス
-- ========================================

CREATE OR REPLACE VIEW notification_statistics AS
SELECT 
    nh.id,
    nh.title,
    nh.category,
    nh.admin_email,
    nh.sent_at,
    nh.total_recipients,
    nh.successful_sends,
    nh.failed_sends,
    ROUND((nh.successful_sends::decimal / NULLIF(nh.total_recipients, 0)) * 100, 2) as success_rate,
    COUNT(nd.clicked_at) as click_count,
    ROUND((COUNT(nd.clicked_at)::decimal / NULLIF(nh.successful_sends, 0)) * 100, 2) as click_rate
FROM notification_history nh
LEFT JOIN notification_deliveries nd ON nh.id = nd.history_id
GROUP BY nh.id, nh.title, nh.category, nh.admin_email, nh.sent_at, nh.total_recipients, nh.successful_sends, nh.failed_sends;

CREATE OR REPLACE VIEW active_survey_stats AS
SELECT 
    s.id,
    s.title,
    s.created_at,
    s.expires_at,
    COUNT(sr.id) as response_count,
    s.max_responses,
    CASE 
        WHEN s.max_responses IS NULL THEN NULL
        ELSE ROUND((COUNT(sr.id)::decimal / s.max_responses) * 100, 2)
    END as completion_percentage
FROM surveys s
LEFT JOIN survey_responses sr ON s.id = sr.survey_id
WHERE s.is_active = true AND s.is_published = true
GROUP BY s.id, s.title, s.created_at, s.expires_at, s.max_responses;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_clubs_active ON clubs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clubs_category ON clubs(category);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_news_date ON news(date DESC);
CREATE INDEX IF NOT EXISTS idx_news_type ON news(type);
CREATE INDEX IF NOT EXISTS idx_surveys_active ON surveys(is_active, is_published) WHERE is_active = true AND is_published = true;
CREATE INDEX IF NOT EXISTS idx_council_members_active ON council_members(is_active, display_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_member_achievements_member_id ON member_achievements(member_id);
CREATE INDEX IF NOT EXISTS idx_member_achievements_public ON member_achievements(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_member_achievements_year_month ON member_achievements(achievement_year DESC, achievement_month DESC);
CREATE INDEX IF NOT EXISTS idx_device_registrations_fcm_token ON device_registrations(fcm_token);
CREATE INDEX IF NOT EXISTS idx_device_registrations_active ON device_registrations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_device_registrations_platform ON device_registrations(platform);
CREATE INDEX IF NOT EXISTS idx_notification_history_category ON notification_history(category);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_history_id ON notification_deliveries(history_id);

-- ========================================
-- 6. トリガーと関数
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clubs_updated_at 
    BEFORE UPDATE ON clubs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at 
    BEFORE UPDATE ON students 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at 
    BEFORE UPDATE ON posts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_updated_at 
    BEFORE UPDATE ON news 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_surveys_updated_at 
    BEFORE UPDATE ON surveys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_council_members_updated_at 
    BEFORE UPDATE ON council_members 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_member_achievements_updated_at 
    BEFORE UPDATE ON member_achievements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_registrations_updated_at 
    BEFORE UPDATE ON device_registrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON notification_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at 
    BEFORE UPDATE ON user_notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. Row Level Security (RLS) の設定
-- ========================================

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE council_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- 公開データ用ポリシー
DROP POLICY IF EXISTS "Public read access on clubs" ON clubs;
CREATE POLICY "Public read access on clubs" ON clubs FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Public read access on news" ON news;
CREATE POLICY "Public read access on news" ON news FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "Public read access on council_members" ON council_members;
CREATE POLICY "Public read access on council_members" ON council_members FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Public read access on member_achievements" ON member_achievements;
CREATE POLICY "Public read access on member_achievements" ON member_achievements FOR SELECT USING (is_public = true);
-- chats は公開しない

-- 一般ユーザー用ポリシー
DROP POLICY IF EXISTS "Users can submit posts" ON posts;
CREATE POLICY "Users can submit posts" ON posts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can view approved posts" ON posts;
CREATE POLICY "Users can view approved posts" ON posts FOR SELECT USING (status = 'approved' OR status = 'replied');
DROP POLICY IF EXISTS "Users can view published surveys" ON surveys;
CREATE POLICY "Users can view published surveys" ON surveys FOR SELECT USING (is_active = true AND is_published = true);
DROP POLICY IF EXISTS "Users can submit survey responses" ON survey_responses;
CREATE POLICY "Users can submit survey responses" ON survey_responses FOR INSERT WITH CHECK (true);
-- チャットは最小実装として読み書きを許可（将来JWT/サーバー側で制限）
DROP POLICY IF EXISTS "Users can read chats" ON chats;
CREATE POLICY "Users can read chats" ON chats FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can send chats" ON chats;
CREATE POLICY "Users can send chats" ON chats FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can manage own devices" ON device_registrations;
CREATE POLICY "Users can manage own devices" ON device_registrations FOR ALL USING (true);
DROP POLICY IF EXISTS "Users can view active templates" ON notification_templates;
CREATE POLICY "Users can view active templates" ON notification_templates FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Users can view notification history" ON notification_history;
CREATE POLICY "Users can view notification history" ON notification_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage own notification preferences" ON user_notification_preferences;
CREATE POLICY "Users can manage own notification preferences" ON user_notification_preferences FOR ALL USING (true);

-- 学生アカウント（初回登録・ログイン用）
DROP POLICY IF EXISTS "Users can read students for login" ON students;
CREATE POLICY "Users can read students for login" ON students FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can register student" ON students;
CREATE POLICY "Users can register student" ON students FOR INSERT WITH CHECK (true);

-- 管理者用ポリシー
DROP POLICY IF EXISTS "Admin full access on clubs" ON clubs;
CREATE POLICY "Admin full access on clubs" ON clubs FOR ALL USING (auth.role() = 'admin');
DROP POLICY IF EXISTS "Admin full access on news" ON news;
CREATE POLICY "Admin full access on news" ON news FOR ALL USING (auth.role() = 'admin');
DROP POLICY IF EXISTS "Admin full access on council_members" ON council_members;
CREATE POLICY "Admin full access on council_members" ON council_members FOR ALL USING (auth.role() = 'admin');
DROP POLICY IF EXISTS "Admin full access on member_achievements" ON member_achievements;
CREATE POLICY "Admin full access on member_achievements" ON member_achievements FOR ALL USING (auth.role() = 'admin');
DROP POLICY IF EXISTS "Admin full access on posts" ON posts;
CREATE POLICY "Admin full access on posts" ON posts FOR ALL USING (auth.role() = 'admin');
DROP POLICY IF EXISTS "Admin full access on chats" ON chats;
CREATE POLICY "Admin full access on chats" ON chats FOR ALL USING (auth.role() = 'admin');
DROP POLICY IF EXISTS "Admin full access on surveys" ON surveys;
CREATE POLICY "Admin full access on surveys" ON surveys FOR ALL USING (auth.role() = 'admin');
DROP POLICY IF EXISTS "Admin full access on survey_responses" ON survey_responses;
CREATE POLICY "Admin full access on survey_responses" ON survey_responses FOR ALL USING (auth.role() = 'admin');
DROP POLICY IF EXISTS "Admin full access on device_registrations" ON device_registrations;
CREATE POLICY "Admin full access on device_registrations" ON device_registrations FOR ALL USING (auth.role() = 'admin');
DROP POLICY IF EXISTS "Admin full access on notification_templates" ON notification_templates;
CREATE POLICY "Admin full access on notification_templates" ON notification_templates FOR ALL USING (auth.role() = 'admin');
DROP POLICY IF EXISTS "Admin full access on notification_history" ON notification_history;
CREATE POLICY "Admin full access on notification_history" ON notification_history FOR ALL USING (auth.role() = 'admin');
DROP POLICY IF EXISTS "Admin full access on notification_deliveries" ON notification_deliveries;
CREATE POLICY "Admin full access on notification_deliveries" ON notification_deliveries FOR ALL USING (auth.role() = 'admin');
DROP POLICY IF EXISTS "Admin full access on user_notification_preferences" ON user_notification_preferences;
CREATE POLICY "Admin full access on user_notification_preferences" ON user_notification_preferences FOR ALL USING (auth.role() = 'admin');
DROP POLICY IF EXISTS "Admin full access on students" ON students;
CREATE POLICY "Admin full access on students" ON students FOR ALL USING (auth.role() = 'admin');

-- ========================================
-- 8. 初期データ（任意）
-- ========================================

INSERT INTO notification_templates (template_key, title_template, body_template, category, priority, action_url, actions) VALUES
('news_published', '📢 {{title}}', '{{summary}}', 'news', 1, './news.html', '[{"action": "view", "title": "詳細を見る"}, {"action": "dismiss", "title": "閉じる"}]'::jsonb),
('survey_created', '📊 新しいアンケート', '{{title}} - {{deadline}}まで', 'survey', 0, './survey.html', '[{"action": "view", "title": "回答する"}, {"action": "later", "title": "後で"}]'::jsonb),
('forum_reply', '💬 フォーラムに返信', '{{post_id}}への返信があります', 'forum', 0, './forum.html', '[{"action": "view", "title": "確認する"}]'::jsonb),
('emergency_alert', '🚨 緊急連絡', '{{message}}', 'emergency', 2, './news.html', '[{"action": "view", "title": "確認する"}]'::jsonb),
('event_reminder', '📅 イベント開催', '{{title}} - {{date}}', 'event', 1, './news.html', '[{"action": "view", "title": "詳細"}]'::jsonb)
ON CONFLICT (template_key) DO NOTHING;

INSERT INTO council_members (name, role, grade, message, bio, responsibilities, achievements, display_order) VALUES
('会長 山田太郎', '生徒会長', '3年', '皆さんの声を大切にします！', '生徒会活動を通じて学校をより良い場所にしたいと思っています。', ARRAY['全体統括', '対外交渉', '重要決定'], ARRAY['生徒会改革', '学園祭成功'], 1),
('副会長 田中花子', '副会長', '3年', 'イベント企画頑張ります！', '楽しいイベントを企画することが得意です。', ARRAY['イベント企画', '会長補佐', '委員会調整'], ARRAY['文化祭企画賞', '体育祭運営'], 2),
('書記 鈴木一郎', '書記', '2年', '透明性のある活動を目指します', '正確な記録と情報共有を心がけています。', ARRAY['議事録作成', '情報管理', '広報活動'], ARRAY['議事録デジタル化', '情報公開制度'], 3),
('会計 佐藤美咲', '会計', '2年', '予算を有効活用します', '数字に強く、効率的な予算運用を行います。', ARRAY['予算管理', '会計監査', '支出承認'], ARRAY['予算効率化', '透明な会計報告'], 4)
ON CONFLICT DO NOTHING;

-- メンバー活動実績のサンプルデータ
INSERT INTO member_achievements (member_id, title, description, achievement_year, achievement_month, category, priority, is_public) VALUES
(1, '生徒会改革プロジェクト', '生徒会の透明性向上と効率化を実現', 2024, 4, 'leadership', 1, true),
(1, '学園祭成功', '過去最高の来場者数を記録した学園祭を成功に導く', 2024, 10, 'event', 1, true),
(2, '文化祭企画賞受賞', '創意工夫に富んだ文化祭企画で表彰される', 2024, 9, 'award', 2, true),
(2, '体育祭運営', 'スムーズな体育祭運営を実現', 2024, 6, 'event', 1, true),
(3, '議事録デジタル化', '従来の紙ベースからデジタル化に移行', 2024, 3, 'innovation', 2, true),
(3, '情報公開制度', '生徒会活動の透明性向上のための制度を構築', 2024, 5, 'governance', 1, true),
(4, '予算効率化', '無駄な支出を削減し予算の有効活用を実現', 2024, 7, 'management', 1, true),
(4, '透明な会計報告', '月次会計報告の公開により透明性を向上', 2024, 8, 'governance', 1, true)
ON CONFLICT DO NOTHING;

INSERT INTO clubs (name, description, members, schedule, category) VALUES
('サッカー部', '全国大会を目指して日々練習に励んでいます。チームワークを大切に、技術向上に取り組んでいます。', 45, '月・水・金 16:00-18:00', 'sports'),
('吹奏楽部', '美しいハーモニーを奏でることを目標に活動中。コンクールでの金賞を目指しています。', 32, '火・木・土 16:00-19:00', 'music'),
('美術部', '創作活動を通じて感性を磨いています。展覧会での作品発表も行います。', 18, '月・火・金 16:00-17:30', 'art'),
('科学部', '実験や研究を通じて科学の面白さを探求しています。', 24, '水・金 16:00-18:00', 'science')
ON CONFLICT DO NOTHING;

INSERT INTO news (title, content, summary, type, priority) VALUES
('体育祭開催のお知らせ', '来月20日に体育祭を開催いたします。詳細は後日配布される案内をご確認ください。', '来月20日に体育祭を開催', 'event', 1),
('図書館利用時間変更', '期末試験期間中の図書館利用時間を延長いたします。', '図書館利用時間を延長', 'announcement', 0),
('新型コロナウイルス対策について', '感染症対策の徹底をお願いいたします。', '感染症対策の徹底について', 'important', 2)
ON CONFLICT DO NOTHING;


