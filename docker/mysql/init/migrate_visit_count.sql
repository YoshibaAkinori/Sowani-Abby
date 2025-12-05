-- =====================================================
-- 来店回数（visit_count）マイグレーション
-- 回数券使用回数ベースに変更
-- =====================================================

USE salon_db;

-- 1. visit_countカラムを追加（既に存在する場合はスキップ）
SET @exist_visit_count := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'salon_db' 
    AND TABLE_NAME = 'customers' 
    AND COLUMN_NAME = 'visit_count'
);

SET @sqlstmt := IF(@exist_visit_count = 0, 
  'ALTER TABLE customers ADD COLUMN visit_count INT DEFAULT 0 COMMENT ''来店回数（回数券使用回数）'' AFTER base_visit_count', 
  'SELECT ''visit_count column already exists'' AS message'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 既存データから来店回数を計算してセット
-- base_visit_count + 回数券使用回数（購入時の即使用含む、購入のみは除外）
UPDATE customers c
SET visit_count = COALESCE(c.base_visit_count, 0) + (
  SELECT COUNT(*) 
  FROM payments p 
  WHERE p.customer_id = c.customer_id 
    AND p.payment_type = 'ticket'
    AND p.is_cancelled = FALSE
    -- 回数券購入レコードは除外（使用レコードのみカウント）
    AND (p.service_name NOT LIKE '%回数券購入%' OR p.service_name IS NULL)
);

-- 3. 確認用クエリ
SELECT 
  c.customer_id,
  CONCAT(c.last_name, ' ', c.first_name) as customer_name,
  c.base_visit_count,
  c.visit_count
FROM customers c
WHERE c.visit_count > 0 OR c.base_visit_count > 0
ORDER BY c.visit_count DESC
LIMIT 20;