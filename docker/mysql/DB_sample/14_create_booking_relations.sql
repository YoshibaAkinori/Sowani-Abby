-- docker/mysql/init/14_create_booking_relations.sql
-- 予約と回数券・期間限定オファーの多対多関係テーブル作成

USE salon_db;

-- 予約-回数券 中間テーブル
CREATE TABLE IF NOT EXISTS booking_tickets (
    booking_ticket_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36) NOT NULL,
    customer_ticket_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (customer_ticket_id) REFERENCES customer_tickets(customer_ticket_id),
    UNIQUE KEY unique_booking_ticket (booking_id, customer_ticket_id),
    INDEX idx_booking (booking_id),
    INDEX idx_ticket (customer_ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 予約-期間限定オファー 中間テーブル
CREATE TABLE IF NOT EXISTS booking_limited_offers (
    booking_limited_offer_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36) NOT NULL,
    offer_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (offer_id) REFERENCES limited_offers(offer_id),
    UNIQUE KEY unique_booking_offer (booking_id, offer_id),
    INDEX idx_booking (booking_id),
    INDEX idx_offer (offer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 既存のbookingsテーブルのカラムは互換性のため残す（後で削除予定）
-- customer_ticket_id, coupon_id, limited_ticket_id は非推奨

SELECT '予約関連テーブル作成完了' as message;