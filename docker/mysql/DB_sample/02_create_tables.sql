-- 顧客テーブル
CREATE TABLE customers (
    customer_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    line_user_id VARCHAR(255) DEFAULT NULL,
    last_name VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name_kana VARCHAR(50) NOT NULL,
    first_name_kana VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    birth_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone_number),
    INDEX idx_email (email),
    INDEX idx_line_user (line_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- スタッフテーブル
CREATE TABLE staff (
    staff_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL,
    role VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 施術サービステーブル
CREATE TABLE services (
    service_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL,
    price INT NOT NULL,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 予約テーブル
CREATE TABLE bookings (
    booking_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    customer_id CHAR(36) NOT NULL,
    staff_id CHAR(36) NOT NULL,
    service_id CHAR(36) NOT NULL,
    customer_ticket_id CHAR(36) DEFAULT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    bed_id INT NOT NULL,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    INDEX idx_date (date),
    INDEX idx_status (status),
    INDEX idx_staff_date (staff_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 予約履歴テーブル
CREATE TABLE booking_history (
    history_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_type VARCHAR(50) NOT NULL,
    details JSON,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
    INDEX idx_booking (booking_id),
    INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- カルテテーブル
CREATE TABLE medical_records (
    record_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    customer_id CHAR(36) NOT NULL,
    booking_id CHAR(36) DEFAULT NULL,
    record_date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500),
    notes TEXT,
    created_by_staff_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
    FOREIGN KEY (created_by_staff_id) REFERENCES staff(staff_id),
    INDEX idx_customer_date (customer_id, record_date),
    INDEX idx_s3_key (s3_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- シフトテーブル
CREATE TABLE shifts (
    shift_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    staff_id CHAR(36) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    type ENUM('work', 'holiday', 'half_day') DEFAULT 'work',
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id),
    INDEX idx_staff_date (staff_id, date),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- オプションテーブル
CREATE TABLE options (
    option_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    duration_minutes INT DEFAULT 0,
    price INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 予約オプション中間テーブル
CREATE TABLE booking_options (
    booking_option_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36) NOT NULL,
    option_id CHAR(36) NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
    FOREIGN KEY (option_id) REFERENCES options(option_id),
    UNIQUE KEY unique_booking_option (booking_id, option_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 回数券プランテーブル
CREATE TABLE ticket_plans (
    plan_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    service_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    total_sessions INT NOT NULL,
    price INT NOT NULL,
    validity_days INT NOT NULL,
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    INDEX idx_service (service_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 顧客所有回数券テーブル
CREATE TABLE customer_tickets (
    customer_ticket_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    customer_id CHAR(36) NOT NULL,
    plan_id CHAR(36) NOT NULL,
    purchase_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    sessions_remaining INT NOT NULL,
    purchase_price INT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (plan_id) REFERENCES ticket_plans(plan_id),
    INDEX idx_customer (customer_id),
    INDEX idx_expiry (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 回数券支払いテーブル
CREATE TABLE ticket_payments (
    payment_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    customer_ticket_id CHAR(36) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount_paid INT NOT NULL,
    payment_method ENUM('cash', 'card', 'transfer', 'other') NOT NULL,
    notes TEXT,
    FOREIGN KEY (customer_ticket_id) REFERENCES customer_tickets(customer_ticket_id),
    INDEX idx_ticket (customer_ticket_id),
    INDEX idx_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- メッセージ送信ログテーブル
CREATE TABLE messaging_log (
    log_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    customer_id CHAR(36) NOT NULL,
    message_type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    related_booking_id CHAR(36) DEFAULT NULL,
    related_ticket_id CHAR(36) DEFAULT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (related_booking_id) REFERENCES bookings(booking_id),
    FOREIGN KEY (related_ticket_id) REFERENCES customer_tickets(customer_ticket_id),
    INDEX idx_customer (customer_id),
    INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- レジ締めテーブル
CREATE TABLE daily_closings (
    closing_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    date DATE NOT NULL,
    staff_id CHAR(36) NOT NULL,
    total_sales INT NOT NULL,
    cash_sales INT DEFAULT 0,
    card_sales INT DEFAULT 0,
    other_sales INT DEFAULT 0,
    cash_on_hand_start INT DEFAULT 0,
    cash_on_hand_end INT DEFAULT 0,
    cash_discrepancy INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id),
    UNIQUE KEY unique_date (date),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;