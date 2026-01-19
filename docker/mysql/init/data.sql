-- =====================================================
-- 既存顧客データ登録SQL（payments含む完全版）
-- 【姓】【名】【セイ】【メイ】【電話番号】を置換してください
-- =====================================================
-- ★ 事前にスタッフIDを確認して @staff_id を設定してください
-- SELECT staff_id, name FROM staff WHERE is_active = 1;
-- =====================================================

-- 担当スタッフID（適宜変更）
SET @staff_id = 'cc69b300-9b97-11f0-b7ae-5a93b150659e';

-- ===== 顧客1 =====
-- 生年月日: 1993/3/27, 来店回数: 30回, 購入日: 12/15
-- 福袋回数券 60分10回 65,000円 残10回 全額支払い済み
SET @cust_id1 = UUID();
SET @ticket_id1 = UUID();
SET @pay_id1 = UUID();
SET @payment_id1 = UUID();

INSERT INTO customers (
  customer_id, last_name, first_name, last_name_kana, first_name_kana, 
  phone_number, birth_date, gender, is_existing_customer, base_visit_count, visit_count
) VALUES (
  @cust_id1, '石橋', '加奈子', 'イシバシ', 'カナコ', 
  '080-2624-7224', '1993-03-27', 'female', 1, 30, 30
);

INSERT INTO limited_ticket_purchases (
  purchase_id, offer_id, customer_id, 
  purchase_date, expiry_date, sessions_remaining, purchase_price
) VALUES (
  @ticket_id1, '49d725cb-e3f0-11f0-bc8f-86a91b529f23', @cust_id1, 
  '2025-12-15', '2026-12-15', 10, 65000
);

INSERT INTO ticket_payments (
  payment_id, ticket_type, customer_ticket_id, payment_date, amount_paid, payment_method, notes
) VALUES (
  @pay_id1, 'limited', @ticket_id1, '2025-12-15 10:00:00', 65000, 'cash', '期間限定オファー購入'
);

INSERT INTO payments (
  payment_id, customer_id, staff_id, payment_date, 
  service_name, service_price, payment_type, limited_offer_id,
  is_ticket_purchase, service_subtotal, total_amount, payment_amount,
  payment_method, cash_amount, card_amount, notes
) VALUES (
  @payment_id1, @cust_id1, @staff_id, '2025-12-15 10:00:00',
  '【福袋回数券】60分10回券(会員女性)(購入)', 65000, 'limited_offer', '49d725cb-e3f0-11f0-bc8f-86a91b529f23',
  1, 65000, 65000, 65000,
  'cash', 65000, 0, '既存顧客データ移行'
);


-- ===== 顧客2 =====
-- 生年月日: 1962/11/14, 来店回数: 70回, 購入日: 12/18
-- 福袋回数券 60分10回 65,000円 残10回 全額支払い済み
SET @cust_id2 = UUID();
SET @ticket_id2 = UUID();
SET @pay_id2 = UUID();
SET @payment_id2 = UUID();

INSERT INTO customers (
  customer_id, last_name, first_name, last_name_kana, first_name_kana, 
  phone_number, birth_date, gender, is_existing_customer, base_visit_count, visit_count
) VALUES (
  @cust_id2, '荻原', '由圭', 'オギワラ', 'ユカ', 
  '090-7033-8293', '1962-11-14', 'female', 1, 70, 70
);

INSERT INTO limited_ticket_purchases (
  purchase_id, offer_id, customer_id, 
  purchase_date, expiry_date, sessions_remaining, purchase_price
) VALUES (
  @ticket_id2, '49d725cb-e3f0-11f0-bc8f-86a91b529f23', @cust_id2, 
  '2025-12-18', '2026-12-18', 10, 65000
);

INSERT INTO ticket_payments (
  payment_id, ticket_type, customer_ticket_id, payment_date, amount_paid, payment_method, notes
) VALUES (
  @pay_id2, 'limited', @ticket_id2, '2025-12-18 10:00:00', 65000, 'cash', '期間限定オファー購入'
);

