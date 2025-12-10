
-- docker/mysql/init/15_add_gender_to_customers.sql
-- 顧客テーブルに性別カラムを追加

USE salon_db;

-- 性別カラムを追加（存在しない場合のみ）
SET @exist_gender := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'gender');

SET @sqlstmt := IF(@exist_gender = 0, 
    'ALTER TABLE customers ADD COLUMN gender ENUM(''male'', ''female'', ''other'', ''not_specified'') DEFAULT ''not_specified'' COMMENT ''性別'' AFTER birth_date', 
    'SELECT ''gender already exists'' AS message');

PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 確認用
SELECT '顧客テーブルに性別カラムを追加しました' as message;
DESCRIBE customers;