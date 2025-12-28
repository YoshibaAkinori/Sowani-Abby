import { NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  const pool = await getConnection();
  const connection = await pool.getConnection();
  
  try {
    const { customer, ticket } = await request.json();
    
    await connection.beginTransaction();
    
    // 1. 顧客登録
    const customerId = uuidv4();
    await connection.query(`
      INSERT INTO customers (
        customer_id, line_user_id, last_name, first_name,
        last_name_kana, first_name_kana, phone_number, email,
        birth_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      customerId,
      null,
      customer.last_name,
      customer.first_name,
      customer.last_name_kana,
      customer.first_name_kana,
      customer.phone_number,
      customer.email || '',
      customer.birth_date || null,
      customer.notes || null
    ]);
    
    // 2. 回数券登録
    const ticketId = uuidv4();
    
    if (ticket.type === 'limited') {
      // 福袋（期間限定）の場合 → limited_ticket_purchases
      await connection.query(`
        INSERT INTO limited_ticket_purchases (
          purchase_id, offer_id, customer_id,
          purchase_date, expiry_date, sessions_remaining,
          purchase_price, payment_method, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      `, [
        ticketId,
        ticket.offer_id,
        customerId,
        ticket.purchase_date,
        ticket.expiry_date,
        ticket.sessions_remaining,
        ticket.purchase_price,
        ticket.payment_method
      ]);
      
      // limited_offersのcurrent_salesを更新
      await connection.query(`
        UPDATE limited_offers 
        SET current_sales = current_sales + 1 
        WHERE offer_id = ?
      `, [ticket.offer_id]);
      
    } else {
      // 通常回数券の場合 → customer_tickets
      await connection.query(`
        INSERT INTO customer_tickets (
          customer_ticket_id, customer_id, plan_id,
          purchase_date, expiry_date, sessions_remaining,
          purchase_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        ticketId,
        customerId,
        ticket.plan_id,
        ticket.purchase_date,
        ticket.expiry_date,
        ticket.sessions_remaining,
        ticket.purchase_price
      ]);
    }
    
    // 3. 支払い履歴登録（支払済み金額がある場合）
    if (ticket.paid_amount > 0) {
      const paymentId = uuidv4();
      const ticketType = ticket.type === 'limited' ? 'limited' : 'regular';
      
      await connection.query(`
        INSERT INTO ticket_payments (
          payment_id, ticket_type, customer_ticket_id, payment_date,
          amount_paid, payment_method, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        paymentId,
        ticketType,
        ticketId,
        ticket.purchase_date,
        ticket.paid_amount,
        ticket.payment_method,
        '初期データ登録'
      ]);
    }
    
    await connection.commit();
    
    return NextResponse.json({
      success: true,
      data: {
        customer_id: customerId,
        ticket_id: ticketId,
        customer_name: `${customer.last_name} ${customer.first_name}`,
        remaining_amount: ticket.purchase_price - (ticket.paid_amount || 0)
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Initial data import error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// 登録済みデータ一覧取得（確認用）
export async function GET(request) {
  const pool = await getConnection();
  
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // 今日登録された顧客と回数券を取得
    const [customers] = await pool.query(`
      SELECT 
        c.customer_id,
        c.last_name,
        c.first_name,
        c.phone_number,
        c.created_at,
        ltp.purchase_id as ticket_id,
        ltp.purchase_price,
        ltp.sessions_remaining,
        lo.name as ticket_name,
        'limited' as ticket_type,
        COALESCE(SUM(tp.amount_paid), 0) as paid_amount
      FROM customers c
      LEFT JOIN limited_ticket_purchases ltp ON c.customer_id = ltp.customer_id
      LEFT JOIN limited_offers lo ON ltp.offer_id = lo.offer_id
      LEFT JOIN ticket_payments tp ON ltp.purchase_id = tp.customer_ticket_id
      WHERE DATE(c.created_at) = ?
      GROUP BY c.customer_id, ltp.purchase_id
      
      UNION ALL
      
      SELECT 
        c.customer_id,
        c.last_name,
        c.first_name,
        c.phone_number,
        c.created_at,
        ct.customer_ticket_id as ticket_id,
        ct.purchase_price,
        ct.sessions_remaining,
        tpl.name as ticket_name,
        'regular' as ticket_type,
        COALESCE(SUM(tp.amount_paid), 0) as paid_amount
      FROM customers c
      LEFT JOIN customer_tickets ct ON c.customer_id = ct.customer_id
      LEFT JOIN ticket_plans tpl ON ct.plan_id = tpl.plan_id
      LEFT JOIN ticket_payments tp ON ct.customer_ticket_id = tp.customer_ticket_id
      WHERE DATE(c.created_at) = ?
      GROUP BY c.customer_id, ct.customer_ticket_id
      
      ORDER BY created_at DESC
    `, [date, date]);
    
    return NextResponse.json({
      success: true,
      data: customers
    });
    
  } catch (error) {
    console.error('Get initial data error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}