-- docker/mysql/init/05_update_shifts.sql
-- 既存のshiftsテーブルに給与関連のカラムを追加

-- 既存カラムがあるかチェックして追加
SET @exist_break := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'shifts' AND COLUMN_NAME = 'break_minutes');
SET @sqlstmt := IF(@exist_break = 0, 
    'ALTER TABLE shifts ADD COLUMN break_minutes INT DEFAULT 0 COMMENT ''休憩時間（分）'' AFTER end_time', 
    'SELECT ''break_minutes already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 交通費カラムを追加
SET @exist_transport := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'shifts' AND COLUMN_NAME = 'transport_cost');
SET @sqlstmt := IF(@exist_transport = 0, 
    'ALTER TABLE shifts ADD COLUMN transport_cost INT DEFAULT 0 COMMENT ''交通費'' AFTER break_minutes', 
    'SELECT ''transport_cost already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 時給カラムを追加
SET @exist_wage := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'shifts' AND COLUMN_NAME = 'hourly_wage');
SET @sqlstmt := IF(@exist_wage = 0, 
    'ALTER TABLE shifts ADD COLUMN hourly_wage INT DEFAULT 900 COMMENT ''時給'' AFTER transport_cost', 
    'SELECT ''hourly_wage already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 日給カラムを追加
SET @exist_daily := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'shifts' AND COLUMN_NAME = 'daily_wage');
SET @sqlstmt := IF(@exist_daily = 0, 
    'ALTER TABLE shifts ADD COLUMN daily_wage INT DEFAULT 0 COMMENT ''日給'' AFTER hourly_wage', 
    'SELECT ''daily_wage already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 備考カラムを追加
SET @exist_notes := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'shifts' AND COLUMN_NAME = 'notes');
SET @sqlstmt := IF(@exist_notes = 0, 
    'ALTER TABLE shifts ADD COLUMN notes TEXT COMMENT ''備考'' AFTER daily_wage', 
    'SELECT ''notes already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- created_atカラムを追加
SET @exist_created := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'shifts' AND COLUMN_NAME = 'created_at');
SET @sqlstmt := IF(@exist_created = 0, 
    'ALTER TABLE shifts ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 
    'SELECT ''created_at already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- updated_atカラムを追加
SET @exist_updated := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'shifts' AND COLUMN_NAME = 'updated_at');
SET @sqlstmt := IF(@exist_updated = 0, 
    'ALTER TABLE shifts ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 
    'SELECT ''updated_at already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- インデックスを追加（存在チェック）
SET @exist_idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'shifts' AND INDEX_NAME = 'idx_staff_month');
SET @sqlstmt := IF(@exist_idx = 0, 
    'ALTER TABLE shifts ADD INDEX idx_staff_month (staff_id, date)', 
    'SELECT ''idx_staff_month already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 既存データのデフォルト値設定（transport_costがNULLの場合のみ）
UPDATE shifts 
SET transport_cost = 313,
    hourly_wage = 900,
    daily_wage = CASE 
        WHEN start_time IS NOT NULL AND end_time IS NOT NULL 
        THEN FLOOR((TIME_TO_SEC(TIMEDIFF(end_time, start_time)) / 3600) * 900)
        ELSE 0
    END
WHERE transport_cost IS NULL OR transport_cost = 0;