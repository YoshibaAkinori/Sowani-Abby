// app/api/limited-offer-purchases/route.js - 期間限定オファー（回数券ベース）購入API
import { NextResponse } from 'next/server';
import { getConnection } from '../../../lib/db';

export async function POST(request) {
  const pool = await getConnection();
  const connection = await pool.getConnection();
  
  try {
    const body = await request.json();
    const {
      customer_id,
      offer_id,
      plan_id,  // base_plan_id
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
    if (!customer_id || !offer_id || payment_amount === undefined) {
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

    // 1. 期間限定オファー情報取得
    const [offers] = await connection.query(`
      SELECT 
        lo.*,
        tp.name as base_plan_name,
        tp.service_id,
        s.name as service_name
      FROM limited_offers lo
      LEFT JOIN ticket_plans tp ON lo.base_plan_id = tp.plan_id
      LEFT JOIN services s ON tp.service_id = s.service_id
      WHERE lo.offer_id = ?
    `, [offer_id]);

    if (offers.length === 0) {
      throw new Error('期間限定オファーが見つかりません');
    }

    const offer = offers[0];
    
    // 回数券ベースでない場合はエラー
    if (!offer.base_plan_id) {
      throw new Error('この期間限定オファーは回数券ベースではありません');
    }

    const fullPrice = purchase_price || offer.special_price;
    const validityDays = offer.validity_days || 180;
    const totalSessions = offer.total_sessions;

    // 2. 有効期限計算
    const purchaseDate = new Date();
    const expiryDate = new Date(purchaseDate);
    expiryDate.setDate(expiryDate.getDate() + validityDays);

    // 3. 初回使用時は残回数を1減らす
    const initialSessions = use_immediately 
      ? totalSessions - 1 
      : totalSessions;

    // 4. limited_ticket_purchases レコード作成
    const purchaseId = crypto.randomUUID();
    
    await connection.query(`
      INSERT INTO limited_ticket_purchases (
        purchase_id,
        offer_id,
        customer_id,
        purchase_date,
        expiry_date,
        sessions_remaining,
        purchase_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      purchaseId,
      offer_id,
      customer_id,
      purchaseDate.toISOString().split('T')[0],
      expiryDate.toISOString().split('T')[0],
      initialSessions,
      fullPrice
    ]);

    // 5. ticket_payments レコード作成（初回支払い）★ ticket_type='limited'
    if (payment_amount > 0) {
      await connection.query(`
        INSERT INTO ticket_payments (
          payment_id,
          ticket_type,
          customer_ticket_id,
          payment_date,
          amount_paid,
          payment_method,
          notes
        ) VALUES (UUID(), 'limited', ?, NOW(), ?, ?, ?)
      `, [purchaseId, payment_amount, payment_method, notes || '期間限定オファー購入']);
    }

    // 6. 決済方法に応じて cash_amount と card_amount を按分計算
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
    const balanceAtPayment = fullPrice - payment_amount;

    // 7. payments テーブルに記録
    await connection.query(`
      INSERT INTO payments (
        payment_id,
        customer_id,
        staff_id,
        service_id,
        service_name,
        service_price,
        service_duration,
        payment_type,
        limited_offer_id,
        ticket_sessions_at_payment,
        ticket_balance_at_payment,
        is_ticket_purchase,
        is_remaining_payment,
        is_immediate_use,
        service_subtotal,
        options_total,
        discount_amount,
        payment_amount,
        total_amount,
        payment_method,
        cash_amount,
        card_amount,
        notes,
        related_payment_id
      ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      customer_id,
      staff_id,
      offer.service_id,
      `${offer.name}(期間限定購入)`,
      fullPrice,
      0,
      'limited_offer',
      offer_id,
      sessionsAtPayment,
      balanceAtPayment,
      true,   // is_ticket_purchase = TRUE（購入なので）
      false,  // is_remaining_payment = FALSE
      false,  // is_immediate_use = FALSE
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

    // 8. 初回使用の場合は使用記録も作成
    if (use_immediately) {
      await connection.query(`
        INSERT INTO payments (
          payment_id,
          customer_id,
          staff_id,
          service_id,
          service_name,
          service_price,
          service_duration,
          payment_type,
          limited_offer_id,
          ticket_sessions_at_payment,
          ticket_balance_at_payment,
          is_ticket_purchase,
          is_remaining_payment,
          is_immediate_use,
          service_subtotal,
          options_total,
          discount_amount,
          payment_amount,
          total_amount,
          payment_method,
          cash_amount,
          card_amount,
          notes,
          related_payment_id
        ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customer_id,
        staff_id,
        offer.service_id,
        offer.service_name || offer.base_plan_name,
        0,
        0,
        'limited_offer',
        offer_id,
        sessionsAtPayment,
        balanceAtPayment,
        false,  // is_ticket_purchase = FALSE
        false,  // is_remaining_payment = FALSE
        true,   // is_immediate_use = TRUE
        0,
        0,
        0,
        0,
        0,
        'cash',
        0,
        0,
        null,
        purchasePaymentId
      ]);

      // 来店回数を+1
      await connection.query(
        `UPDATE customers SET visit_count = visit_count + 1 WHERE customer_id = ?`,
        [customer_id]
      );
    }

    // 9. オファーの販売数を更新
    await connection.query(
      `UPDATE limited_offers SET current_sales = current_sales + 1 WHERE offer_id = ?`,
      [offer_id]
    );

    await connection.commit();

    // 残額計算
    const remainingAmount = fullPrice - payment_amount;

    return NextResponse.json({
      success: true,
      data: {
        purchase_id: purchaseId,
        payment_id: purchasePaymentId,
        offer_name: offer.name,
        service_name: offer.service_name || offer.base_plan_name,
        total_sessions: totalSessions,
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
    console.error('Limited offer purchase error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}