// app/api/customers/[id]/visit-history/route.js - フラグ対応版
import { NextResponse } from 'next/server';
import { getConnection } from '../../../../../lib/db';

export async function GET(request, { params }) {
  try {
    const pool = await getConnection();
    const { id: customerId } = await params;
    const connection = await pool.getConnection();

    // ★改善ポイント1: 再帰CTEで親・子・孫の支払いを1回のクエリで取得（フラグ追加）
    const [payments] = await connection.query(`
      WITH RECURSIVE payment_tree AS (
        -- 親支払い（related_payment_idがNULL）
        SELECT 
          p.payment_id,
          p.payment_date,
          p.service_name,
          p.service_price,
          p.service_id,
          p.payment_type,
          p.payment_method,
          p.total_amount,
          p.ticket_id,
          p.coupon_id,
          p.limited_offer_id,
          p.notes,
          p.related_payment_id,
          p.payment_amount,
          p.is_cancelled,
          p.is_ticket_purchase,
          p.is_remaining_payment,
          p.is_immediate_use,
          s.name as staff_name,
          DATE(p.payment_date) as date,
          p.payment_date as payment_datetime,
          0 as level,
          p.payment_id as root_payment_id
        FROM payments p
        LEFT JOIN staff s ON p.staff_id = s.staff_id
        WHERE p.customer_id = ? 
          AND p.related_payment_id IS NULL
        
        UNION ALL
        
        -- 子・孫支払い（再帰的に取得）
        SELECT 
          p.payment_id,
          p.payment_date,
          p.service_name,
          p.service_price,
          p.service_id,
          p.payment_type,
          p.payment_method,
          p.total_amount,
          p.ticket_id,
          p.coupon_id,
          p.limited_offer_id,
          p.notes,
          p.related_payment_id,
          p.payment_amount,
          p.is_cancelled,
          p.is_ticket_purchase,
          p.is_remaining_payment,
          p.is_immediate_use,
          s.name as staff_name,
          DATE(p.payment_date) as date,
          p.payment_date as payment_datetime,
          pt.level + 1,
          pt.root_payment_id
        FROM payments p
        INNER JOIN payment_tree pt ON p.related_payment_id = pt.payment_id
        LEFT JOIN staff s ON p.staff_id = s.staff_id
      )
      SELECT * FROM payment_tree
      ORDER BY root_payment_id, level, payment_date ASC
    `, [customerId]);

    // ★改善ポイント2: オプション情報を1回のクエリで全件取得
    const paymentIds = [...new Set(payments.map(p => p.payment_id))];
    let optionsMap = new Map();
    
    if (paymentIds.length > 0) {
      const placeholders = paymentIds.map(() => '?').join(',');
      const [options] = await connection.query(`
        SELECT 
          payment_id,
          option_name,
          price,
          is_free
        FROM payment_options
        WHERE payment_id IN (${placeholders})
      `, paymentIds);
      
      options.forEach(opt => {
        if (!optionsMap.has(opt.payment_id)) {
          optionsMap.set(opt.payment_id, []);
        }
        optionsMap.get(opt.payment_id).push({
          option_name: opt.option_name,
          price: opt.price,
          is_free: opt.is_free
        });
      });
    }

    // ★改善ポイント3: チケット情報を1回のクエリで全件取得
    const ticketIds = [...new Set(payments.filter(p => p.ticket_id).map(p => p.ticket_id))];
    let ticketInfoMap = new Map();
    
    if (ticketIds.length > 0) {
      const placeholders = ticketIds.map(() => '?').join(',');
      const [ticketInfo] = await connection.query(`
        SELECT 
          ct.customer_ticket_id,
          tp.name as plan_name,
          tp.total_sessions,
          s.name as service_name
        FROM customer_tickets ct
        JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
        LEFT JOIN services s ON tp.service_id = s.service_id
        WHERE ct.customer_ticket_id IN (${placeholders})
      `, ticketIds);
      
      ticketInfo.forEach(info => {
        ticketInfoMap.set(info.customer_ticket_id, {
          plan_name: info.plan_name,
          total_sessions: info.total_sessions,
          service_name: info.service_name
        });
      });
    }

    // ★改善ポイント4: クーポン情報を1回のクエリで全件取得
    const couponIds = [...new Set(payments.filter(p => p.coupon_id).map(p => p.coupon_id))];
    let couponInfoMap = new Map();
    
    if (couponIds.length > 0) {
      const placeholders = couponIds.map(() => '?').join(',');
      const [couponInfo] = await connection.query(`
        SELECT 
          coupon_id,
          name as coupon_name,
          description
        FROM coupons
        WHERE coupon_id IN (${placeholders})
      `, couponIds);
      
      couponInfo.forEach(info => {
        couponInfoMap.set(info.coupon_id, {
          coupon_name: info.coupon_name,
          description: info.description
        });
      });
    }

    // ★改善ポイント5: 期間限定オファー情報を1回のクエリで全件取得
    const offerIds = [...new Set(payments.filter(p => p.limited_offer_id).map(p => p.limited_offer_id))];
    let offerInfoMap = new Map();
    
    if (offerIds.length > 0) {
      const placeholders = offerIds.map(() => '?').join(',');
      const [offerInfo] = await connection.query(`
        SELECT 
          offer_id,
          name,
          description,
          total_sessions
        FROM limited_offers
        WHERE offer_id IN (${placeholders})
      `, offerIds);
      
      offerInfo.forEach(info => {
        offerInfoMap.set(info.offer_id, {
          offer_name: info.name,
          description: info.description,
          sessions: info.total_sessions
        });
      });
    }

    // キャンセルされた予約を取得
    const [cancelledBookings] = await connection.query(`
      SELECT 
        bh.history_id,
        bh.booking_id,
        bh.changed_at,
        bh.change_type,
        bh.details,
        b.date,
        b.start_time,
        sv.name as service_name,
        s.name as staff_name,
        'cancelled_booking' as record_type
      FROM booking_history bh
      JOIN bookings b ON bh.booking_id = b.booking_id
      LEFT JOIN services sv ON b.service_id = sv.service_id
      LEFT JOIN staff s ON b.staff_id = s.staff_id
      WHERE b.customer_id = ? 
        AND bh.change_type IN ('cancel', 'no_show')
      ORDER BY bh.changed_at DESC
    `, [customerId]);

    const visitHistory = [];

    // 親支払いごとにグループ化
    const paymentGroups = new Map();
    payments.forEach(payment => {
      const rootId = payment.root_payment_id;
      if (!paymentGroups.has(rootId)) {
        paymentGroups.set(rootId, []);
      }
      paymentGroups.get(rootId).push(payment);
    });

    // 支払い履歴の処理
    for (const [rootId, paymentGroup] of paymentGroups) {
      const payment = paymentGroup[0]; // 親支払い
      const allChildPayments = paymentGroup.slice(1); // 子・孫支払い

      // オプション情報を取得（既に取得済みのMapから）
      const options = optionsMap.get(payment.payment_id) || [];

      let serviceDisplay = payment.service_name;
      let detailInfo = null;
      let ticketPurchases = [];
      let ticketUses = [];
      
      // ★重要: 合計金額の計算（親のtotal_amountから開始）
      let totalAmount = payment.total_amount;

      const immediateUseMap = new Map();

      // ★フラグ対応: 初回使用フラグの設定
      for (const child of allChildPayments) {
        if (child.is_immediate_use && child.ticket_id) {
          immediateUseMap.set(child.ticket_id, true);
        }
      }

      // ★フラグ対応: 親が回数券購入かどうか
      const isParentTicketPurchase = !!payment.is_ticket_purchase;

      // ★フラグ対応: 親が回数券使用かどうか
      const isParentTicketUse = payment.payment_type === 'ticket' && 
        payment.ticket_id && 
        !isParentTicketPurchase &&
        !payment.is_remaining_payment;

      // キャンセルされた支払いの場合
      if (payment.is_cancelled) {
        visitHistory.push({
          id: `cancelled_payment_${payment.payment_id}`,
          payment_id: payment.payment_id,
          date: payment.date,
          service: payment.service_name,
          price: payment.service_price,
          staff: payment.staff_name || '不明',
          payment_type: payment.payment_type,
          payment_method: payment.payment_method,
          amount: payment.total_amount,
          record_type: 'cancelled_payment',
          is_cancelled: true,
          options: [],
          detail_info: null,
          ticket_purchases: []
        });
        continue;
      }

      // 親が回数券購入の場合
      if (isParentTicketPurchase && payment.ticket_id) {
        const ticketInfo = ticketInfoMap.get(payment.ticket_id);
        if (ticketInfo) {
          const hasImmediateUse = immediateUseMap.get(payment.ticket_id) || false;
          ticketPurchases.push({
            plan_name: ticketInfo.plan_name,
            service_name: ticketInfo.service_name,
            total_sessions: ticketInfo.total_sessions,
            amount: payment.total_amount,
            is_immediate_use: hasImmediateUse
          });
          serviceDisplay = `${ticketInfo.service_name || '回数券'}`;
        }
      }

      // 子・孫の支払いを処理
      for (const child of allChildPayments) {
        // ★フラグ対応: 初回使用レコードはスキップ（金額に含めない）
        if (child.is_immediate_use) {
          continue;
        }
        
        // ★フラグ対応: 回数券購入の子レコード
        if (child.is_ticket_purchase) {
          // ★重要: 回数券購入の金額を加算
          totalAmount += child.total_amount;

          const ticketInfo = ticketInfoMap.get(child.ticket_id);
          if (ticketInfo) {
            const hasImmediateUse = immediateUseMap.get(child.ticket_id) || false;
            ticketPurchases.push({
              plan_name: ticketInfo.plan_name,
              service_name: ticketInfo.service_name,
              total_sessions: ticketInfo.total_sessions,
              amount: child.total_amount,
              is_immediate_use: hasImmediateUse
            });
          }
        } 
        // ★フラグ対応: 残金支払いの子レコード
        else if (child.is_remaining_payment) {
          // 残金支払いがある場合は金額を加算
          if (child.payment_amount > 0) {
            totalAmount += child.payment_amount;
          }
          // 残金支払いレコードはticketUsesに追加しない
          continue;
        }
        // 回数券使用の子レコード
        else if (child.payment_type === 'ticket' && child.ticket_id) {
          // ★重要: 残金支払いがある場合は加算
          if (child.payment_amount > 0) {
            totalAmount += child.payment_amount;
          }

          const ticketInfo = ticketInfoMap.get(child.ticket_id);
          if (ticketInfo) {
            ticketUses.push({
              plan_name: ticketInfo.plan_name,
              remaining_payment: child.payment_amount || 0
            });
          }
        }
      }

      // 親が回数券使用の場合
      if (isParentTicketUse) {
        const ticketInfo = ticketInfoMap.get(payment.ticket_id);
        if (ticketInfo) {
          ticketUses.unshift({
            plan_name: ticketInfo.plan_name,
            remaining_payment: payment.payment_amount || 0
          });
        }
      }

      // detail_infoの構築
      if (ticketUses.length > 0) {
        detailInfo = {
          type: 'ticket_use',
          ticket_uses: ticketUses,
          total_remaining_payment: ticketUses.reduce((sum, t) => sum + (t.remaining_payment || 0), 0)
        };
      } else if (payment.payment_type === 'coupon' && payment.coupon_id) {
        const couponInfo = couponInfoMap.get(payment.coupon_id);
        if (couponInfo) {
          detailInfo = {
            type: 'coupon',
            coupon_name: couponInfo.coupon_name,
            description: couponInfo.description
          };
        }
      } else if (payment.payment_type === 'limited_offer' && payment.limited_offer_id) {
        const offerInfo = offerInfoMap.get(payment.limited_offer_id);
        if (offerInfo) {
          detailInfo = {
            type: 'limited_offer',
            offer_name: offerInfo.offer_name,
            description: offerInfo.description,
            sessions: offerInfo.sessions
          };
        }
      }

      visitHistory.push({
        id: `payment_${payment.payment_id}`,
        payment_id: payment.payment_id,
        date: payment.date,
        payment_datetime: payment.payment_datetime, // ★時間情報を保持
        service: isParentTicketPurchase || isParentTicketUse ? '' : serviceDisplay,
        price: payment.service_price,
        staff: payment.staff_name || '不明',
        payment_type: payment.payment_type,
        payment_method: payment.payment_method,
        amount: totalAmount, // ★修正: 親+子+孫の合計金額
        record_type: 'payment',
        is_cancelled: false,
        options: options,
        detail_info: detailInfo,
        ticket_purchases: ticketPurchases
      });
    }

    // キャンセルされた予約を追加
    for (const booking of cancelledBookings) {
      const isNoShow = booking.change_type === 'no_show';
      
      let cancelReason = '';
      
      if (booking.details) {
        try {
          const details = typeof booking.details === 'string' 
            ? JSON.parse(booking.details) 
            : booking.details;
          
          cancelReason = details.notes || details.reason || details.cancel_reason || '';
        } catch (e) {
          console.error('JSON parse error:', e);
        }
      }
      
      const cancelType = isNoShow ? '無断キャンセル' : '連絡ありキャンセル';
      const cancelInfo = cancelReason ? `${cancelType} (${cancelReason})` : cancelType;
      
      visitHistory.push({
        id: `booking_${booking.booking_id}_${booking.history_id}`,
        booking_id: booking.booking_id,
        date: booking.date,
        payment_datetime: booking.changed_at, // ★キャンセル時刻を保持
        start_time: booking.start_time,
        service: `${booking.service_name || '予約'} - ${cancelInfo}`,
        staff: booking.staff_name || '不明',
        record_type: 'cancelled_booking',
        is_cancelled: true,
        cancel_type: cancelType,
        cancel_notes: cancelReason
      });
    }

    // 日付と時間を含めてソート(新しい順)
    visitHistory.sort((a, b) => {
      const dateTimeA = new Date(a.payment_datetime || a.date);
      const dateTimeB = new Date(b.payment_datetime || b.date);
      return dateTimeB - dateTimeA;
    });

    connection.release();

    return NextResponse.json({
      success: true,
      data: visitHistory
    });

  } catch (error) {
    console.error('来店履歴取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}