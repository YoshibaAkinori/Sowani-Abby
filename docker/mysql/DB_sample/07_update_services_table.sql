-- docker/mysql/init/07_update_services_table.sql
-- servicesテーブルに初回料金関連カラムを追加

USE salon_db;

-- 初回料金カラムを追加（存在チェック付き）
SET @exist_first_price := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'services' AND COLUMN_NAME = 'first_time_price');
SET @sqlstmt := IF(@exist_first_price = 0, 
    'ALTER TABLE services ADD COLUMN first_time_price INT DEFAULT NULL COMMENT ''初回料金'' AFTER price', 
    'SELECT ''first_time_price already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 初回割引フラグを追加（存在チェック付き）
SET @exist_discount := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'services' AND COLUMN_NAME = 'has_first_time_discount');
SET @sqlstmt := IF(@exist_discount = 0, 
    'ALTER TABLE services ADD COLUMN has_first_time_discount BOOLEAN DEFAULT FALSE COMMENT ''初回割引あり'' AFTER category', 
    'SELECT ''has_first_time_discount already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 既存データの更新（一部のサービスに初回割引を設定）
UPDATE services 
SET first_time_price = 5000, has_first_time_discount = TRUE
WHERE name = 'フェイシャルベーシック';

UPDATE services 
SET first_time_price = 8000, has_first_time_discount = TRUE
WHERE name = 'フェイシャルプレミアム';

UPDATE services 
SET first_time_price = 7000, has_first_time_discount = TRUE
WHERE name = 'ボディトリートメント60分';

UPDATE services 
SET first_time_price = 9800, has_first_time_discount = TRUE
WHERE name = 'ボディトリートメント90分';

-- 確認用：テーブル構造を表示
DESCRIBE services;

-- 確認用：データ確認
SELECT 
    service_id,
    name,
    category,
    duration_minutes,
    price as regular_price,
    first_time_price,
    has_first_time_discount,
    is_active
FROM services
ORDER BY category, name;