INSERT INTO payments (
  payment_id, customer_id, staff_id, payment_date, 
  service_name, service_price, payment_type, limited_offer_id,
  is_ticket_purchase, service_subtotal, total_amount, payment_amount,
  payment_method, cash_amount, card_amount, notes
) VALUES (
  @payment_id2, @cust_id2, @staff_id, '2025-12-18 10:00:00',
  '【福袋回数券】60分10回券(会員女性)(購入)', 65000, 'limited_offer', '49d725cb-e3f0-11f0-bc8f-86a91b529f23',
  1, 65000, 65000, 65000,
  'cash', 65000, 0, '既存顧客データ移行'
);


-- ===== 顧客3 =====
-- 生年月日: 1993/2/15, 来店回数: 55回, 購入日: 12/6
-- 福袋回数券 60分10回 65,000円 残10回 全額支払い済み
SET @cust_id3 = UUID();
SET @ticket_id3 = UUID();
SET @pay_id3 = UUID();
SET @payment_id3 = UUID();

INSERT INTO customers (
  customer_id, last_name, first_name, last_name_kana, first_name_kana, 
  phone_number, birth_date, gender, is_existing_customer, base_visit_count, visit_count
) VALUES (
  @cust_id3, '加藤', 'あずさ', 'カトウ', 'アズサ', 
  '090-3938-0295', '1993-02-15', 'female', 1, 55, 55
);

INSERT INTO limited_ticket_purchases (
  purchase_id, offer_id, customer_id, 
  purchase_date, expiry_date, sessions_remaining, purchase_price
) VALUES (
  @ticket_id3, '49d725cb-e3f0-11f0-bc8f-86a91b529f23', @cust_id3, 
  '2025-12-06', '2026-12-06', 10, 65000
);

INSERT INTO ticket_payments (
  payment_id, ticket_type, customer_ticket_id, payment_date, amount_paid, payment_method, notes
) VALUES (
  @pay_id3, 'limited', @ticket_id3, '2025-12-06 10:00:00', 65000, 'cash', '期間限定オファー購入'
);

INSERT INTO payments (
  payment_id, customer_id, staff_id, payment_date, 
  service_name, service_price, payment_type, limited_offer_id,
  is_ticket_purchase, service_subtotal, total_amount, payment_amount,
  payment_method, cash_amount, card_amount, notes
) VALUES (
  @payment_id3, @cust_id3, @staff_id, '2025-12-06 10:00:00',
  '【福袋回数券】60分10回券(会員女性)(購入)', 65000, 'limited_offer', '49d725cb-e3f0-11f0-bc8f-86a91b529f23',
  1, 65000, 65000, 65000,
  'cash', 65000, 0, '既存顧客データ移行'
);


-- ===== 顧客4 =====
-- 生年月日: 1992/6/4, 来店回数: 30回, 購入日: 12/14
-- 福袋回数券 60分10回 65,000円 残10回 全額支払い済み
SET @cust_id4 = UUID();
SET @ticket_id4 = UUID();
SET @pay_id4 = UUID();
SET @payment_id4 = UUID();

INSERT INTO customers (
  customer_id, last_name, first_name, last_name_kana, first_name_kana, 
  phone_number, birth_date, gender, is_existing_customer, base_visit_count, visit_count
) VALUES (
  @cust_id4, '神谷', 'みのり', 'カミヤ', 'ミノリ', 
  '080-6917-5776', '1992-06-04', 'female', 1, 30, 30
);

INSERT INTO limited_ticket_purchases (
  purchase_id, offer_id, customer_id, 
  purchase_date, expiry_date, sessions_remaining, purchase_price
) VALUES (
  @ticket_id4, '49d725cb-e3f0-11f0-bc8f-86a91b529f23', @cust_id4, 
  '2025-12-14', '2026-12-14', 10, 65000
);

