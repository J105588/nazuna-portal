-- ========================================
-- シーケンス修正スクリプト
-- ========================================
-- 実行日: 手動でIDを指定した後
-- 説明: 手動でIDを指定した後、シーケンスを正しい値に更新します
-- ========================================

-- council_membersテーブルのIDシーケンスを更新
-- 現在の最大IDより大きい値に設定します
SELECT setval(
    'council_members_id_seq',
    COALESCE((SELECT MAX(id) FROM council_members), 1),
    true
);

-- 確認: シーケンスの現在の値を確認
SELECT currval('council_members_id_seq') AS current_sequence_value;

