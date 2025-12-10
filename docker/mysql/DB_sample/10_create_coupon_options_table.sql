-- docker/mysql/init/10_create_coupon_options_table.sql
-- クーポンに指定オプションを関連付ける中間テーブル作成

USE salon_db;

-- クーポンテーブルを再作成（改良版）
DROP TABLE IF EXISTS coupon_included_options;
DROP TABLE IF EXISTS coupon_usage;
DROP TABLE IF EXISTS coupons;

-- クーポンテーブル（改良版）
CREATE TABLE coupons (
    coupon_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL COMMENT 'クーポン名',
    description TEXT COMMENT '説明',
    base_service_id CHAR(36) NOT NULL COMMENT 'ベースとなる施術',
    free_option_count INT DEFAULT 0 COMMENT '自由選択できるオプション数',
    total_price INT NOT NULL COMMENT 'パック価格',
    validity_days INT DEFAULT 180 COMMENT '有効期限（日数）',
    usage_limit INT DEFAULT NULL COMMENT '使用回数上限',
    used_count INT DEFAULT 0 COMMENT '使用済み回数',
    is_active BOOLEAN DEFAULT TRUE COMMENT '有効フラグ',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (base_service_id) REFERENCES services(service_id),
    INDEX idx_service (base_service_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- クーポンに含まれる指定オプション（中間テーブル）
CREATE TABLE coupon_included_options (
    coupon_option_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    coupon_id CHAR(36) NOT NULL,
    option_id CHAR(36) NOT NULL,
    quantity INT DEFAULT 1 COMMENT 'オプションの個数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coupon_id) REFERENCES coupons(coupon_id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES options(option_id),
    UNIQUE KEY unique_coupon_option (coupon_id, option_id),
    INDEX idx_coupon (coupon_id),
    INDEX idx_option (option_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- クーポン使用履歴テーブル
CREATE TABLE coupon_usage (
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

-- servicesテーブルに自由選択オプション数カラムを追加
SET @exist_free_options := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' AND TABLE_NAME = 'services' AND COLUMN_NAME = 'free_option_choices');
SET @sqlstmt := IF(@exist_free_options = 0, 
    'ALTER TABLE services ADD COLUMN free_option_choices INT DEFAULT 0 COMMENT ''自由選択可能なオプション数'' AFTER has_first_time_discount', 
    'SELECT ''free_option_choices already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 期間限定オファーテーブルを簡略化（通常価格削除、販売価格のみに）
DROP TABLE IF EXISTS limited_ticket_purchases;
DROP TABLE IF EXISTS limited_ticket_offers;

CREATE TABLE limited_ticket_offers (
    offer_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL COMMENT 'オファー名',
    description TEXT COMMENT '説明',
    service_name VARCHAR(100) NOT NULL COMMENT 'サービス名',
    total_sessions INT NOT NULL COMMENT '回数',
    special_price INT NOT NULL COMMENT '販売価格',
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

-- 期間限定回数券購入テーブル
CREATE TABLE limited_ticket_purchases (
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

SELECT 'クーポン・期間限定テーブル再作成完了' as message;