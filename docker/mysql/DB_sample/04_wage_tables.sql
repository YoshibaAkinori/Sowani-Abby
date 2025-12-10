-- docker/mysql/init/04_wage_tables.sql

-- スタッフ給与設定テーブル
CREATE TABLE IF NOT EXISTS staff_wages (
    wage_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    staff_id CHAR(36) NOT NULL,
    hourly_wage INT NOT NULL DEFAULT 900,
    transport_allowance INT NOT NULL DEFAULT 0,
    effective_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id),
    INDEX idx_staff_date (staff_id, effective_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 日次勤怠記録テーブル
CREATE TABLE IF NOT EXISTS daily_attendance (
    attendance_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    staff_id CHAR(36) NOT NULL,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    break_minutes INT DEFAULT 0,
    work_minutes INT GENERATED ALWAYS AS (
        CASE 
            WHEN check_in IS NOT NULL AND check_out IS NOT NULL 
            THEN TIMESTAMPDIFF(MINUTE, check_in, check_out) - IFNULL(break_minutes, 0)
            ELSE 0
        END
    ) STORED,
    transport_cost INT DEFAULT 0,
    daily_wage INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id),
    UNIQUE KEY unique_staff_date (staff_id, date),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 月次給与集計テーブル
CREATE TABLE IF NOT EXISTS monthly_wages (
    monthly_wage_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    staff_id CHAR(36) NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    total_work_minutes INT DEFAULT 0,
    total_wage INT DEFAULT 0,
    total_transport INT DEFAULT 0,
    total_amount INT DEFAULT 0,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id),
    UNIQUE KEY unique_staff_month (staff_id, year, month),
    INDEX idx_year_month (year, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初期データ（スタッフ給与設定）
INSERT INTO staff_wages (staff_id, hourly_wage, transport_allowance, effective_date)
SELECT 
    staff_id,
    900,
    313,
    CURDATE()
FROM staff
WHERE is_active = TRUE;