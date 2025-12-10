-- docker/mysql/init/13_create_payments.sql
-- お会計システム用テーブル作成

USE salon_db;

-- 会計マスターテーブル
CREATE TABLE IF NOT EXISTS payments (
    payment_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    customer_id CHAR(36) NOT NULL,
    booking_id CHAR(36) DEFAULT NULL COMMENT '関連予約ID(任意)',
    staff_id CHAR(36) NOT NULL COMMENT '担当スタッフ',
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 施術情報(スナップショット)
    service_id CHAR(36) DEFAULT NULL,
    service_name VARCHAR(100) COMMENT 'サービス名のスナップショット',
    service_price INT DEFAULT 0 COMMENT 'サービス価格のスナップショット',
    service_duration INT DEFAULT 0 COMMENT '施術時間(分)',
    
    -- 使用した支払い手段
    payment_type ENUM('normal', 'ticket', 'coupon', 'limited_offer') NOT NULL DEFAULT 'normal',
    ticket_id CHAR(36) DEFAULT NULL COMMENT '使用回数券ID',
    coupon_id CHAR(36) DEFAULT NULL COMMENT '使用クーポンID',
    limited_offer_id CHAR(36) DEFAULT NULL COMMENT '使用期間限定ID',
    
    -- 金額詳細
    service_subtotal INT NOT NULL DEFAULT 0 COMMENT 'サービス小計',
    options_total INT DEFAULT 0 COMMENT 'オプション合計',
    discount_amount INT DEFAULT 0 COMMENT '割引額',
    total_amount INT NOT NULL COMMENT '最終支払額',
    
    -- 実際の支払い方法
    payment_method ENUM('cash', 'card', 'mixed') NOT NULL DEFAULT 'cash',
    cash_amount INT DEFAULT 0 COMMENT '現金支払額',
    card_amount INT DEFAULT 0 COMMENT 'カード支払額',
    
    notes TEXT COMMENT '備考',
    is_cancelled BOOLEAN DEFAULT FALSE COMMENT 'キャンセル済みフラグ',
    cancelled_at TIMESTAMP DEFAULT NULL,
    cancelled_reason TEXT COMMENT 'キャンセル理由',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    FOREIGN KEY (ticket_id) REFERENCES customer_tickets(customer_ticket_id),
    
    INDEX idx_customer (customer_id),
    INDEX idx_date (payment_date),
    INDEX idx_staff (staff_id),
    INDEX idx_service (service_id),
    INDEX idx_cancelled (is_cancelled),
    INDEX idx_payment_type (payment_type),
    INDEX idx_payment_method (payment_method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 会計オプション詳細テーブル
CREATE TABLE IF NOT EXISTS payment_options (
    payment_option_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    payment_id CHAR(36) NOT NULL,
    option_id CHAR(36) NOT NULL,
    option_name VARCHAR(100) NOT NULL COMMENT 'オプション名のスナップショット',
    option_category VARCHAR(50) COMMENT 'カテゴリのスナップショット',
    price INT NOT NULL COMMENT '価格のスナップショット',
    duration_minutes INT DEFAULT 0 COMMENT '時間のスナップショット',
    quantity INT DEFAULT 1 COMMENT '数量',
    is_free BOOLEAN DEFAULT FALSE COMMENT '無料オプションフラグ',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES options(option_id),
    
    INDEX idx_payment (payment_id),
    INDEX idx_option (option_id),
    INDEX idx_category (option_category),
    INDEX idx_free (is_free)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- レジ締めテーブルのカラム存在チェックと追加
-- expected_cash
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' 
    AND TABLE_NAME = 'daily_closings' 
    AND COLUMN_NAME = 'expected_cash'
);

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN expected_cash INT DEFAULT 0 COMMENT ''理論上の現金額'' AFTER cash_sales',
    'SELECT ''expected_cash already exists'' as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- expected_card
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' 
    AND TABLE_NAME = 'daily_closings' 
    AND COLUMN_NAME = 'expected_card'
);

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN expected_card INT DEFAULT 0 COMMENT ''理論上のカード額'' AFTER expected_cash',
    'SELECT ''expected_card already exists'' as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- transaction_count
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' 
    AND TABLE_NAME = 'daily_closings' 
    AND COLUMN_NAME = 'transaction_count'
);

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN transaction_count INT DEFAULT 0 COMMENT ''取引件数'' AFTER expected_card',
    'SELECT ''transaction_count already exists'' as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- reconciliation_notes
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'salon_db' 
    AND TABLE_NAME = 'daily_closings' 
    AND COLUMN_NAME = 'reconciliation_notes'
);

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE daily_closings ADD COLUMN reconciliation_notes TEXT COMMENT ''照合メモ'' AFTER notes',
    'SELECT ''reconciliation_notes already exists'' as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 初期データ: テスト用会計記録
INSERT INTO payments (
    customer_id, 
    staff_id, 
    payment_date,
    service_id,
    service_name,
    service_price,
    service_duration,
    payment_type,
    service_subtotal,
    options_total,
    discount_amount,
    total_amount,
    payment_method,
    cash_amount,
    card_amount
)
SELECT 
    '880e8400-e29b-41d4-a716-446655440001', -- 田中花子
    '550e8400-e29b-41d4-a716-446655440001', -- 佐野智里
    '2025-01-10 14:00:00',
    service_id,
    name,
    price,
    duration_minutes,
    'normal',
    price,
    0,
    0,
    price,
    'cash',
    price,
    0
FROM services 
WHERE name = 'フェイシャルベーシック'
LIMIT 1;

-- 確認用クエリ
SELECT 'お会計テーブル作成完了' as message;
SELECT COUNT(*) as payment_count FROM payments;
SELECT COUNT(*) as payment_option_count FROM payment_options;