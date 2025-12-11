// app/api/bookings/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../lib/db';
import { updateExcel } from '../../../lib/updateExcel';

// 予約一覧取得（N+1問題を解決）
export async function GET(request) {
  try {
    const pool = await getConnection();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const staffId = searchParams.get('staffId');
    const customerId = searchParams.get('customerId');
    const bookingId = searchParams.get('id');

    let query = `
      SELECT 
        b.booking_id,
        b.customer_id,
        b.staff_id,
        b.service_id,
        b.customer_ticket_id,
        b.coupon_id,
        b.limited_offer_id,
        b.date,
        b.start_time,
        b.end_time,
        b.bed_id,
        b.type,
        b.status,
        b.notes,
        b.created_at,
        c.last_name,
        c.first_name,
        s.name as staff_name,
        s.color as staff_color,
        sv_direct.name as direct_service_name,
        sv_direct.category as direct_service_category,
        tp.name as ticket_plan_name,
        sv_ticket.category as ticket_service_category,
        cp.name as coupon_name,
        cp.description as coupon_description,
        cp.total_price as coupon_price,
        lo.name as limited_offer_name,
        lo.description as limited_offer_description,
        lo.special_price as limited_offer_price,
        lo.total_sessions as limited_offer_sessions,
        COALESCE(cp.name, lo.name, tp.name, sv_direct.name) as service_name,
        CASE
          WHEN cp.coupon_id IS NOT NULL THEN 'クーポン'
          WHEN lo.offer_id IS NOT NULL THEN '期間限定'
          ELSE COALESCE(sv_direct.category, sv_ticket.category)
        END as service_category
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.customer_id
      LEFT JOIN staff s ON b.staff_id = s.staff_id
      LEFT JOIN services sv_direct ON b.service_id = sv_direct.service_id
      LEFT JOIN customer_tickets ct ON b.customer_ticket_id = ct.customer_ticket_id
      LEFT JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
      LEFT JOIN services sv_ticket ON tp.service_id = sv_ticket.service_id
      LEFT JOIN coupons cp ON b.coupon_id = cp.coupon_id
      LEFT JOIN limited_offers lo ON b.limited_offer_id = lo.offer_id
      WHERE 1=1
      AND b.status NOT IN ('cancelled', 'no_show')
    `;

    const params = [];

    if (bookingId) {
      query += ' AND b.booking_id = ?';
      params.push(bookingId);
    }

    if (date) {
      query += ' AND b.date = ?';
      params.push(date);
    }

    if (staffId) {
      query += ' AND b.staff_id = ?';
      params.push(staffId);
    }

    if (customerId) {
      query += ' AND b.customer_id = ?';
      params.push(customerId);
    }

    query += ' ORDER BY b.date, b.start_time';

    const [rows] = await pool.execute(query, params);

    if (rows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 関連オプション、チケット、期間限定オファーを一括取得
    const bookingIds = rows.map(r => r.booking_id);
    const placeholders = bookingIds.map(() => '?').join(',');

    const [allOptions] = await pool.execute(
      `SELECT bo.booking_id, o.option_id, o.name, o.duration_minutes, o.price
       FROM booking_options bo
       JOIN options o ON bo.option_id = o.option_id
       WHERE bo.booking_id IN (${placeholders})`,
      bookingIds
    );

    const [allTickets] = await pool.execute(
      `SELECT bt.booking_id, ct.customer_ticket_id, tp.name as plan_name, 
              ct.sessions_remaining, tp.total_sessions
       FROM booking_tickets bt
       JOIN customer_tickets ct ON bt.customer_ticket_id = ct.customer_ticket_id
       JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
       WHERE bt.booking_id IN (${placeholders})`,
      bookingIds
    );

    const [allLimitedOffers] = await pool.execute(
      `SELECT blo.booking_id, lo.offer_id, lo.name, lo.special_price
       FROM booking_limited_offers blo
       JOIN limited_offers lo ON blo.offer_id = lo.offer_id
       WHERE blo.booking_id IN (${placeholders})`,
      bookingIds
    );

    // マップ化
    const optionsMap = new Map();
    const ticketsMap = new Map();
    const limitedOffersMap = new Map();

    allOptions.forEach(opt => {
      if (!optionsMap.has(opt.booking_id)) {
        optionsMap.set(opt.booking_id, []);
      }
      optionsMap.get(opt.booking_id).push(opt);
    });

    allTickets.forEach(ticket => {
      if (!ticketsMap.has(ticket.booking_id)) {
        ticketsMap.set(ticket.booking_id, []);
      }
      ticketsMap.get(ticket.booking_id).push(ticket);
    });

    allLimitedOffers.forEach(offer => {
      if (!limitedOffersMap.has(offer.booking_id)) {
        limitedOffersMap.set(offer.booking_id, []);
      }
      limitedOffersMap.get(offer.booking_id).push(offer);
    });

    // 各予約に関連情報を付与
    const bookingsWithDetails = rows.map(booking => ({
      ...booking,
      options: optionsMap.get(booking.booking_id) || [],
      tickets: ticketsMap.get(booking.booking_id) || [],
      limitedOffers: limitedOffersMap.get(booking.booking_id) || []
    }));

    return NextResponse.json({
      success: true,
      data: bookingsWithDetails
    });
  } catch (error) {
    console.error('予約取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}

// 予約・予定新規登録
export async function POST(request) {
  const pool = await getConnection();
  const connection = await pool.getConnection();

  try {
    const body = await request.json();

    const {
      customer_id,
      staff_id,
      service_id,
      customer_ticket_ids,
      coupon_id,
      limited_offer_ids,
      date,
      start_time,
      end_time,
      bed_id,
      type = 'booking',
      status = 'confirmed',
      notes = '',
      option_ids = []
    } = body;

    if (type === 'schedule') {
      if (!staff_id || !date || !start_time || !end_time) {
        return NextResponse.json(
          { success: false, error: 'スタッフと日時を入力してください' },
          { status: 400 }
        );
      }
    } else {
      if (!staff_id || !date || !start_time || !end_time) {
        return NextResponse.json(
          { success: false, error: '必須項目を入力してください' },
          { status: 400 }
        );
      }

      if (!customer_id && !body.last_name && !body.first_name) {
        return NextResponse.json(
          { success: false, error: '顧客情報を入力してください' },
          { status: 400 }
        );
      }

      const hasTickets = customer_ticket_ids && customer_ticket_ids.length > 0;
      const hasLimitedOffers = limited_offer_ids && limited_offer_ids.length > 0;

      if (!service_id && !hasTickets && !coupon_id && !hasLimitedOffers) {
        return NextResponse.json(
          { success: false, error: '施術メニューを選択してください' },
          { status: 400 }
        );
      }
    }

    await connection.beginTransaction();

    let finalCustomerId = customer_id;

    // 新規顧客の場合
    if (type === 'booking' && !customer_id && body.last_name && body.first_name) {
      await connection.execute(
        `INSERT INTO customers (
          customer_id,
          last_name,
          first_name,
          last_name_kana,
          first_name_kana,
          phone_number,
          email,
          birth_date,
          gender
        ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          body.last_name,
          body.first_name,
          body.last_name_kana || '',
          body.first_name_kana || '',
          body.phone_number || '',
          body.email || '',
          body.birth_date || null,
          body.gender || 'not_specified'
        ]
      );

      const [customerRow] = await connection.execute(
        'SELECT customer_id FROM customers WHERE phone_number = ? ORDER BY created_at DESC LIMIT 1',
        [body.phone_number]
      );
      finalCustomerId = customerRow[0].customer_id;
    }

    // 予約を登録
    await connection.execute(
      `INSERT INTO bookings (
        booking_id,
        customer_id,
        staff_id,
        service_id,
        customer_ticket_id,
        coupon_id,
        limited_offer_id,
        date,
        start_time,
        end_time,
        bed_id,
        type,
        status,
        notes
      ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalCustomerId,
        staff_id,
        service_id ?? null,
        customer_ticket_ids && customer_ticket_ids.length > 0 ? customer_ticket_ids[0] : null,
        coupon_id ?? null,
        limited_offer_ids && limited_offer_ids.length > 0 ? limited_offer_ids[0] : null,
        date,
        start_time,
        end_time,
        bed_id ?? null,
        type,
        status,
        notes
      ]
    );

    const [bookingRow] = await connection.execute(
      `SELECT booking_id FROM bookings 
       WHERE staff_id = ? AND date = ? AND start_time = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [staff_id, date, start_time]
    );
    const bookingId = bookingRow[0].booking_id;

    // 回数券を紐付け
    if (customer_ticket_ids && customer_ticket_ids.length > 0) {
      for (const ticketId of customer_ticket_ids) {
        await connection.execute(
          `INSERT INTO booking_tickets (booking_id, customer_ticket_id)
           VALUES (?, ?)`,
          [bookingId, ticketId]
        );
      }
    }

    // 期間限定オファーを紐付け
    if (limited_offer_ids && limited_offer_ids.length > 0) {
      for (const offerId of limited_offer_ids) {
        await connection.execute(
          `INSERT INTO booking_limited_offers (
            booking_limited_offer_id,
            booking_id,
            offer_id
          ) VALUES (UUID(), ?, ?)`,
          [bookingId, offerId]
        );
      }
    }

    // オプションを紐付け
    if (type === 'booking' && option_ids && option_ids.length > 0) {
      for (const optionId of option_ids) {
        await connection.execute(
          `INSERT INTO booking_options (
            booking_option_id,
            booking_id,
            option_id
          ) VALUES (UUID(), ?, ?)`,
          [bookingId, optionId]
        );
      }
    }

    await connection.commit();

    // ★Excel更新処理（Node.js版）
    if (type === 'booking' && finalCustomerId) {
      try {
        const [bookingDetail] = await pool.execute(
          `SELECT 
            b.date,
            c.last_name,
            c.first_name,
            c.base_visit_count,
            s.name as staff_name
          FROM bookings b
          LEFT JOIN customers c ON b.customer_id = c.customer_id
          LEFT JOIN staff s ON b.staff_id = s.staff_id
          WHERE b.booking_id = ?`,
          [bookingId]
        );

        if (bookingDetail.length > 0) {
          const booking = bookingDetail[0];

          // 来店回数: customersテーブルのvisit_countを取得
          const [customerRows] = await pool.execute(
            `SELECT visit_count FROM customers WHERE customer_id = ?`,
            [finalCustomerId]
          );
          const currentVisitCount = parseInt(customerRows[0]?.visit_count) || 0;

          // 回数券使用予約かつservice_categoryが「その他」以外の場合のみ+1
          let shouldCountVisit = false;
          if (customer_ticket_ids && customer_ticket_ids.length > 0) {
            const [ticketInfo] = await pool.execute(
              `SELECT tp.service_category 
               FROM customer_tickets ct
               JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
               WHERE ct.customer_ticket_id = ?`,
              [customer_ticket_ids[0]]
            );
            if (ticketInfo.length > 0 && ticketInfo[0].service_category !== 'その他') {
              shouldCountVisit = true;
            }
          }

          const totalVisitCount = shouldCountVisit ? currentVisitCount + 1 : currentVisitCount;

          // 日付をYYYY-MM-DD形式に変換
          let dateStr = booking.date;
          if (booking.date instanceof Date) {
            dateStr = booking.date.toISOString().split('T')[0];
          } else if (typeof booking.date === 'string' && booking.date.includes('T')) {
            dateStr = booking.date.split('T')[0];
          }

          const bookingData = {
            date: dateStr,
            customer_name: `${booking.last_name} ${booking.first_name}`,
            staff_name: booking.staff_name || '未設定',
            visit_count: totalVisitCount
          };

          // Node.js版でExcel更新
          const result = await updateExcel(bookingData);
          if (!result.success) {
            console.error('Excel更新エラー:', result.error);
          }
        }
      } catch (excelError) {
        console.error('Excel更新エラー（予約は登録済み）:', excelError);
      }
    }

    return NextResponse.json({
      success: true,
      message: type === 'schedule' ? '予定を登録しました' : '予約を登録しました',
      data: {
        booking_id: bookingId,
        customer_id: finalCustomerId
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('登録エラー:', error);
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

// 予約更新
export async function PUT(request) {
  const pool = await getConnection();
  const connection = await pool.getConnection();

  try {
    const body = await request.json();

    const {
      booking_id,
      date,
      start_time,
      end_time,
      staff_id,
      bed_id,
      status,
      notes
    } = body;

    if (!booking_id) {
      return NextResponse.json(
        { success: false, error: '予約IDが必要です' },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    const [beforeData] = await connection.execute(
      'SELECT * FROM bookings WHERE booking_id = ?',
      [booking_id]
    );

    if (beforeData.length === 0) {
      return NextResponse.json(
        { success: false, error: '予約が見つかりません' },
        { status: 404 }
      );
    }

    const before = beforeData[0];

    await connection.execute(
      `UPDATE bookings 
       SET date = ?,
           start_time = ?,
           end_time = ?,
           staff_id = ?,
           bed_id = ?,
           status = ?,
           notes = ?
       WHERE booking_id = ?`,
      [date, start_time, end_time, staff_id, bed_id, status, notes, booking_id]
    );

    const changes = {
      before: {
        date: before.date,
        start_time: before.start_time,
        end_time: before.end_time,
        staff_id: before.staff_id,
        bed_id: before.bed_id,
        status: before.status,
        notes: before.notes
      },
      after: {
        date,
        start_time,
        end_time,
        staff_id,
        bed_id,
        status,
        notes
      }
    };

    await connection.execute(
      `INSERT INTO booking_history (
        history_id,
        booking_id,
        change_type,
        details
      ) VALUES (UUID(), ?, 'update', ?)`,
      [booking_id, JSON.stringify(changes)]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: '予約を更新しました'
    });
  } catch (error) {
    await connection.rollback();
    console.error('予約更新エラー:', error);
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

// 予約削除/キャンセル
export async function DELETE(request) {
  const pool = await getConnection();
  const connection = await pool.getConnection();

  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('id');
    const cancelType = searchParams.get('cancelType');

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: '予約IDが必要です' },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    const [booking] = await connection.execute(
      'SELECT * FROM bookings WHERE booking_id = ?',
      [bookingId]
    );

    if (booking.length === 0) {
      return NextResponse.json(
        { success: false, error: '予約が見つかりません' },
        { status: 404 }
      );
    }

    const bookingData = booking[0];

    const cancelDetails = {
      ...bookingData,
      cancel_type: cancelType || 'unknown',
      cancelled_at: new Date().toISOString()
    };

    await connection.execute(
      `INSERT INTO booking_history (
        history_id,
        booking_id,
        change_type,
        details
      ) VALUES (UUID(), ?, ?, ?)`,
      [
        bookingId,
        cancelType === 'no_contact' ? 'no_show' : 'cancel',
        JSON.stringify(cancelDetails)
      ]
    );

    const cancelStatus = cancelType === 'no_contact' ? 'no_show' : 'cancelled';

    await connection.execute(
      `UPDATE bookings SET status = ? WHERE booking_id = ?`,
      [cancelStatus, bookingId]
    );

    await connection.commit();

    const message = cancelType === 'no_contact'
      ? '予約をキャンセルしました(無断キャンセル)'
      : '予約をキャンセルしました';

    return NextResponse.json({
      success: true,
      message
    });
  } catch (error) {
    await connection.rollback();
    console.error('予約削除エラー:', error);
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