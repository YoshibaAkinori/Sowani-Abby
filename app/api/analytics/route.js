// app/api/analytics/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../lib/db';

export async function GET(request) {
  try {
    const pool = await getConnection();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let data = {};

    switch (type) {
      case 'summary':
        data = await getSummary(pool, startDate, endDate);
        break;
      case 'daily':
        const dailyData = await getDailySales(pool, startDate, endDate);
        const dailyGender = await getGenderSales(pool, startDate, endDate, 'daily');
        data = { salesData: dailyData, genderData: dailyGender };
        break;
      case 'monthly':
        const monthlyData = await getMonthlySales(pool, startDate, endDate);
        const monthlyGender = await getGenderSales(pool, startDate, endDate, 'monthly');
        data = { salesData: monthlyData, genderData: monthlyGender };
        break;
      default:
        return NextResponse.json(
          { success: false, error: '分析タイプを指定してください' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('分析データ取得エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'データベースエラー' },
      { status: 500 }
    );
  }
}

// サマリー情報
async function getSummary(pool, startDate, endDate) {
  // 取引数: related_payment_id IS NULLのものだけカウント
  const [summary] = await pool.execute(
    `SELECT 
      SUM(CASE WHEN p.related_payment_id IS NULL THEN 1 ELSE 0 END) as total_transactions,
      SUM(p.total_amount) as actual_sales,
      SUM(CASE
        WHEN p.payment_type = 'ticket' AND p.service_name LIKE '%回数券購入%' THEN ct.purchase_price
        WHEN p.payment_type = 'ticket' AND p.service_price = 0 THEN ROUND(ct.purchase_price / tp.total_sessions)
        ELSE p.service_price
      END) as ideal_sales,
      SUM(p.cash_amount) as total_cash,
      SUM(p.card_amount) as total_card,
      COUNT(DISTINCT p.customer_id) as unique_customers,
      SUM(CASE 
        WHEN p.payment_type = 'ticket' AND (p.service_name NOT LIKE '%回数券購入%' OR p.service_name IS NULL)
        THEN 1 ELSE 0 
      END) as ticket_usage,
      SUM(CASE 
        WHEN p.payment_type = 'ticket' AND p.service_name LIKE '%回数券購入%' 
        THEN 1 ELSE 0 
      END) as ticket_purchase,
      SUM(CASE WHEN p.payment_type = 'coupon' THEN 1 ELSE 0 END) as coupon_usage
    FROM payments p
    LEFT JOIN customer_tickets ct ON p.ticket_id = ct.customer_ticket_id
    LEFT JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
    WHERE p.is_cancelled = FALSE
      AND DATE(p.payment_date) BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  const [topServices] = await pool.execute(
    `SELECT 
      service_name,
      COUNT(*) as count, 
      SUM(service_price) as revenue
    FROM (
      SELECT 
        CASE 
          WHEN p.payment_type = 'service' THEN s.name
          WHEN p.payment_type = 'ticket' THEN CONCAT(tp.name, ' (回数券)')
          WHEN p.payment_type = 'coupon' THEN CONCAT(c.name, ' (クーポン)')
          WHEN p.payment_type = 'limited_offer' THEN CONCAT(lo.name, ' (期間限定)')
          ELSE p.service_name
        END as service_name,
        CASE
          WHEN p.payment_type = 'ticket' AND p.service_price = 0 THEN 
            ROUND(tp.price / tp.total_sessions)
          ELSE p.service_price
        END as service_price
      FROM payments p
      LEFT JOIN services s ON p.service_id = s.service_id
      LEFT JOIN customer_tickets ct ON p.ticket_id = ct.customer_ticket_id
      LEFT JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
      LEFT JOIN coupons c ON p.coupon_id = c.coupon_id
      LEFT JOIN limited_offers lo ON p.limited_offer_id = lo.offer_id
      WHERE p.is_cancelled = FALSE
        AND DATE(p.payment_date) BETWEEN ? AND ?
        AND (p.service_name NOT LIKE '%回数券購入%' OR p.service_name IS NULL)
    ) as service_data
    GROUP BY service_name
    ORDER BY count DESC
    LIMIT 5`,
    [startDate, endDate]
  );

  const [topOptions] = await pool.execute(
    `SELECT 
      o.name as option_name, 
      SUM(po.quantity) as count, 
      SUM(po.price * po.quantity) as revenue
     FROM payment_options po
     JOIN payments p ON po.payment_id = p.payment_id
     JOIN options o ON po.option_id = o.option_id
     WHERE p.is_cancelled = FALSE
       AND DATE(p.payment_date) BETWEEN ? AND ?
     GROUP BY o.option_id, o.name
     ORDER BY count DESC
     LIMIT 5`,
    [startDate, endDate]
  );

  // トップパフォーマー情報を取得
  const [topStaff] = await pool.execute(
    `SELECT 
    s.name as staff_name,
    s.color as staff_color,
    SUM(CASE WHEN p.related_payment_id IS NULL THEN 1 ELSE 0 END) as transaction_count,
    CAST(SUM(p.total_amount) AS DECIMAL(15,2)) as total_sales,
    COUNT(DISTINCT p.customer_id) as unique_customers
  FROM payments p
  JOIN staff s ON p.staff_id = s.staff_id
  WHERE p.is_cancelled = FALSE
    AND DATE(p.payment_date) BETWEEN ? AND ?
  GROUP BY s.staff_id, s.name, s.color
  ORDER BY total_sales DESC
  LIMIT 1`,
    [startDate, endDate]
  );

  return {
    summary: summary[0],
    topServices,
    topOptions,
    topStaff: topStaff[0] || null
  };
}

// 日次売上
async function getDailySales(pool, startDate, endDate) {
  // 取引数: related_payment_id IS NULLのものだけカウント
  const [rows] = await pool.execute(
    `SELECT 
      DATE(p.payment_date) as period,
      SUM(CASE WHEN p.related_payment_id IS NULL THEN 1 ELSE 0 END) as transaction_count,
      SUM(p.total_amount) as actual_sales,
      SUM(CASE
        WHEN p.payment_type = 'ticket' AND p.service_name LIKE '%回数券購入%' THEN ct.purchase_price
        WHEN p.payment_type = 'ticket' AND p.service_price = 0 THEN ROUND(ct.purchase_price / tp.total_sessions)
        ELSE p.service_price
      END) as ideal_sales,
      SUM(p.cash_amount) as cash_sales,
      SUM(p.card_amount) as card_sales,
      COUNT(DISTINCT p.customer_id) as unique_customers
    FROM payments p
    LEFT JOIN customer_tickets ct ON p.ticket_id = ct.customer_ticket_id
    LEFT JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
    WHERE p.is_cancelled = FALSE
      AND DATE(p.payment_date) BETWEEN ? AND ?
    GROUP BY DATE(p.payment_date)
    ORDER BY period ASC`,
    [startDate, endDate]
  );
  return rows;
}

// 月次売上
async function getMonthlySales(pool, startDate, endDate) {
  // 取引数: related_payment_id IS NULLのものだけカウント
  const [rows] = await pool.execute(
    `SELECT 
      DATE_FORMAT(p.payment_date, '%Y-%m') as period,
      SUM(CASE WHEN p.related_payment_id IS NULL THEN 1 ELSE 0 END) as transaction_count,
      SUM(p.total_amount) as actual_sales,
      SUM(CASE
        WHEN p.payment_type = 'ticket' AND p.service_name LIKE '%回数券購入%' THEN ct.purchase_price
        WHEN p.payment_type = 'ticket' AND p.service_price = 0 THEN ROUND(ct.purchase_price / tp.total_sessions)
        ELSE p.service_price
      END) as ideal_sales,
      SUM(p.cash_amount) as cash_sales,
      SUM(p.card_amount) as card_sales,
      COUNT(DISTINCT p.customer_id) as unique_customers
    FROM payments p
    LEFT JOIN customer_tickets ct ON p.ticket_id = ct.customer_ticket_id
    LEFT JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
    WHERE p.is_cancelled = FALSE
      AND DATE(p.payment_date) BETWEEN ? AND ?
    GROUP BY DATE_FORMAT(p.payment_date, '%Y-%m')
    ORDER BY period ASC`,
    [startDate, endDate]
  );
  return rows;
}

// 性別ごとの売上集計
async function getGenderSales(pool, startDate, endDate, type) {
  const groupBy = type === 'daily'
    ? 'DATE(p.payment_date)'
    : "DATE_FORMAT(p.payment_date, '%Y-%m')";

  const [rows] = await pool.execute(
    `SELECT 
      ${groupBy} as period,
      c.gender,
      SUM(CASE WHEN p.related_payment_id IS NULL THEN 1 ELSE 0 END) as transaction_count,
      SUM(p.total_amount) as total_sales,
      COUNT(DISTINCT p.customer_id) as unique_customers
    FROM payments p
    JOIN customers c ON p.customer_id = c.customer_id
    WHERE p.is_cancelled = FALSE
      AND DATE(p.payment_date) BETWEEN ? AND ?
      AND c.gender IS NOT NULL
      AND c.gender IN ('female', 'male')
    GROUP BY ${groupBy}, c.gender
    ORDER BY period ASC, c.gender`,
    [startDate, endDate]
  );
  return rows;
}