INSERT INTO ticket_payments (
  payment_id, ticket_type, customer_ticket_id, payment_date, amount_paid, payment_method, notes
) VALUES (
  @pay_id4, 'limited', @ticket_id4, '2025-12-14 10:00:00', 65000, 'cash', '期間限定オファー購入'
);

INSERT INTO payments (
  payment_id, customer_id, staff_id, payment_date, 
  service_name, service_price, payment_type, limited_offer_id,
  is_ticket_purchase, service_subtotal, total_amount, payment_amount,
  payment_method, cash_amount, card_amount, notes
) VALUES (
  @payment_id4, @cust_id4, @staff_id, '2025-12-14 10:00:00',
  '【福袋回数券】60分10回券(会員女性)(購入)', 65000, 'limited_offer', '49d725cb-e3f0-11f0-bc8f-86a91b529f23',
  1, 65000, 65000, 65000,
  'cash', 65000, 0, '既存顧客データ移行'
);


-- ===== 顧客5 =====
-- 生年月日: 1974/6/16, 来店回数: 0回, 購入日: 12/15
-- 福袋回数券 60分5回 35,000円 残5回 全額支払い済み
SET @cust_id5 = UUID();
SET @ticket_id5 = UUID();
SET @pay_id5 = UUID();
SET @payment_id5 = UUID();

INSERT INTO customers (
  customer_id, last_name, first_name, last_name_kana, first_name_kana, 
  phone_number, birth_date, gender, is_existing_customer, base_visit_count, visit_count
) VALUES (
  @cust_id5, '楠ヶ谷', '麻弓', 'クズガヤ', 'マユミ', 
  '090-8542-8685', '1974-06-16', 'female', 1, 0, 0
);

INSERT INTO limited_ticket_purchases (
  purchase_id, offer_id, customer_id, 
  purchase_date, expiry_date, sessions_remaining, purchase_price
) VALUES (
  @ticket_id5, '301b83e6-e3f0-11f0-bc8f-86a91b529f23', @cust_id5, 
  '2025-12-15', '2026-12-15', 5, 35000
);

INSERT INTO ticket_payments (
  payment_id, ticket_type, customer_ticket_id, payment_date, amount_paid, payment_method, notes
) VALUES (
  @pay_id5, 'limited', @ticket_id5, '2025-12-15 10:00:00', 35000, 'cash', '期間限定オファー購入'
);

INSERT INTO payments (
  payment_id, customer_id, staff_id, payment_date, 
  service_name, service_price, payment_type, limited_offer_id,
  is_ticket_purchase, service_subtotal, total_amount, payment_amount,
  payment_method, cash_amount, card_amount, notes
) VALUES (
  @payment_id5, @cust_id5, @staff_id, '2025-12-15 10:00:00',
  '【福袋回数券】60分5回券(会員女性)(購入)', 35000, 'limited_offer', '301b83e6-e3f0-11f0-bc8f-86a91b529f23',
  1, 35000, 35000, 35000,
  'cash', 35000, 0, '既存顧客データ移行'
);


-- ===== 顧客6 =====
-- 生年月日: 1991/7/31, 来店回数: 0回, 購入日: 12/13
-- 福袋回数券 90分5回 51,500円 残5回 全額支払い済み
SET @cust_id6 = UUID();
SET @ticket_id6 = UUID();
SET @pay_id6 = UUID();
SET @payment_id6 = UUID();

INSERT INTO customers (
  customer_id, last_name, first_name, last_name_kana, first_name_kana, 
  phone_number, birth_date, gender, is_existing_customer, base_visit_count, visit_count
) VALUES (
  @cust_id6, '佐藤', '舞子', 'サトウ', 'マイコ', 
  '090-6093-3731', '1991-07-31', 'female', 1, 0, 0
);

INSERT INTO limited_ticket_purchases (
  purchase_id, offer_id, customer_id, 
  purchase_date, expiry_date, sessions_remaining, purchase_price
) VALUES (
  @ticket_id6, '5e9bdd41-e3f0-11f0-bc8f-86a91b529f23', @cust_id6, 
  '2025-12-13', '2026-12-13', 5, 51500
);

