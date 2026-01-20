// app/api/payments/route.js - フラグ対応版（期間限定スナップショット対応）
import { NextResponse } from 'next/server';
import { getConnection } from '../../../lib/db';

// 会計一覧取得
export async function GET(request) {
  try {
    const pool = await getConnection();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const customerId = searchParams.get('customer_id');
    const staffId = searchParams.get('staff_id');
    const bookingId = searchParams.get('booking_id');

    let query = `
      SELECT 
        p.*,
        c.last_name, c.first_name,
        s.name as staff_name
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.customer_id
      LEFT JOIN staff s ON p.staff_id = s.staff_id
      WHERE p.is_cancelled = FALSE
    `;

    const params = [];

    if (bookingId) {
      query += ' AND p.booking_id = ?';
      params.push(bookingId);
    }

    if (date) {
      query += ' AND DATE(p.payment_date) = ?';
      params.push(date);
    }

    if (customerId) {
      query += ' AND p.customer_id = ?';
      params.push(customerId);
    }

    if (staffId) {
      query += ' AND p.staff_id = ?';
      params.push(staffId);
    }

    query += ' ORDER BY p.payment_date DESC';

    const [rows] = await pool.execute(query, params);

    // 各会計のオプション情報も取得
    for (let payment of rows) {
      const [options] = await pool.execute(
        `SELECT 
          option_name,
          option_category,
          price,
          quantity,
          is_free
        FROM payment_options
        WHERE payment_id = ?`,
        [payment.payment_id]
      );
      payment.options = options;
    }

    return NextResponse.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('会計取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}

// お会計新規登録
export async function POST(request) {
  const pool = await getConnection();
  const connection = await pool.getConnection();

  try {
    const body = await request.json();

    const {
      customer_id,
      booking_id,
      staff_id,
      service_id,
      payment_type = 'normal',
      ticket_id,
      coupon_id,
      limited_offer_id,
      limited_purchase_id,  // ★購入済み期間限定回数券のID
      options = [],
      discount_amount = 0,
      payment_method = 'cash',
      cash_amount = 0,
      card_amount = 0,
      notes = '',
      payment_amount = 0,
      related_payment_id = null,
      // ★ 新しいフラグパラメータ
      is_remaining_payment = false
    } = body;

    if (!customer_id || !staff_id) {
      return NextResponse.json(
        { success: false, error: '顧客とスタッフは必須です' },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    // ★ 通常回数券のスナップショット取得
    const getTicketSnapshot = async (ticketId) => {
      if (!ticketId) return { sessions: null, balance: null };
      
      const [ticketRows] = await connection.execute(
        `SELECT 
          ct.sessions_remaining,
          ct.purchase_price,
          COALESCE((
            SELECT SUM(amount_paid) 
            FROM ticket_payments 
            WHERE customer_ticket_id = ct.customer_ticket_id
          ), 0) as total_paid
        FROM customer_tickets ct
        WHERE ct.customer_ticket_id = ?`,
        [ticketId]
      );
      
      if (ticketRows.length === 0) return { sessions: null, balance: null };
      
      const ticket = ticketRows[0];
      return {
        sessions: ticket.sessions_remaining,
        balance: ticket.purchase_price - ticket.total_paid
      };
    };

    // ★ 期間限定回数券のスナップショット取得
    const getLimitedTicketSnapshot = async (purchaseId) => {
      if (!purchaseId) return { sessions: null, balance: null };
      
      const [rows] = await connection.execute(
        `SELECT 
          ltp.sessions_remaining,
          ltp.purchase_price,
          COALESCE((
            SELECT SUM(amount_paid) 
            FROM ticket_payments 
            WHERE customer_ticket_id = ltp.purchase_id AND ticket_type = 'limited'
          ), 0) as total_paid
        FROM limited_ticket_purchases ltp
        WHERE ltp.purchase_id = ?`,
        [purchaseId]
      );
      
      if (rows.length === 0) return { sessions: null, balance: null };
      
      const ticket = rows[0];
      return {
        sessions: ticket.sessions_remaining,
        balance: ticket.purchase_price - ticket.total_paid
      };
    };

    // ★★★ 残金支払い専用処理（フラグで判定） ★★★
    if (is_remaining_payment && payment_amount > 0) {
      let ticketInfo = { plan_name: '回数券', service_name: '' };
      let ticketType = 'regular';
      let targetTicketId = ticket_id;

      // 通常回数券の残金支払い
      if (ticket_id) {
        const [ticketRows] = await connection.execute(
          `SELECT 
            tp.name as plan_name,
            s.name as service_name
          FROM customer_tickets ct
          JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
          JOIN services s ON tp.service_id = s.service_id
          WHERE ct.customer_ticket_id = ?`,
          [ticket_id]
        );
        if (ticketRows.length > 0) {
          ticketInfo = ticketRows[0];
        }
        ticketType = 'regular';
        targetTicketId = ticket_id;
      }
      // 期間限定回数券の残金支払い
      else if (limited_purchase_id) {
        const [limitedRows] = await connection.execute(
          `SELECT 
            lo.name as plan_name,
            lo.name as service_name
          FROM limited_ticket_purchases ltp
          JOIN limited_offers lo ON ltp.offer_id = lo.offer_id
          WHERE ltp.purchase_id = ?`,
          [limited_purchase_id]
        );
        if (limitedRows.length > 0) {
          ticketInfo = limitedRows[0];
        }
        ticketType = 'limited';
        targetTicketId = limited_purchase_id;
      }

      let finalCashAmount = 0;
      let finalCardAmount = 0;

      if (payment_method === 'cash') {
        finalCashAmount = payment_amount;
      } else if (payment_method === 'card') {
        finalCardAmount = payment_amount;
      } else if (payment_method === 'mixed') {
        finalCashAmount = cash_amount || 0;
        finalCardAmount = card_amount || 0;
      }

      // ticket_payments に登録
      await connection.execute(`
        INSERT INTO ticket_payments (
          ticket_type, customer_ticket_id, payment_date, amount_paid, payment_method, notes
        ) VALUES (?, ?, NOW(), ?, ?, ?)
      `, [ticketType, targetTicketId, payment_amount, payment_method, notes]);

      // 支払い後のスナップショットを取得
      let snapshot;
      if (ticket_id) {
        snapshot = await getTicketSnapshot(ticket_id);
      } else {
        snapshot = await getLimitedTicketSnapshot(limited_purchase_id);
      }

      // payments に登録（★フラグ付き）
      await connection.execute(
        `INSERT INTO payments (
          payment_id,
          customer_id,
          staff_id,
          service_name,
          service_price,
          service_duration,
          payment_type,
          ticket_id,
          ticket_sessions_at_payment,
          ticket_balance_at_payment,
          is_ticket_purchase,
          is_remaining_payment,
          is_immediate_use,
          limited_offer_id,
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
        ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer_id,
          staff_id,
          `${ticketInfo.plan_name} 残金支払い`,
          0,
          0,
          ticket_id ? 'ticket' : 'limited_offer',
          ticket_id || limited_purchase_id,  // ★期間限定の場合はpurchase_idを保存
          snapshot.sessions,
          snapshot.balance,
          false,  // is_ticket_purchase
          true,   // ★ is_remaining_payment = TRUE
          false,  // is_immediate_use
          limited_offer_id || null,
          0,
          0,
          0,
          payment_amount,
          payment_amount,
          payment_method,
          finalCashAmount,
          finalCardAmount,
          notes,
          related_payment_id
        ]
      );

      const [paymentRow] = await connection.execute(
        `SELECT payment_id FROM payments 
         WHERE customer_id = ? AND staff_id = ? 
         ORDER BY created_at DESC LIMIT 1`,
        [customer_id, staff_id]
      );

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: '残金支払いを登録しました',
        data: {
          payment_id: paymentRow[0].payment_id,
          total_amount: payment_amount
        }
      });
    }

    // ★★★ 以下は通常の施術会計処理 ★★★
    let serviceData = { name: '', price: 0, duration: 0 };

    // 通常サービスの場合
    if (service_id && payment_type === 'normal') {
      const [serviceRows] = await connection.execute(
        'SELECT name, price, duration_minutes FROM services WHERE service_id = ?',
        [service_id]
      );
      if (serviceRows.length > 0) {
        serviceData = {
          name: serviceRows[0].name,
          price: serviceRows[0].price,
          duration: serviceRows[0].duration_minutes
        };
      }
    }

    // クーポンの場合
    if (payment_type === 'coupon' && coupon_id) {
      const [couponRows] = await connection.execute(
        'SELECT name, total_price FROM coupons WHERE coupon_id = ?',
        [coupon_id]
      );
      if (couponRows.length > 0) {
        serviceData = {
          name: couponRows[0].name,
          price: couponRows[0].total_price,
          duration: 0
        };
      }
    }

    // 期間限定オファーの場合
    if ((payment_type === 'limited_offer' || payment_type === 'limited') && limited_offer_id) {
      const [offerRows] = await connection.execute(
        'SELECT name, special_price FROM limited_offers WHERE offer_id = ?',
        [limited_offer_id]
      );
      if (offerRows.length > 0) {
        // ★ limited_purchase_idがある場合は「使用」なのでprice=0
        serviceData = {
          name: offerRows[0].name,
          price: limited_purchase_id ? 0 : offerRows[0].special_price,
          duration: 0
        };
      }
    }

    // 回数券使用の場合（★price=0）
    if (payment_type === 'ticket' && ticket_id) {
      const [ticketRows] = await connection.execute(
        `SELECT 
          tp.name as plan_name,
          s.name as service_name,
          s.price as service_price,
          s.duration_minutes
        FROM customer_tickets ct
        JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
        JOIN services s ON tp.service_id = s.service_id
        WHERE ct.customer_ticket_id = ?`,
        [ticket_id]
      );
      if (ticketRows.length > 0) {
        serviceData = {
          name: ticketRows[0].service_name,
          price: 0,  // ★回数券使用時は料金0
          duration: ticketRows[0].duration_minutes
        };
      }
    }

    // オプション処理
    let optionsTotal = 0;
    const optionDetails = [];

    for (const opt of options) {
      const [optRows] = await connection.execute(
        'SELECT name, category, price, duration_minutes FROM options WHERE option_id = ?',
        [opt.option_id]
      );

      if (optRows.length > 0) {
        const optData = optRows[0];
        const optPrice = opt.is_free ? 0 : optData.price * (opt.quantity || 1);
        optionsTotal += optPrice;

        optionDetails.push({
          option_id: opt.option_id,
          name: optData.name,
          category: optData.category,
          price: optData.price,
          duration: optData.duration_minutes,
          quantity: opt.quantity || 1,
          is_free: opt.is_free || false
        });
      }
    }

    // 金額計算
    const serviceSubtotal = serviceData.price;
    const totalAmount = serviceSubtotal + optionsTotal - discount_amount;

    // 決済金額按分
    let finalCashAmount = 0;
    let finalCardAmount = 0;

    if (payment_method === 'cash') {
      finalCashAmount = totalAmount;
    } else if (payment_method === 'card') {
      finalCardAmount = totalAmount;
    } else if (payment_method === 'mixed') {
      finalCashAmount = cash_amount || 0;
      finalCardAmount = card_amount || 0;
    }

    // payment_typeを正規化
    let normalizedPaymentType = payment_type;
    if (payment_type === 'limited') {
      normalizedPaymentType = 'limited_offer';
    }

    // ★ スナップショット変数
    let ticketSnapshot = { sessions: null, balance: null };
    let limitedSnapshot = { sessions: null, balance: null };

    // 回数券使用時：先に回数を減らしてからスナップショット取得
    if (ticket_id && payment_type === 'ticket') {
      await connection.execute(
        `UPDATE customer_tickets 
         SET sessions_remaining = sessions_remaining - 1
         WHERE customer_ticket_id = ?`,
        [ticket_id]
      );
      ticketSnapshot = await getTicketSnapshot(ticket_id);
    }

    // ★ 期間限定回数券使用時：残回数を減らしてスナップショット取得
    if (limited_purchase_id && (payment_type === 'limited_offer' || payment_type === 'limited')) {
      await connection.execute(
        `UPDATE limited_ticket_purchases 
         SET sessions_remaining = sessions_remaining - 1
         WHERE purchase_id = ?`,
        [limited_purchase_id]
      );
      limitedSnapshot = await getLimitedTicketSnapshot(limited_purchase_id);
    }

    // ★ 使用するスナップショットを決定
    const finalSnapshot = ticket_id ? ticketSnapshot : limitedSnapshot;
    const finalTicketId = ticket_id || limited_purchase_id;

    // payments テーブルに登録（★フラグ付き）
    await connection.execute(
      `INSERT INTO payments (
        payment_id,
        customer_id,
        booking_id,
        staff_id,
        service_id,
        service_name,
        service_price,
        service_duration,
        payment_type,
        ticket_id,
        ticket_sessions_at_payment,
        ticket_balance_at_payment,
        is_ticket_purchase,
        is_remaining_payment,
        is_immediate_use,
        coupon_id,
        limited_offer_id,
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
      ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_id,
        booking_id || null,
        staff_id,
        service_id || null,
        serviceData.name,
        serviceData.price,
        serviceData.duration,
        normalizedPaymentType,
        finalTicketId || null,  // ★期間限定の場合はpurchase_idを保存
        finalSnapshot.sessions,
        finalSnapshot.balance,
        false,  // is_ticket_purchase (購入はticket-purchasesで処理)
        false,  // is_remaining_payment
        false,  // is_immediate_use
        coupon_id || null,
        limited_offer_id || null,
        serviceSubtotal,
        optionsTotal,
        discount_amount,
        payment_amount,
        totalAmount,
        payment_method,
        finalCashAmount,
        finalCardAmount,
        notes,
        related_payment_id
      ]
    );

    const [paymentRow] = await connection.execute(
      `SELECT payment_id FROM payments 
       WHERE customer_id = ? AND staff_id = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [customer_id, staff_id]
    );
    const paymentId = paymentRow[0].payment_id;

    // オプション登録
    for (const opt of optionDetails) {
      await connection.execute(
        `INSERT INTO payment_options (
          payment_option_id,
          payment_id,
          option_id,
          option_name,
          option_category,
          price,
          duration_minutes,
          quantity,
          is_free
        ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentId,
          opt.option_id,
          opt.name,
          opt.category,
          opt.price,
          opt.duration,
          opt.quantity,
          opt.is_free
        ]
      );
    }

    // クーポン使用処理
    if (payment_type === 'coupon' && coupon_id) {
      await connection.execute(
        `INSERT INTO coupon_usage (usage_id, coupon_id, customer_id, payment_id, total_discount_amount) VALUES (UUID(), ?, ?, ?, ?)`,
        [coupon_id, customer_id, paymentId, discount_amount]
      );

      await connection.execute(
        `UPDATE coupons SET used_count = used_count + 1 WHERE coupon_id = ?`,
        [coupon_id]
      );
    }

    // 回数券使用処理（来店カウント）
    if (ticket_id && !related_payment_id) {
      const [ticketInfo] = await connection.execute(
        `SELECT tp.service_category 
         FROM customer_tickets ct
         JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
         WHERE ct.customer_ticket_id = ?`,
        [ticket_id]
      );

      if (ticketInfo.length > 0 && ticketInfo[0].service_category !== 'その他') {
        await connection.execute(
          `UPDATE customers SET visit_count = visit_count + 1 WHERE customer_id = ?`,
          [customer_id]
        );
      }
    }

    // ★ 期間限定回数券使用処理（来店カウント）
    if (limited_purchase_id && !related_payment_id) {
      await connection.execute(
        `UPDATE customers SET visit_count = visit_count + 1 WHERE customer_id = ?`,
        [customer_id]
      );
    }

    // 予約ステータス更新
    if (booking_id) {
      await connection.execute(
        `UPDATE bookings SET status = 'completed' WHERE booking_id = ?`,
        [booking_id]
      );
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: 'お会計を登録しました',
      data: {
        payment_id: paymentId,
        total_amount: totalAmount
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('お会計登録エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー: ' + error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// お会計キャンセル
export async function DELETE(request) {
  const pool = await getConnection();
  const connection = await pool.getConnection();

  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');
    const reason = searchParams.get('reason') || '';

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: '会計IDが必要です' },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    const [payment] = await connection.execute(
      'SELECT * FROM payments WHERE payment_id = ?',
      [paymentId]
    );

    if (payment.length === 0) {
      return NextResponse.json(
        { success: false, error: '会計が見つかりません' },
        { status: 404 }
      );
    }

    // 回数券使用の場合は回数を戻す
    if (payment[0].ticket_id && !payment[0].is_remaining_payment) {
      // 通常回数券の場合
      if (payment[0].payment_type === 'ticket') {
        await connection.execute(
          `UPDATE customer_tickets 
           SET sessions_remaining = sessions_remaining + 1
           WHERE customer_ticket_id = ?`,
          [payment[0].ticket_id]
        );
      }
      // 期間限定回数券の場合
      else if (payment[0].payment_type === 'limited_offer') {
        await connection.execute(
          `UPDATE limited_ticket_purchases 
           SET sessions_remaining = sessions_remaining + 1
           WHERE purchase_id = ?`,
          [payment[0].ticket_id]
        );
      }
    }

    // 会計をキャンセル状態に
    await connection.execute(
      `UPDATE payments 
       SET is_cancelled = TRUE, 
           cancelled_at = NOW(),
           cancelled_reason = ?
       WHERE payment_id = ?`,
      [reason, paymentId]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: 'お会計をキャンセルしました'
    });
  } catch (error) {
    await connection.rollback();
    console.error('会計キャンセルエラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}