-- docker/mysql/init/14_update_daily_closings.sql
-- daily_closingsテーブルをレジ締め用に拡張

USE salon_db;

-- 札・硬貨の枚数カラムを追加（存在チェック付き）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'ten_thousand_count');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN ten_thousand_count INT DEFAULT 0 COMMENT ''1万円札の枚数'' AFTER staff_id',
    'SELECT ''ten_thousand_count already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'five_thousand_count');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN five_thousand_count INT DEFAULT 0 COMMENT ''5千円札の枚数'' AFTER ten_thousand_count',
    'SELECT ''five_thousand_count already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'two_thousand_count');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN two_thousand_count INT DEFAULT 0 COMMENT ''2千円札の枚数'' AFTER five_thousand_count',
    'SELECT ''two_thousand_count already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'one_thousand_count');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN one_thousand_count INT DEFAULT 0 COMMENT ''千円札の枚数'' AFTER two_thousand_count',
    'SELECT ''one_thousand_count already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'five_hundred_count');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN five_hundred_count INT DEFAULT 0 COMMENT ''500円玉の枚数'' AFTER one_thousand_count',
    'SELECT ''five_hundred_count already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'one_hundred_count');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN one_hundred_count INT DEFAULT 0 COMMENT ''100円玉の枚数'' AFTER five_hundred_count',
    'SELECT ''one_hundred_count already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'fifty_count');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN fifty_count INT DEFAULT 0 COMMENT ''50円玉の枚数'' AFTER one_hundred_count',
    'SELECT ''fifty_count already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'ten_count');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN ten_count INT DEFAULT 0 COMMENT ''10円玉の枚数'' AFTER fifty_count',
    'SELECT ''ten_count already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'five_count');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN five_count INT DEFAULT 0 COMMENT ''5円玉の枚数'' AFTER ten_count',
    'SELECT ''five_count already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'one_count');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN one_count INT DEFAULT 0 COMMENT ''1円玉の枚数'' AFTER five_count',
    'SELECT ''one_count already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 計算結果カラムを追加
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'actual_cash');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN actual_cash INT DEFAULT 0 COMMENT ''実際在高'' AFTER one_count',
    'SELECT ''actual_cash already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'discrepancy');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN discrepancy INT DEFAULT 0 COMMENT ''過不足'' AFTER expected_cash',
    'SELECT ''discrepancy already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'record_amount');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN record_amount INT DEFAULT 0 COMMENT ''登録額（現金-規定額-支払い）'' AFTER discrepancy',
    'SELECT ''record_amount already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 売上データカラムを追加
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'fixed_amount');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN fixed_amount INT DEFAULT 50000 COMMENT ''レジ規定額'' AFTER transaction_count',
    'SELECT ''fixed_amount already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 支払いデータカラムを追加
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'payments');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN payments JSON COMMENT ''支払い明細（JSON）'' AFTER fixed_amount',
    'SELECT ''payments already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'daily_closings' AND COLUMN_NAME = 'total_payments');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN total_payments INT DEFAULT 0 COMMENT ''支払い合計'' AFTER payments',
    'SELECT ''total_payments already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 確認用：テーブル構造を表示
DESCRIBE daily_closings;