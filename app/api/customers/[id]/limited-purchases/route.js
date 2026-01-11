// app/api/customers/[id]/limited-purchases/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../../../lib/db';

// 顧客の購入済み期間限定オファー一覧取得
export async function GET(request, { params }) {
  try {
    const pool = await getConnection();
    const { id } = await params;
    const customerId = id;

    // limited_ticket_purchases から購入済みオファーを取得
    const [rows] = await pool.execute(
      `SELECT 
        ltp.purchase_id,
        ltp.offer_id,
        ltp.customer_id,
        ltp.purchase_date,
        ltp.expiry_date,
        ltp.sessions_remaining,
        ltp.purchase_price,
        ltp.payment_method,
        ltp.is_active,
        ltp.created_at,
        lo.name as offer_name,
        lo.description,
        lo.total_sessions,
        lo.special_price,
        lo.base_plan_id,
        tp.name as base_plan_name,
        s.service_id,
        s.name as service_name
      FROM limited_ticket_purchases ltp
      JOIN limited_offers lo ON ltp.offer_id = lo.offer_id
      LEFT JOIN ticket_plans tp ON lo.base_plan_id = tp.plan_id
      LEFT JOIN services s ON tp.service_id = s.service_id
      WHERE ltp.customer_id = ?
        AND ltp.is_active = TRUE
        AND ltp.sessions_remaining > 0
        AND ltp.expiry_date >= CURDATE()
      ORDER BY ltp.expiry_date ASC`,
      [customerId]
    );

    // フォーマットを整える
    const formattedRows = rows.map(row => ({
      purchase_id: row.purchase_id,
      offer_id: row.offer_id,
      offer_name: row.offer_name,
      description: row.description,
      service_name: row.service_name || row.base_plan_name,
      service_id: row.service_id,
      base_plan_id: row.base_plan_id,
      base_plan_name: row.base_plan_name,
      total_sessions: row.total_sessions,
      sessions_remaining: row.sessions_remaining,
      purchase_price: row.purchase_price,
      special_price: row.special_price,
      purchase_date: row.purchase_date,
      expiry_date: row.expiry_date,
      is_active: row.is_active
    }));

    return NextResponse.json({
      success: true,
      data: formattedRows
    });
  } catch (error) {
    console.error('購入済み期間限定オファー取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}