INSERT INTO ticket_payments (
  payment_id, ticket_type, customer_ticket_id, payment_date, amount_paid, payment_method, notes
) VALUES (
  @pay_id6, 'limited', @ticket_id6, '2025-12-13 10:00:00', 51500, 'cash', '期間限定オファー購入'
);

INSERT INTO payments (
  payment_id, customer_id, staff_id, payment_date, 
  service_name, service_price, payment_type, limited_offer_id,
  is_ticket_purchase, service_subtotal, total_amount, payment_amount,
  payment_method, cash_amount, card_amount, notes
) VALUES (
  @payment_id6, @cust_id6, @staff_id, '2025-12-13 10:00:00',
  '【福袋回数券】90分5回券(会員女性)(購入)', 51500, 'limited_offer', '5e9bdd41-e3f0-11f0-bc8f-86a91b529f23',
  1, 51500, 51500, 51500,
  'cash', 51500, 0, '既存顧客データ移行'
);


-- ===== 顧客7 =====
-- 生年月日: 1975/8/22, 来店回数: 15回, 購入日: 12/18
-- 福袋回数券 60分5回 35,000円 残5回 全額支払い済み
SET @cust_id7 = UUID();
SET @ticket_id7 = UUID();
SET @pay_id7 = UUID();
SET @payment_id7 = UUID();

INSERT INTO customers (
  customer_id, last_name, first_name, last_name_kana, first_name_kana, 
  phone_number, birth_date, gender, is_existing_customer, base_visit_count, visit_count
) VALUES (
  @cust_id7, '佐々木', '未央', 'ササキ', 'ミオ', 
  '090-1626-3001', '1975-08-22', 'female', 1, 15, 15
);

INSERT INTO limited_ticket_purchases (
  purchase_id, offer_id, customer_id, 
  purchase_date, expiry_date, sessions_remaining, purchase_price
) VALUES (
  @ticket_id7, '301b83e6-e3f0-11f0-bc8f-86a91b529f23', @cust_id7, 
  '2025-12-18', '2026-12-18', 5, 35000
);

INSERT INTO ticket_payments (
  payment_id, ticket_type, customer_ticket_id, payment_date, amount_paid, payment_method, notes
) VALUES (
  @pay_id7, 'limited', @ticket_id7, '2025-12-18 10:00:00', 35000, 'cash', '期間限定オファー購入'
);

INSERT INTO payments (
  payment_id, customer_id, staff_id, payment_date, 
  service_name, service_price, payment_type, limited_offer_id,
  is_ticket_purchase, service_subtotal, total_amount, payment_amount,
  payment_method, cash_amount, card_amount, notes
) VALUES (
  @payment_id7, @cust_id7, @staff_id, '2025-12-18 10:00:00',
  '【福袋回数券】60分5回券(会員女性)(購入)', 35000, 'limited_offer', '301b83e6-e3f0-11f0-bc8f-86a91b529f23',
  1, 35000, 35000, 35000,
  'cash', 35000, 0, '既存顧客データ移行'
);


-- ===== 顧客8 =====
-- 生年月日: 1994/8/9, 来店回数: 75回, 購入日: 12/18
-- 福袋回数券 60分10回 65,000円 残10回 全額支払い済み
SET @cust_id8 = UUID();
SET @ticket_id8 = UUID();
SET @pay_id8 = UUID();
SET @payment_id8 = UUID();

INSERT INTO customers (
  customer_id, last_name, first_name, last_name_kana, first_name_kana, 
  phone_number, birth_date, gender, is_existing_customer, base_visit_count, visit_count
) VALUES (
  @cust_id8, '坂巻', '夏季', 'サカマキ', 'ナツキ', 
  '090-2937-9626', '1994-08-09', 'female', 1, 75, 75
);

