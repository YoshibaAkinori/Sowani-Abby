-- docker/mysql/init/06_update_staff_table.sql
-- staffテーブルに給与関連カラムを追加

USE salon_db;

-- 時給カラムを追加
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS hourly_wage INT DEFAULT 1500 COMMENT '時給' AFTER role;

-- 交通費カラムを追加
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS transport_allowance INT DEFAULT 900 COMMENT '交通費' AFTER hourly_wage;

-- 既存スタッフにデフォルト値を設定（NULLまたは0の場合のみ）
UPDATE staff 
SET hourly_wage = 1500
WHERE hourly_wage IS NULL OR hourly_wage = 0;

UPDATE staff 
SET transport_allowance = 900
WHERE transport_allowance IS NULL OR transport_allowance = 0;

-- 確認用：テーブル構造を表示
DESCRIBE staff;