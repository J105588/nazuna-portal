-- ========================================
-- member_achievements テーブル追加スクリプト
-- 既存のSupabaseデータベースに追加する用
-- ========================================

-- 1. メンバー活動実績テーブルの作成
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

-- 2. RLS有効化
ALTER TABLE member_achievements ENABLE ROW LEVEL SECURITY;

-- 3. 公開データ用ポリシー
DROP POLICY IF EXISTS "Public read access on member_achievements" ON member_achievements;
CREATE POLICY "Public read access on member_achievements" ON member_achievements FOR SELECT USING (is_public = true);

-- 4. 管理者用ポリシー
DROP POLICY IF EXISTS "Admin full access on member_achievements" ON member_achievements;
CREATE POLICY "Admin full access on member_achievements" ON member_achievements FOR ALL USING (auth.role() = 'admin');

-- 5. トリガー追加
CREATE TRIGGER update_member_achievements_updated_at 
    BEFORE UPDATE ON member_achievements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. インデックス追加
CREATE INDEX IF NOT EXISTS idx_member_achievements_member_id ON member_achievements(member_id);
CREATE INDEX IF NOT EXISTS idx_member_achievements_public ON member_achievements(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_member_achievements_year_month ON member_achievements(achievement_year DESC, achievement_month DESC);

-- 7. サンプルデータ挿入
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
