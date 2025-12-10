-- ticket_plansテーブルにカテゴリ・性別制限カラムを追加

USE salon_db;

-- カテゴリカラムを追加
ALTER TABLE ticket_plans
  ADD COLUMN service_category VARCHAR(50) NOT NULL DEFAULT '新規' COMMENT 'カテゴリ（新規/会員/体験など）' AFTER validity_days;

-- 性別制限カラムを追加
ALTER TABLE ticket_plans
  ADD COLUMN gender_restriction ENUM('all', 'female', 'male') NOT NULL DEFAULT 'all' COMMENT '性別制限' AFTER service_category;

-- 既存データにデフォルト値を適用
UPDATE ticket_plans
SET service_category = '新規'
WHERE service_category IS NULL OR service_category = '';

UPDATE ticket_plans
SET gender_restriction = 'all'
WHERE gender_restriction IS NULL OR gender_restriction = '';

-- 確認用：テーブル構造を表示
DESCRIBE ticket_plans;
