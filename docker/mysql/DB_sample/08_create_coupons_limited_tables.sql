-- docker/mysql/init/08_create_coupons_limited_tables.sql
-- クーポン・期間限定テーブル作成

USE salon_db;

-- クーポンテーブル（詰め合わせパック用）
CREATE TABLE IF NOT EXISTS coupons (
    coupon_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    coupon_code VARCHAR(50) UNIQUE NOT NULL COMMENT 'クーポンコード',
    name VARCHAR(100) NOT NULL COMMENT 'クーポン名',
    description TEXT COMMENT '説明',
    base_service_id CHAR(36) NOT NULL COMMENT 'ベースとなる施術',
    included_options JSON DEFAULT NULL COMMENT '含まれるオプション（指定済み）',
    free_option_count INT DEFAULT 1 COMMENT '自由選択できるオプション数',
    total_price INT NOT NULL COMMENT 'パック価格',
    validity_days INT DEFAULT 180 COMMENT '有効期限（日数）',
    usage_limit INT DEFAULT NULL COMMENT '使用回数上限',
    used_count INT DEFAULT 0 COMMENT '使用済み回数',
    is_active BOOLEAN DEFAULT TRUE COMMENT '有効フラグ',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (base_service_id) REFERENCES services(service_id),
    INDEX idx_code (coupon_code),
    INDEX idx_service (base_service_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 期間限定回数券テーブル（独立型）
CREATE TABLE IF NOT EXISTS limited_ticket_offers (
    offer_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL COMMENT 'オファー名',
    description TEXT COMMENT '説明',
    service_name VARCHAR(100) NOT NULL COMMENT 'サービス名',
    total_sessions INT NOT NULL COMMENT '回数',
    regular_price INT NOT NULL COMMENT '通常価格',
    special_price INT NOT NULL COMMENT '特別価格',
    validity_days INT DEFAULT 180 COMMENT '購入後の有効期限（日数）',
    sale_end_date DATE COMMENT '販売終了日',
    max_sales INT DEFAULT NULL COMMENT '最大販売数',
    current_sales INT DEFAULT 0 COMMENT '現在の販売数',
    is_active BOOLEAN DEFAULT TRUE COMMENT '有効フラグ',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sale_dates (sale_end_date),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- クーポン使用履歴テーブル
CREATE TABLE IF NOT EXISTS coupon_usage (
    usage_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    coupon_id CHAR(36) NOT NULL,
    customer_id CHAR(36) NOT NULL,
    booking_id CHAR(36) DEFAULT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    selected_free_options JSON DEFAULT NULL COMMENT '選択された無料オプション',
    total_discount_amount INT NOT NULL COMMENT '割引総額',
    FOREIGN KEY (coupon_id) REFERENCES coupons(coupon_id),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
    INDEX idx_coupon (coupon_id),
    INDEX idx_customer (customer_id),
    INDEX idx_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 期間限定回数券購入テーブル
CREATE TABLE IF NOT EXISTS limited_ticket_purchases (
    purchase_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    offer_id CHAR(36) NOT NULL,
    customer_id CHAR(36) NOT NULL,
    purchase_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    sessions_remaining INT NOT NULL,
    purchase_price INT NOT NULL,
    payment_method ENUM('cash', 'card', 'transfer', 'other') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (offer_id) REFERENCES limited_ticket_offers(offer_id),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    INDEX idx_offer (offer_id),
    INDEX idx_customer (customer_id),
    INDEX idx_expiry (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 予約テーブルにクーポン・期間限定関連カラムを追加
SET @exist_coupon := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'coupon_id');
SET @sqlstmt := IF(@exist_coupon = 0, 
    'ALTER TABLE bookings ADD COLUMN coupon_id CHAR(36) DEFAULT NULL COMMENT ''使用クーポンID'' AFTER customer_ticket_id', 
    'SELECT ''coupon_id already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist_limited := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'limited_ticket_id');
SET @sqlstmt := IF(@exist_limited = 0, 
    'ALTER TABLE bookings ADD COLUMN limited_ticket_id CHAR(36) DEFAULT NULL COMMENT ''使用期間限定チケットID'' AFTER coupon_id', 
    'SELECT ''limited_ticket_id already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist_free_option := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'free_option_used');
SET @sqlstmt := IF(@exist_free_option = 0, 
    'ALTER TABLE bookings ADD COLUMN free_option_used BOOLEAN DEFAULT FALSE COMMENT ''無料オプション使用済み'' AFTER limited_ticket_id', 
    'SELECT ''free_option_used already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 外部キー制約を追加
SET @exist_fk_coupon := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'bookings' AND CONSTRAINT_NAME = 'fk_bookings_coupon');
SET @sqlstmt := IF(@exist_fk_coupon = 0, 
    'ALTER TABLE bookings ADD CONSTRAINT fk_bookings_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(coupon_id)', 
    'SELECT ''fk_bookings_coupon already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist_fk_limited := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'bookings' AND CONSTRAINT_NAME = 'fk_bookings_limited_ticket');
SET @sqlstmt := IF(@exist_fk_limited = 0, 
    'ALTER TABLE bookings ADD CONSTRAINT fk_bookings_limited_ticket FOREIGN KEY (limited_ticket_id) REFERENCES limited_ticket_purchases(purchase_id)', 
    'SELECT ''fk_bookings_limited_ticket already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回数券テーブルに性別制限カラムを追加
SET @exist_gender := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'ticket_plans' AND COLUMN_NAME = 'gender_restriction');
SET @sqlstmt := IF(@exist_gender = 0, 
    'ALTER TABLE ticket_plans ADD COLUMN gender_restriction ENUM(''all'', ''male'', ''female'') DEFAULT ''all'' COMMENT ''性別制限'' AFTER name', 
    'SELECT ''gender_restriction already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- サンプルデータ挿入（安全な方法で）
INSERT INTO coupons (coupon_code, name, description, base_service_id, included_options, free_option_count, total_price, validity_days)
SELECT 
    'SPECIAL2025', 
    '【男女共通人気NO.1】上半身ケア+小顔コルギ+背中コルギ80分', 
    '別途カウンセリング20分。背中全面/腰/腕/お尻★背中コルギには痛みはございません。★施術後のお身体は浮腫み・疲労はスッキリ！代謝UPでポカポカです！更に小顔コルギで美顔に♪',
    s.service_id,
    JSON_ARRAY('背中コルギ', '小顔コルギ'),
    0,
    6000,
    180
FROM services s
WHERE s.name LIKE '%ボディ%' 
AND s.is_active = TRUE
LIMIT 1
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO limited_ticket_offers (name, description, service_name, total_sessions, regular_price, special_price, validity_days, sale_end_date)
VALUES 
    ('【朝割/女性限定/担当スタッフ星野】上半身ケア+小顔コルギ50分 3000円', 
     'カウンセリング別途20分◆デコルテ・肩甲骨・首・頭と上半身しっかり流した後、お顔のいらないものを排出。ベテランスタッフが対応します★※お化粧は当店で落とさせていただきます。', 
     '上半身ケア+小顔コルギ50分', 
     10, 
     50000, 
     30000, 
     180, 
     '2025-12-31'),
    ('【当日割男女共通】効果重視！即効性有◆上半身ケア+小顔コルギ50分 4000円',
     '【別途カウンセリング30分】当日予約の方のみご利用いただけます。当日以外でのご予約は5000円となります。上半身ケア+お顔コルギで満足度◎※お化粧は当店で落とさせていただきます。',
     '上半身ケア+小顔コルギ50分',
     5,
     25000,
     20000,
     90,
     '2025-11-30')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 確認用
SELECT 'クーポン・期間限定テーブル作成完了' as message;
DESCRIBE coupons;
DESCRIBE limited_ticket_offers;