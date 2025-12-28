-- ===== 顧客1: =====
SET @cust_id = UUID();
SET @ticket_id = UUID();
SET @payment_id = UUID();

INSERT INTO customers (
  customer_id, line_user_id, last_name, first_name, 
  last_name_kana, first_name_kana, phone_number, email, birth_date, gender, notes, base_visit_count, visit_count
) VALUES (
  @cust_id, NULL, '石橋', '加奈子', 'イシバシ', 'カナコ', 
  '08026247224', NULL, '1993-03-27', 'female' NULL, '30', '30'
);

-- 通常回数券（あれば）
INSERT INTO customer_tickets (
  customer_ticket_id, customer_id, plan_id, 
  purchase_date, expiry_date, sessions_remaining, purchase_price
) VALUES (
  @ticket_id, @cust_id, 'プランID', '2025-01-01', '2025-12-31', 10, 65000
);

-- 福袋（あれば）
INSERT INTO limited_ticket_purchases (
  purchase_id, offer_id, customer_id, 
  purchase_date, expiry_date, sessions_remaining, purchase_price
) VALUES (
  @ticket_id, 'オファーID', @cust_id, '2025-01-01', '2025-01-31', 5, 30000
);

-- 支払い履歴
INSERT INTO ticket_payments (
  payment_id, customer_ticket_id, payment_date, amount_paid, payment_method, notes
) VALUES (
  @payment_id, @ticket_id, '2025-01-01', 10000, 'cash', NULL
);

-- ===== 顧客2: =====
