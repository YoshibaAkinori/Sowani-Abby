-- docker/mysql/init/12_add_booking_type.sql
-- bookingsテーブルにtypeカラムを追加

USE salon_db;

-- typeカラムを追加
ALTER TABLE bookings 
ADD COLUMN type ENUM('booking', 'schedule') DEFAULT 'booking' 
COMMENT '種別（予約/予定）' 
AFTER bed_id;

-- 既存データはすべて'booking'として扱う
UPDATE bookings SET type = 'booking' WHERE type IS NULL;

-- 確認
DESCRIBE bookings;