INSERT INTO limited_ticket_purchases (
  purchase_id, offer_id, customer_id, 
  purchase_date, expiry_date, sessions_remaining, purchase_price
) VALUES (
  @ticket_id8, '49d725cb-e3f0-11f0-bc8f-86a91b529f23', @cust_id8, 
  '2025-12-18', '2026-12-18', 10, 65000
);

INSERT INTO ticket_payments (
  payment_id, ticket_type, customer_ticket_id, payment_date, amount_paid, payment_method, notes
) VALUES (
  @pay_id8, 'limited', @ticket_id8, '2025-12-18 10:00:00', 65000, 'cash', '期間限定オファー購入'
);

INSERT INTO payments (
  payment_id, customer_id, staff_id, payment_date, 
  service_name, service_price, payment_type, limited_offer_id,
  is_ticket_purchase, service_subtotal, total_amount, payment_amount,
  payment_method, cash_amount, card_amount, notes
) VALUES (
  @payment_id8, @cust_id8, @staff_id, '2025-12-18 10:00:00',
  '【福袋回数券】60分10回券(会員女性)(購入)', 65000, 'limited_offer', '49d725cb-e3f0-11f0-bc8f-86a91b529f23',
  1, 65000, 65000, 65000,
  'cash', 65000, 0, '既存顧客データ移行'
);


-- ===== 顧客9 =====
-- 生年月日: 1968/12/18, 来店回数: 1回, 購入日: 12/8
-- 通常回数券 90分10回 108,000円 残9回 支払い10,000円（残金98,000円）
SET @cust_id9 = UUID();
SET @ticket_id9 = UUID();
SET @pay_id9 = UUID();
SET @payment_id9 = UUID();

INSERT INTO customers (
  customer_id, last_name, first_name, last_name_kana, first_name_kana, 
  phone_number, birth_date, gender, is_existing_customer, base_visit_count, visit_count
) VALUES (
  @cust_id9, '戸塚', '康子', 'トズカ', 'ヤスコ', 
  '090-9924-8790', '1968-12-18', 'female', 1, 1, 1
);

-- 通常回数券: 90分10回券(会員女性) plan_id: 54321fb1-9d27-11f0-8e8d-b2353c7546ec
INSERT INTO customer_tickets (
  customer_ticket_id, customer_id, plan_id, 
  purchase_date, expiry_date, sessions_remaining, purchase_price
) VALUES (
  @ticket_id9, @cust_id9, 'b9fc6517-9d22-11f0-8e8d-b2353c7546ec', 
  '2025-12-08', '2026-12-08', 9, 118000
);

INSERT INTO ticket_payments (
  payment_id, ticket_type, customer_ticket_id, payment_date, amount_paid, payment_method, notes
) VALUES (
  @pay_id9, 'regular', @ticket_id9, '2025-12-14 10:00:00', 10000, 'cash', '既存顧客データ移行'
);

INSERT INTO payments (
  payment_id, customer_id, staff_id, payment_date, 
  service_name, service_price, payment_type, ticket_id,
  is_ticket_purchase, service_subtotal, total_amount, payment_amount,
  payment_method, cash_amount, card_amount, notes
) VALUES (
  @payment_id9, @cust_id9, @staff_id, '2025-12-14 10:00:00',
  '90分10回券(会員女性)(回数券購入)', 118000, 'ticket', @ticket_id9,
  1, 10000, 10000, 10000,
  'cash', 10000, 0, '既存顧客データ移行（分割払い）'
);


-- ===== 顧客10 =====
-- 生年月日: 1959/7/17, 来店回数: 10回, 購入日: 9/10
-- 通常回数券 90分5回 59,000円 残5回 全額支払い済み ★男性★
SET @cust_id10 = UUID();
SET @ticket_id10 = UUID();
SET @pay_id10 = UUID();
SET @payment_id10 = UUID();

INSERT INTO customers (
  customer_id, last_name, first_name, last_name_kana, first_name_kana, 
  phone_number, birth_date, gender, is_existing_customer, base_visit_count, visit_count
) VALUES (
  @cust_id10, '湯本', '健仁', 'ユモト', 'ケンジ', 
  '090-5606-5977', '1959-07-17', 'male', 1, 10, 10
);

