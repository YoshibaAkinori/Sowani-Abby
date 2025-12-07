// app/api/analytics/coupons/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';

export async function GET(request) {
  try {
    const pool = await getConnection();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period') || 'monthly';
    const dateFormat = period === 'yearly' ? '%Y' : '%Y-%m';

    // クーポン別の使用回数と合計金額（全期間）
    const [usageByCoupon] = await pool.execute(
      `SELECT 
        c.name as coupon_name,
        COUNT(p.payment_id) as usage_count,
        SUM(p.total_amount) as total_amount
      FROM coupons c
      LEFT JOIN payments p ON c.coupon_id = p.coupon_id
        AND p.payment_type = 'coupon'
        AND p.is_cancelled = FALSE
        AND DATE(p.payment_date) BETWEEN ? AND ?
      GROUP BY c.coupon_id, c.name
      HAVING usage_count > 0
      ORDER BY usage_count DESC`,
      [startDate, endDate]
    );

    // 期間別・クーポン別の使用回数と合計金額
    const [usageByPeriod] = await pool.execute(
      `SELECT 
        DATE_FORMAT(p.payment_date, ?) as period,
        c.name as coupon_name,
        COUNT(p.payment_id) as usage_count,
        SUM(p.total_amount) as total_amount
      FROM payments p
      JOIN coupons c ON p.coupon_id = c.coupon_id
      WHERE p.payment_type = 'coupon'
        AND p.is_cancelled = FALSE
        AND DATE(p.payment_date) BETWEEN ? AND ?
      GROUP BY period, c.coupon_id, c.name
      ORDER BY period DESC, usage_count DESC`,
      [dateFormat, startDate, endDate]
    );

    return NextResponse.json({
      success: true,
      data: {
        usageByCoupon,
        usageByPeriod
      }
    });
  } catch (error) {
    console.error('クーポン分析取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}