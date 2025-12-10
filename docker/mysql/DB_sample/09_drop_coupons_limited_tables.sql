-- docker/mysql/init/09_drop_coupons_limited_tables.sql
-- クーポン・期間限定関連テーブルを削除（MySQL 8.0対応 - 完全版）

USE salon_db;

-- 外部キー制約を無効化
SET FOREIGN_KEY_CHECKS = 0;

-- bookingsテーブルの外部キー制約を削除（存在する場合のみ）
SET @sql = (SELECT CONCAT('ALTER TABLE bookings DROP FOREIGN KEY ', CONSTRAINT_NAME) 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'salon_db' 
            AND TABLE_NAME = 'bookings' 
            AND CONSTRAINT_NAME = 'fk_bookings_coupon');
SET @sql = IFNULL(@sql, 'SELECT "fk_bookings_coupon does not exist" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT CONCAT('ALTER TABLE bookings DROP FOREIGN KEY ', CONSTRAINT_NAME) 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'salon_db' 
            AND TABLE_NAME = 'bookings' 
            AND CONSTRAINT_NAME = 'fk_bookings_limited_ticket');
SET @sql = IFNULL(@sql, 'SELECT "fk_bookings_limited_ticket does not exist" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- bookingsテーブルから追加したカラムを削除
SET @sql = (SELECT CONCAT('ALTER TABLE bookings DROP COLUMN ', COLUMN_NAME) 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'salon_db' 
            AND TABLE_NAME = 'bookings' 
            AND COLUMN_NAME = 'coupon_id');
SET @sql = IFNULL(@sql, 'SELECT "coupon_id column does not exist" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT CONCAT('ALTER TABLE bookings DROP COLUMN ', COLUMN_NAME) 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'salon_db' 
            AND TABLE_NAME = 'bookings' 
            AND COLUMN_NAME = 'limited_ticket_id');
SET @sql = IFNULL(@sql, 'SELECT "limited_ticket_id column does not exist" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT CONCAT('ALTER TABLE bookings DROP COLUMN ', COLUMN_NAME) 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'salon_db' 
            AND TABLE_NAME = 'bookings' 
            AND COLUMN_NAME = 'free_option_used');
SET @sql = IFNULL(@sql, 'SELECT "free_option_used column does not exist" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- クーポン関連テーブルを削除（中間テーブルを先に削除）
DROP TABLE IF EXISTS coupon_included_options;
DROP TABLE IF EXISTS coupon_usage;
DROP TABLE IF EXISTS coupons;

-- 期間限定関連テーブルを削除
DROP TABLE IF EXISTS limited_ticket_purchases;
DROP TABLE IF EXISTS limited_ticket_offers;

-- ticket_plansテーブルから追加したカラムを削除
SET @sql = (SELECT CONCAT('ALTER TABLE ticket_plans DROP COLUMN ', COLUMN_NAME) 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'salon_db' 
            AND TABLE_NAME = 'ticket_plans' 
            AND COLUMN_NAME = 'gender_restriction');
SET @sql = IFNULL(@sql, 'SELECT "gender_restriction column does not exist" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 外部キー制約を再有効化
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'クーポン・期間限定関連テーブルを削除しました' as message;