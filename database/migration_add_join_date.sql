-- ========================================
-- マイグレーション: council_membersテーブルにjoin_dateカラムを追加
-- ========================================
-- 実行日: 2025-01-XX
-- 説明: 活動開始日を保存するためのjoin_dateカラムを追加
-- ========================================

-- 既存のテーブルにjoin_dateカラムを追加（存在しない場合のみ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'council_members' 
        AND column_name = 'join_date'
    ) THEN
        ALTER TABLE council_members 
        ADD COLUMN join_date DATE;
        
        -- 既存のレコードのjoin_dateをcreated_atから初期化（オプション）
        UPDATE council_members 
        SET join_date = created_at::DATE 
        WHERE join_date IS NULL;
        
        RAISE NOTICE 'join_dateカラムを追加しました';
    ELSE
        RAISE NOTICE 'join_dateカラムは既に存在します';
    END IF;
END $$;

