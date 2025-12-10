-- docker/mysql/init/17_add_cash_count_after_columns.sql
-- 締め後の札・硬貨枚数カラムを追加

USE salon_db;

-- 締め後の枚数カラムを追加
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'ten_thousand_count_after');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN ten_thousand_count_after INT DEFAULT 0 COMMENT ''締め後1万円札の枚数'' AFTER ten_thousand_count',
    'SELECT ''ten_thousand_count_after already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'five_thousand_count_after');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN five_thousand_count_after INT DEFAULT 0 COMMENT ''締め後5千円札の枚数'' AFTER five_thousand_count',
    'SELECT ''five_thousand_count_after already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'two_thousand_count_after');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN two_thousand_count_after INT DEFAULT 0 COMMENT ''締め後2千円札の枚数'' AFTER two_thousand_count',
    'SELECT ''two_thousand_count_after already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'one_thousand_count_after');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN one_thousand_count_after INT DEFAULT 0 COMMENT ''締め後千円札の枚数'' AFTER one_thousand_count',
    'SELECT ''one_thousand_count_after already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'five_hundred_count_after');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN five_hundred_count_after INT DEFAULT 0 COMMENT ''締め後500円玉の枚数'' AFTER five_hundred_count',
    'SELECT ''five_hundred_count_after already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'one_hundred_count_after');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN one_hundred_count_after INT DEFAULT 0 COMMENT ''締め後100円玉の枚数'' AFTER one_hundred_count',
    'SELECT ''one_hundred_count_after already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'fifty_count_after');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN fifty_count_after INT DEFAULT 0 COMMENT ''締め後50円玉の枚数'' AFTER fifty_count',
    'SELECT ''fifty_count_after already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'ten_count_after');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN ten_count_after INT DEFAULT 0 COMMENT ''締め後10円玉の枚数'' AFTER ten_count',
    'SELECT ''ten_count_after already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'five_count_after');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN five_count_after INT DEFAULT 0 COMMENT ''締め後5円玉の枚数'' AFTER five_count',
    'SELECT ''five_count_after already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'one_count_after');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN one_count_after INT DEFAULT 0 COMMENT ''締め後1円玉の枚数'' AFTER one_count',
    'SELECT ''one_count_after already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 確認用：テーブル構造を表示
DESCRIBE daily_closings;