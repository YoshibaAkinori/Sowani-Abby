// app/api/analytics/options/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';

export async function GET(request) {
  try {
    const pool = await getConnection();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period') || 'monthly'; // monthly or yearly

    // 期間のフォーマットを決定
    const periodFormat = period === 'yearly' 
      ? "DATE_FORMAT(p.payment_date, '%Y')"
      : "DATE_FORMAT(p.payment_date, '%Y-%m')";

    const [rows] = await pool.execute(
      `SELECT 
        ${periodFormat} as period,
        o.name as option_name,
        o.category as option_category,
        COUNT(*) as usage_count,
        SUM(po.quantity) as total_quantity,
        SUM(po.price * po.quantity) as total_revenue,
        SUM(CASE WHEN po.is_free THEN 1 ELSE 0 END) as free_count,
        SUM(CASE WHEN NOT po.is_free THEN 1 ELSE 0 END) as paid_count
      FROM payment_options po
      JOIN payments p ON po.payment_id = p.payment_id
      JOIN options o ON po.option_id = o.option_id
      WHERE p.is_cancelled = FALSE
        AND DATE(p.payment_date) BETWEEN ? AND ?
      GROUP BY period, o.option_id, o.name, o.category
      ORDER BY period DESC, usage_count DESC`,
      [startDate, endDate]
    );

    return NextResponse.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('オプション分析取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}