-- 通常回数券: 90分5回券(会員男性) plan_id: 804feb15-9d29-11f0-8e8d-b2353c7546ec
INSERT INTO customer_tickets (
  customer_ticket_id, customer_id, plan_id, 
  purchase_date, expiry_date, sessions_remaining, purchase_price
) VALUES (
  @ticket_id10, @cust_id10, '3056ed6e-9d29-11f0-8e8d-b2353c7546ec', 
  '2025-12-08', '2026-12-08', 5, 66500
);

INSERT INTO ticket_payments (
  payment_id, ticket_type, customer_ticket_id, payment_date, amount_paid, payment_method, notes
) VALUES (
  @pay_id10, 'regular', @ticket_id10, '2025-12-08 10:00:00', 66500, 'cash', '既存顧客データ移行（全額支払い済み）'
);

INSERT INTO payments (
  payment_id, customer_id, staff_id, payment_date, 
  service_name, service_price, payment_type, ticket_id,
  is_ticket_purchase, service_subtotal, total_amount, payment_amount,
  payment_method, cash_amount, card_amount, notes
) VALUES (
  @payment_id10, @cust_id10, @staff_id, '2025-12-08 10:00:00',
  '90分5回券(新規男性)(回数券購入)', 66500, 'ticket', @ticket_id10,
  1, 66500, 66500, 66500,
  'cash', 66500, 0, '既存顧客データ移行'
);


-- ===== 顧客11 =====
-- 生年月日: 1974/7/12, 来店回数: 10回, 購入日: 12/14
-- 福袋回数券 60分10回 65,000円 残10回 全額支払い済み
SET @cust_id11 = UUID();
SET @ticket_id11 = UUID();
SET @pay_id11 = UUID();
SET @payment_id11 = UUID();

INSERT INTO customers (
  customer_id, last_name, first_name, last_name_kana, first_name_kana, 
  phone_number, birth_date, gender, is_existing_customer, base_visit_count, visit_count
) VALUES (
  @cust_id11, '福島', '美由紀', 'フクシマ', 'ミユキ', 
  '090-1090-3411', '1974-07-12', 'female', 1, 10, 10
);

INSERT INTO limited_ticket_purchases (
  purchase_id, offer_id, customer_id, 
  purchase_date, expiry_date, sessions_remaining, purchase_price
) VALUES (
  @ticket_id11, '49d725cb-e3f0-11f0-bc8f-86a91b529f23', @cust_id11, 
  '2025-12-14', '2026-12-14', 10, 65000
);

INSERT INTO ticket_payments (
  payment_id, ticket_type, customer_ticket_id, payment_date, amount_paid, payment_method, notes
) VALUES (
  @pay_id11, 'limited', @ticket_id11, '2025-09-10 10:00:00', 65000, 'cash', '期間限定オファー購入'
);

INSERT INTO payments (
  payment_id, customer_id, staff_id, payment_date, 
  service_name, service_price, payment_type, limited_offer_id,
  is_ticket_purchase, service_subtotal, total_amount, payment_amount,
  payment_method, cash_amount, card_amount, notes
) VALUES (
  @payment_id11, @cust_id11, @staff_id, '2025-09-10 10:00:00',
  '【福袋回数券】60分10回券(会員女性)(購入)', 65000, 'limited_offer', '49d725cb-e3f0-11f0-bc8f-86a91b529f23',
  1, 65000, 65000, 65000,
  'cash', 65000, 0, '既存顧客データ移行'
);


-- =====================================================
-- テーブル別まとめ
-- =====================================================
-- customers: 11件
-- limited_ticket_purchases: 9件（福袋）
-- customer_tickets: 2件（通常回数券: 顧客9, 10）
-- ticket_payments: 11件
-- payments: 11件 ★NEW
-- =====================================================