// app/api/ticket-purchases/route.js - 回数券購入API（フラグ対応版）
import { NextResponse } from 'next/server';
import { getConnection } from '../../../lib/db';

export async function POST(request) {
  const pool = await getConnection();
  const connection = await pool.getConnection();
  
  try {
    const body = await request.json();
    const {
      customer_id,
      plan_id,
      purchase_price,
      payment_amount,
      payment_method,
      cash_amount = 0,
      card_amount = 0,
      staff_id,
      use_immediately = false,
      related_payment_id = null,
      notes = null
    } = body;

    // バリデーション
    if (!customer_id || !plan_id || payment_amount === undefined) {
      return NextResponse.json(
        { success: false, error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    if (!staff_id) {
      return NextResponse.json(
        { success: false, error: '担当スタッフIDが必要です' },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    // 1. 回数券プラン情報取得
    const [plans] = await connection.query(`
      SELECT tp.*, s.name as service_name, s.service_id
      FROM ticket_plans tp
      JOIN services s ON tp.service_id = s.service_id
      WHERE tp.plan_id = ?
    `, [plan_id]);

    if (plans.length === 0) {
      throw new Error('回数券プランが見つかりません');
    }

    const plan = plans[0];
    const fullPrice = plan.price;
    const validityDays = plan.validity_days;

    // 2. 有効期限計算
    const purchaseDate = new Date();
    const expiryDate = new Date(purchaseDate);
    expiryDate.setDate(expiryDate.getDate() + validityDays);

    // 3. 初回使用時は残回数を1減らす
    const initialSessions = use_immediately 
      ? plan.total_sessions - 1 
      : plan.total_sessions;

    // 4. customer_tickets レコード作成
    const customerTicketId = crypto.randomUUID();
    
    await connection.query(`
      INSERT INTO customer_tickets (
        customer_ticket_id, customer_id, plan_id, purchase_date, expiry_date, sessions_remaining, purchase_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      customerTicketId,
      customer_id,
      plan_id,
      purchaseDate.toISOString().split('T')[0],
      expiryDate.toISOString().split('T')[0],
      initialSessions,
      purchase_price
    ]);

    // 5. ticket_payments レコード作成（初回支払い）
    if (payment_amount > 0) {
      await connection.query(`
        INSERT INTO ticket_payments (
          customer_ticket_id, payment_date, amount_paid, payment_method, notes
        ) VALUES (?, NOW(), ?, ?, ?)
      `, [customerTicketId, payment_amount, payment_method, notes]);
    }

    // 決済方法に応じて cash_amount と card_amount を按分計算
    let finalCashAmount = 0;
    let finalCardAmount = 0;

    if (payment_method === 'cash') {
      finalCashAmount = payment_amount;
      finalCardAmount = 0;
    } else if (payment_method === 'card') {
      finalCashAmount = 0;
      finalCardAmount = payment_amount;
    } else if (payment_method === 'mixed') {
      finalCashAmount = cash_amount || 0;
      finalCardAmount = card_amount || 0;
    }

    // スナップショット計算
    const sessionsAtPayment = initialSessions;
    const balanceAtPayment = purchase_price - payment_amount;

    // 6. payments テーブルに記録（★フラグ付き）
    await connection.query(`
      INSERT INTO payments (
        payment_id,
        customer_id, staff_id, service_id, service_name, service_price, service_duration,
        payment_type, ticket_id, 
        ticket_sessions_at_payment, ticket_balance_at_payment,
        is_ticket_purchase, is_remaining_payment, is_immediate_use,
        service_subtotal, options_total, discount_amount, 
        payment_amount, total_amount,
        payment_method, cash_amount, card_amount, notes, related_payment_id
      ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      customer_id,
      staff_id,
      plan.service_id,
      `${plan.name}(回数券購入)`,
      fullPrice,
      0,
      'ticket',
      customerTicketId,
      sessionsAtPayment,
      balanceAtPayment,
      true,   // ★ is_ticket_purchase = TRUE
      false,  // ★ is_remaining_payment = FALSE
      false,  // ★ is_immediate_use = FALSE (購入レコード自体は初回使用ではない)
      payment_amount,
      0,
      0,
      payment_amount,
      payment_amount,
      payment_method,
      finalCashAmount,
      finalCardAmount,
      notes,
      related_payment_id
    ]);

    // 購入レコードのpayment_idを取得
    const [purchasePayment] = await connection.query(
      'SELECT payment_id FROM payments WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1',
      [customer_id]
    );
    const purchasePaymentId = purchasePayment[0].payment_id;

    // 7. 初回使用の場合は使用記録も作成（★フラグ付き）
    if (use_immediately) {
      await connection.query(`
        INSERT INTO payments (
          customer_id, staff_id, service_id, service_name, service_price, service_duration,
          payment_type, ticket_id,
          ticket_sessions_at_payment, ticket_balance_at_payment,
          is_ticket_purchase, is_remaining_payment, is_immediate_use,
          service_subtotal, options_total, discount_amount, 
          payment_amount, total_amount,
          payment_method, cash_amount, card_amount, notes, related_payment_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customer_id,
        staff_id,
        plan.service_id,
        plan.service_name,
        0,
        0,
        'ticket',
        customerTicketId,
        sessionsAtPayment,
        balanceAtPayment,
        false,  // ★ is_ticket_purchase = FALSE
        false,  // ★ is_remaining_payment = FALSE
        true,   // ★ is_immediate_use = TRUE
        0,
        0,
        0,
        0,
        0,
        'cash',
        0,
        0,
        null,  // notesは不要に
        purchasePaymentId
      ]);

      // 来店回数を+1
      await connection.query(
        `UPDATE customers SET visit_count = visit_count + 1 WHERE customer_id = ?`,
        [customer_id]
      );
    }

    await connection.commit();

    // 8. 残額計算
    const remainingAmount = fullPrice - payment_amount;

    return NextResponse.json({
      success: true,
      data: {
        customer_ticket_id: customerTicketId,
        payment_id: purchasePaymentId,
        plan_name: plan.name,
        service_name: plan.service_name,
        total_sessions: plan.total_sessions,
        sessions_remaining: initialSessions,
        full_price: fullPrice,
        paid_amount: payment_amount,
        remaining_amount: remainingAmount,
        purchase_date: purchaseDate.toISOString().split('T')[0],
        expiry_date: expiryDate.toISOString().split('T')[0],
        is_fully_paid: remainingAmount === 0,
        used_immediately: use_immediately
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Ticket purchase error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// 追加支払いAPI
export async function PATCH(request) {
  const pool = await getConnection();
  const connection = await pool.getConnection();
  
  try {
    const body = await request.json();
    const {
      customer_ticket_id,
      payment_amount,
      payment_method,
      cash_amount = 0,
      card_amount = 0,
      notes = null
    } = body;

    if (!customer_ticket_id || !payment_amount) {
      return NextResponse.json(
        { success: false, error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    // 1. 回数券情報取得
    const [tickets] = await connection.query(`
      SELECT ct.*, tp.price as full_price, tp.name as plan_name
      FROM customer_tickets ct
      JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
      WHERE ct.customer_ticket_id = ?
    `, [customer_ticket_id]);

    if (tickets.length === 0) {
      throw new Error('回数券が見つかりません');
    }

    const ticket = tickets[0];

    // 2. すでに支払った金額を計算
    const [payments] = await connection.query(
      'SELECT COALESCE(SUM(amount_paid), 0) as total_paid FROM ticket_payments WHERE customer_ticket_id = ?',
      [customer_ticket_id]
    );

    const totalPaid = payments[0].total_paid;
    const remainingAmount = ticket.full_price - totalPaid;

    if (payment_amount > remainingAmount) {
      throw new Error(`支払額が残額を超えています（残額: ¥${remainingAmount}）`);
    }

    // 3. 追加支払い記録
    await connection.query(`
      INSERT INTO ticket_payments (
        customer_ticket_id, payment_date, amount_paid, payment_method, notes
      ) VALUES (?, NOW(), ?, ?, ?)
    `, [customer_ticket_id, payment_amount, payment_method, notes]);

    await connection.commit();

    const newRemainingAmount = remainingAmount - payment_amount;

    return NextResponse.json({
      success: true,
      data: {
        customer_ticket_id,
        plan_name: ticket.plan_name,
        full_price: ticket.full_price,
        total_paid: totalPaid + payment_amount,
        remaining_amount: newRemainingAmount,
        is_fully_paid: newRemainingAmount === 0
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Additional payment error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}