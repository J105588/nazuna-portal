-- なずなポータル統合データベーススキーマ
-- Supabase PostgreSQL用

-- ========================================
-- 基本システムテーブル
-- ========================================

-- 部活動テーブル
CREATE TABLE clubs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  members INTEGER,
  schedule VARCHAR(200),
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 投稿テーブル（なずなフォーラム）
CREATE TABLE posts (
  id VARCHAR(50) PRIMARY KEY,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  reply TEXT,
  category VARCHAR(50),
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  replied_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- チャットテーブル
CREATE TABLE chats (
  id SERIAL PRIMARY KEY,
  post_id VARCHAR(50) REFERENCES posts(id) ON DELETE CASCADE,
  sender VARCHAR(50),
  message TEXT,
  is_admin BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- お知らせテーブル
CREATE TABLE news (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  summary TEXT,
  date DATE DEFAULT CURRENT_DATE,
  type VARCHAR(50),
  priority INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  author VARCHAR(100),
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- アンケートテーブル
CREATE TABLE surveys (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  questions JSONB,
  settings JSONB, -- 設定オプション（匿名可否、複数回答可否等）
  is_active BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,
  max_responses INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- アンケート回答テーブル
CREATE TABLE survey_responses (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
  answers JSONB,
  respondent_info JSONB, -- 回答者情報（匿名の場合は空）
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 生徒会メンバーテーブル
CREATE TABLE council_members (
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

-- ========================================
-- 通知システムテーブル
-- ========================================

-- デバイス登録テーブル
CREATE TABLE device_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fcm_token TEXT UNIQUE NOT NULL,
    user_agent TEXT,
    platform VARCHAR(50), -- 'web', 'android', 'ios'
    browser VARCHAR(100),
    device_info JSONB,
    user_info JSONB, -- ユーザー識別情報（オプション）
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 通知テンプレートテーブル
CREATE TABLE notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_key VARCHAR(100) UNIQUE NOT NULL, -- 'news_published', 'survey_created', etc.
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    icon_url TEXT,
    action_url TEXT,
    category VARCHAR(50), -- 'news', 'survey', 'forum', 'emergency'
    priority INTEGER DEFAULT 0, -- 0: normal, 1: high, 2: urgent
    require_interaction BOOLEAN DEFAULT false,
    actions JSONB, -- FCM action buttons
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 通知送信履歴テーブル
CREATE TABLE notification_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES notification_templates(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    icon_url TEXT,
    action_url TEXT,
    category VARCHAR(50),
    priority INTEGER DEFAULT 0,
    target_type VARCHAR(20) DEFAULT 'all', -- 'all', 'specific', 'group'
    target_criteria JSONB, -- フィルタリング条件
    total_recipients INTEGER DEFAULT 0,
    successful_sends INTEGER DEFAULT 0,
    failed_sends INTEGER DEFAULT 0,
    gas_execution_id TEXT, -- GASの実行ID
    admin_email VARCHAR(200), -- 送信者
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sending', 'completed', 'failed'
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 個別通知配信状況テーブル
CREATE TABLE notification_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    history_id UUID REFERENCES notification_history(id) ON DELETE CASCADE,
    device_id UUID REFERENCES device_registrations(id) ON DELETE CASCADE,
    fcm_message_id TEXT, -- FCMから返されるメッセージID
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    error_code VARCHAR(50),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE
);

-- ユーザー通知設定テーブル
CREATE TABLE user_notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id UUID REFERENCES device_registrations(id) ON DELETE CASCADE,
    category VARCHAR(50),
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id, category)
);

-- ========================================
-- ビューとインデックス
-- ========================================

-- 通知統計ビュー
CREATE VIEW notification_statistics AS
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

-- アクティブなアンケート統計ビュー
CREATE VIEW active_survey_stats AS
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

-- インデックスの作成
-- 基本システム用インデックス
CREATE INDEX idx_clubs_active ON clubs(is_active) WHERE is_active = true;
CREATE INDEX idx_clubs_category ON clubs(category);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_news_published ON news(is_published) WHERE is_published = true;
CREATE INDEX idx_news_date ON news(date DESC);
CREATE INDEX idx_news_type ON news(type);
CREATE INDEX idx_surveys_active ON surveys(is_active, is_published) WHERE is_active = true AND is_published = true;
CREATE INDEX idx_council_members_active ON council_members(is_active, display_order) WHERE is_active = true;

-- 通知システム用インデックス
CREATE INDEX idx_device_registrations_fcm_token ON device_registrations(fcm_token);
CREATE INDEX idx_device_registrations_active ON device_registrations(is_active) WHERE is_active = true;
CREATE INDEX idx_device_registrations_platform ON device_registrations(platform);
CREATE INDEX idx_notification_history_category ON notification_history(category);
CREATE INDEX idx_notification_history_sent_at ON notification_history(sent_at DESC);
CREATE INDEX idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX idx_notification_deliveries_history_id ON notification_deliveries(history_id);

-- ========================================
-- トリガーと関数
-- ========================================

-- 更新日時の自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルに更新日時トリガーを設定
CREATE TRIGGER update_clubs_updated_at 
    BEFORE UPDATE ON clubs 
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
-- 初期データ挿入
-- ========================================

-- 通知テンプレートの初期データ
INSERT INTO notification_templates (template_key, title_template, body_template, category, priority, action_url, actions) VALUES
('news_published', '📢 {{title}}', '{{summary}}', 'news', 1, './news.html', '[{"action": "view", "title": "詳細を見る"}, {"action": "dismiss", "title": "閉じる"}]'::jsonb),
('survey_created', '📊 新しいアンケート', '{{title}} - {{deadline}}まで', 'survey', 0, './survey.html', '[{"action": "view", "title": "回答する"}, {"action": "later", "title": "後で"}]'::jsonb),
('forum_reply', '💬 フォーラムに返信', '{{post_id}}への返信があります', 'forum', 0, './forum.html', '[{"action": "view", "title": "確認する"}]'::jsonb),
('emergency_alert', '🚨 緊急連絡', '{{message}}', 'emergency', 2, './news.html', '[{"action": "view", "title": "確認する"}]'::jsonb),
('event_reminder', '📅 イベント開催', '{{title}} - {{date}}', 'event', 1, './news.html', '[{"action": "view", "title": "詳細"}]'::jsonb);

-- サンプル生徒会メンバーデータ
INSERT INTO council_members (name, role, grade, message, bio, responsibilities, achievements, display_order) VALUES
('会長 山田太郎', '生徒会長', '3年', '皆さんの声を大切にします！', '生徒会活動を通じて学校をより良い場所にしたいと思っています。', ARRAY['全体統括', '対外交渉', '重要決定'], ARRAY['生徒会改革', '学園祭成功'], 1),
('副会長 田中花子', '副会長', '3年', 'イベント企画頑張ります！', '楽しいイベントを企画することが得意です。', ARRAY['イベント企画', '会長補佐', '委員会調整'], ARRAY['文化祭企画賞', '体育祭運営'], 2),
('書記 鈴木一郎', '書記', '2年', '透明性のある活動を目指します', '正確な記録と情報共有を心がけています。', ARRAY['議事録作成', '情報管理', '広報活動'], ARRAY['議事録デジタル化', '情報公開制度'], 3),
('会計 佐藤美咲', '会計', '2年', '予算を有効活用します', '数字に強く、効率的な予算運用を行います。', ARRAY['予算管理', '会計監査', '支出承認'], ARRAY['予算効率化', '透明な会計報告'], 4);

-- サンプル部活動データ
INSERT INTO clubs (name, description, members, schedule, category) VALUES
('サッカー部', '全国大会を目指して日々練習に励んでいます。チームワークを大切に、技術向上に取り組んでいます。', 45, '月・水・金 16:00-18:00', 'sports'),
('吹奏楽部', '美しいハーモニーを奏でることを目標に活動中。コンクールでの金賞を目指しています。', 32, '火・木・土 16:00-19:00', 'music'),
('美術部', '創作活動を通じて感性を磨いています。展覧会での作品発表も行います。', 18, '月・火・金 16:00-17:30', 'art'),
('科学部', '実験や研究を通じて科学の面白さを探求しています。', 24, '水・金 16:00-18:00', 'science');

-- サンプルニュースデータ
INSERT INTO news (title, content, summary, type, priority) VALUES
('体育祭開催のお知らせ', '来月20日に体育祭を開催いたします。詳細は後日配布される案内をご確認ください。', '来月20日に体育祭を開催', 'event', 1),
('図書館利用時間変更', '期末試験期間中の図書館利用時間を延長いたします。', '図書館利用時間を延長', 'announcement', 0),
('新型コロナウイルス対策について', '感染症対策の徹底をお願いいたします。', '感染症対策の徹底について', 'important', 2);

-- ========================================
-- Row Level Security (RLS) の設定
-- ========================================

-- RLSを有効化
ALTER TABLE device_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- 管理者用ポリシー（すべての操作を許可）
CREATE POLICY "Admin full access on device_registrations" ON device_registrations FOR ALL USING (auth.role() = 'admin');
CREATE POLICY "Admin full access on notification_templates" ON notification_templates FOR ALL USING (auth.role() = 'admin');
CREATE POLICY "Admin full access on notification_history" ON notification_history FOR ALL USING (auth.role() = 'admin');
CREATE POLICY "Admin full access on notification_deliveries" ON notification_deliveries FOR ALL USING (auth.role() = 'admin');
CREATE POLICY "Admin full access on user_notification_preferences" ON user_notification_preferences FOR ALL USING (auth.role() = 'admin');
CREATE POLICY "Admin full access on posts" ON posts FOR ALL USING (auth.role() = 'admin');
CREATE POLICY "Admin full access on surveys" ON surveys FOR ALL USING (auth.role() = 'admin');
CREATE POLICY "Admin full access on survey_responses" ON survey_responses FOR ALL USING (auth.role() = 'admin');

-- 一般ユーザー用ポリシー
CREATE POLICY "Users can manage own devices" ON device_registrations 
    FOR ALL USING (true); -- 匿名ユーザーも登録可能

CREATE POLICY "Users can view active templates" ON notification_templates 
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view notification history" ON notification_history 
    FOR SELECT USING (true);

CREATE POLICY "Users can submit posts" ON posts 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view approved posts" ON posts 
    FOR SELECT USING (status = 'approved' OR status = 'replied');

CREATE POLICY "Users can view published surveys" ON surveys 
    FOR SELECT USING (is_active = true AND is_published = true);

CREATE POLICY "Users can submit survey responses" ON survey_responses 
    FOR INSERT WITH CHECK (true);

-- 公開データ用ポリシー（認証不要）
CREATE POLICY "Public read access on clubs" ON clubs FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access on news" ON news FOR SELECT USING (is_published = true);
CREATE POLICY "Public read access on council_members" ON council_members FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access on chats" ON chats FOR SELECT USING (true);

-- ========================================
-- GAS用サービスロール（実際の運用時に設定）
-- ========================================

-- CREATE ROLE gas_service;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO gas_service;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gas_service;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO gas_service;