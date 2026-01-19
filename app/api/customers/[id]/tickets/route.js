// app/api/customers/[id]/tickets/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../../../lib/db';

// 顧客の回数券一覧取得(通常回数券 + 期間限定回数券)
export async function GET(request, { params }) {
  try {
    const pool = await getConnection();
    const { id } = await params;
    const customerId = id;

    const today = new Date().toISOString().split('T')[0];

    // 1. 通常回数券を取得
    const [regularTickets] = await pool.execute(
      `SELECT 
        ct.customer_ticket_id,
        ct.customer_id,
        ct.plan_id,
        ct.sessions_remaining,
        ct.purchase_date,
        ct.expiry_date,
        ct.purchase_price,
        tp.name as plan_name,
        tp.price as plan_price,
        tp.total_sessions,
        tp.validity_days,
        s.name as service_name,
        s.category as service_category,
        s.duration_minutes,
        s.service_id,
        COALESCE(
          (SELECT SUM(amount_paid) 
           FROM ticket_payments 
           WHERE customer_ticket_id = ct.customer_ticket_id
             AND ticket_type = 'regular'),
          0
        ) as total_paid,
        'regular' as ticket_type
      FROM customer_tickets ct
      JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
      JOIN services s ON tp.service_id = s.service_id
      WHERE ct.customer_id = ?
      ORDER BY ct.purchase_date DESC`,
      [customerId]
    );

    // 2. 期間限定回数券を取得
    const [limitedTickets] = await pool.execute(
      `SELECT 
        ltp.purchase_id as customer_ticket_id,
        ltp.customer_id,
        ltp.offer_id as plan_id,
        ltp.sessions_remaining,
        ltp.purchase_date,
        ltp.expiry_date,
        ltp.purchase_price,
        lo.name as plan_name,
        lo.special_price as plan_price,
        lo.total_sessions,
        lo.validity_days,
        COALESCE(s.name, tp.name, lo.name) as service_name,
        COALESCE(s.category, '') as service_category,
        COALESCE(s.duration_minutes, lo.duration_minutes, 60) as duration_minutes,
        COALESCE(s.service_id, tp.service_id) as service_id,
        COALESCE(
          (SELECT SUM(amount_paid) 
           FROM ticket_payments 
           WHERE customer_ticket_id = ltp.purchase_id
             AND ticket_type = 'limited'),
          0
        ) as total_paid,
        'limited' as ticket_type,
        lo.offer_id,
        lo.base_plan_id
      FROM limited_ticket_purchases ltp
      JOIN limited_offers lo ON ltp.offer_id = lo.offer_id
      LEFT JOIN ticket_plans tp ON lo.base_plan_id = tp.plan_id
      LEFT JOIN services s ON tp.service_id = s.service_id
      WHERE ltp.customer_id = ?
      ORDER BY ltp.purchase_date DESC`,
      [customerId]
    );

    // 3. 両方を結合して残額・ステータスを計算
    const allTickets = [];

    // 通常回数券の処理
    for (const ticket of regularTickets) {
      const remaining_payment = Math.max(0, ticket.purchase_price - ticket.total_paid);
      
      let status = 'active';
      if (ticket.sessions_remaining === 0) {
        status = 'used_up';
      } else if (ticket.expiry_date < today) {
        status = 'expired';
      }
      
      allTickets.push({
        ...ticket,
        remaining_payment,
        status,
        is_limited: false
      });
    }

    // 期間限定回数券の処理
    for (const ticket of limitedTickets) {
      const remaining_payment = Math.max(0, ticket.purchase_price - ticket.total_paid);
      
      let status = 'active';
      if (ticket.sessions_remaining === 0) {
        status = 'used_up';
      } else if (ticket.expiry_date < today) {
        status = 'expired';
      }
      
      allTickets.push({
        ...ticket,
        remaining_payment,
        status,
        is_limited: true,
        // 期間限定用の追加情報
        limited_offer_id: ticket.offer_id,
        base_plan_id: ticket.base_plan_id
      });
    }

    // 購入日順にソート（新しい順）
    allTickets.sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));

    return NextResponse.json({
      success: true,
      data: allTickets
    });
  } catch (error) {
    console.error('回数券取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}