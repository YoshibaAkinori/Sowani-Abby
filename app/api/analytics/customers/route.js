// app/api/analytics/customers/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';

export async function GET(request) {
  try {
    const pool = await getConnection();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: '期間を指定してください' },
        { status: 400 }
      );
    }

    // リピート率分析
    const [repeatAnalysis] = await pool.execute(
      `SELECT 
        COUNT(DISTINCT CASE WHEN visit_count > 1 THEN customer_id END) as repeat_customers,
        COUNT(DISTINCT customer_id) as total_customers,
        ROUND(
          COUNT(DISTINCT CASE WHEN visit_count > 1 THEN customer_id END) * 100.0 / 
          NULLIF(COUNT(DISTINCT customer_id), 0), 1
        ) as repeat_rate
      FROM (
        SELECT 
          customer_id,
          COUNT(*) as visit_count
        FROM payments
        WHERE is_cancelled = FALSE
          AND DATE(payment_date) BETWEEN ? AND ?
        GROUP BY customer_id
      ) as customer_visits`,
      [startDate, endDate]
    );

    // 平均リピート日数
    const [avgRepeatDays] = await pool.execute(
      `SELECT 
        AVG(days_between) as avg_repeat_days,
        MIN(days_between) as min_repeat_days,
        MAX(days_between) as max_repeat_days
      FROM (
        SELECT 
          p1.customer_id,
          DATEDIFF(p1.payment_date, p2.payment_date) as days_between
        FROM payments p1
        INNER JOIN payments p2 
          ON p1.customer_id = p2.customer_id 
          AND p1.payment_date > p2.payment_date
        WHERE p1.is_cancelled = FALSE 
          AND p2.is_cancelled = FALSE
          AND DATE(p1.payment_date) BETWEEN ? AND ?
          AND NOT EXISTS (
            SELECT 1 FROM payments p3
            WHERE p3.customer_id = p1.customer_id
              AND p3.is_cancelled = FALSE
              AND p3.payment_date > p2.payment_date
              AND p3.payment_date < p1.payment_date
          )
      ) as repeat_intervals
      WHERE days_between > 0`,
      [startDate, endDate]
    );

    // 来店回数分布
    const [visitDistribution] = await pool.execute(
      `SELECT 
        visit_range,
        COUNT(*) as customer_count
      FROM (
        SELECT 
          customer_id,
          CASE 
            WHEN visit_count = 1 THEN '1回'
            WHEN visit_count BETWEEN 2 AND 3 THEN '2-3回'
            WHEN visit_count BETWEEN 4 AND 5 THEN '4-5回'
            WHEN visit_count BETWEEN 6 AND 10 THEN '6-10回'
            ELSE '11回以上'
          END as visit_range
        FROM (
          SELECT 
            customer_id,
            COUNT(*) as visit_count
          FROM payments
          WHERE is_cancelled = FALSE
            AND DATE(payment_date) BETWEEN ? AND ?
          GROUP BY customer_id
        ) as customer_visits
      ) as visit_ranges
      GROUP BY visit_range
      ORDER BY 
        CASE visit_range
          WHEN '1回' THEN 1
          WHEN '2-3回' THEN 2
          WHEN '4-5回' THEN 3
          WHEN '6-10回' THEN 4
          ELSE 5
        END`,
      [startDate, endDate]
    );

    // ★★★ 回数券購入タイミング分析（新規顧客のみ対象）★★★
    const [ticketPurchaseTiming] = await pool.execute(
      `SELECT 
        CASE 
          WHEN visit_number = 1 THEN '初回'
          WHEN visit_number = 2 THEN '2回目'
          WHEN visit_number = 3 THEN '3回目'
          WHEN visit_number BETWEEN 4 AND 5 THEN '4-5回目'
          ELSE '6回目以降'
        END as visit_timing,
        COUNT(*) as purchase_count
      FROM (
        SELECT 
          ct.customer_id,
          ct.customer_ticket_id,
          ct.purchase_date,
          (
            SELECT COUNT(*)
            FROM payments p
            WHERE p.customer_id = ct.customer_id
              AND p.is_cancelled = FALSE
              AND DATE(p.payment_date) < ct.purchase_date
          ) + 1 as visit_number,
          ROW_NUMBER() OVER (PARTITION BY ct.customer_id ORDER BY ct.purchase_date) as ticket_rank
        FROM customer_tickets ct
        JOIN customers cu ON ct.customer_id = cu.customer_id
        WHERE DATE(ct.purchase_date) BETWEEN ? AND ?
          AND cu.is_existing_customer = 0
      ) as ticket_visits
      WHERE ticket_rank = 1
      GROUP BY visit_timing
      ORDER BY 
        CASE visit_timing
          WHEN '初回' THEN 1
          WHEN '2回目' THEN 2
          WHEN '3回目' THEN 3
          WHEN '4-5回目' THEN 4
          ELSE 5
        END`,
      [startDate, endDate]
    );

    // LTV分析
    const [ltvAnalysis] = await pool.execute(
      `SELECT 
        AVG(customer_ltv) as avg_ltv,
        MIN(customer_ltv) as min_ltv,
        MAX(customer_ltv) as max_ltv
      FROM (
        SELECT 
          customer_id,
          SUM(total_amount) as customer_ltv
        FROM payments
        WHERE is_cancelled = FALSE
          AND DATE(payment_date) BETWEEN ? AND ?
        GROUP BY customer_id
      ) as customer_values`,
      [startDate, endDate]
    );

    return NextResponse.json({
      success: true,
      data: {
        repeatAnalysis: repeatAnalysis[0],
        avgRepeatDays: avgRepeatDays[0],
        visitDistribution,
        ticketPurchaseTiming,
        ltvAnalysis: ltvAnalysis[0]
      }
    });
  } catch (error) {
    console.error('顧客分析取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}