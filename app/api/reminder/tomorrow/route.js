// app/api/reminder/tomorrow/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';

// LINE Messaging API
async function getLineClient() {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return null;
  }
  const { messagingApi } = await import('@line/bot-sdk');
  const { MessagingApiClient } = messagingApi;
  return new MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  });
}

// メニュー種別を判定
function determineMenuType(booking) {
  const options = booking.options || [];
  
  // キャビテーションサービスのID
  const CAVI_SERVICE_ID = '2ffd7ad2-9eae-11f0-a8d1-362b931374cc';
  
  // 90分コルギのサービスID
  const KORGI_90MIN_SERVICE_ID = '937a225d-9d10-11f0-8e8d-b2353c7546ec';
  
  // キャビオプションのID一覧
  const CAVI_OPTION_IDS = [
    'd5f10ed4-a2b1-11f0-89d9-420dd1dcc76b',
    'e2370141-a2b1-11f0-89d9-420dd1dcc76b',
    'ffcfa11e-a2b1-11f0-89d9-420dd1dcc76b'
  ];
  
  // サービスIDを特定（通常予約、回数券、期間限定の順で確認）
  let serviceId = booking.service_id || null;
  let is90min = false;
  
  // 回数券の場合、ticket_plansのservice_idを使用
  if (!serviceId && booking.tickets && booking.tickets.length > 0) {
    serviceId = booking.tickets[0].service_id;
  }
  
  // サービスIDで90分判定
  if (serviceId === KORGI_90MIN_SERVICE_ID) {
    is90min = true;
  }
  
  // 期間限定の場合、base_plan_id経由のservice_idで判定
  if (!serviceId && booking.limited_offers && booking.limited_offers.length > 0) {
    const limitedOffer = booking.limited_offers[0];
    // base_plan_id経由でservice_idを取得
    if (limitedOffer.service_id) {
      serviceId = limitedOffer.service_id;
      // 期間限定のservice_idでも90分判定
      if (serviceId === KORGI_90MIN_SERVICE_ID) {
        is90min = true;
      }
    }
    // service_idがない場合はduration_minutesで判定（フォールバック）
    else if (limitedOffer.duration_minutes === 90) {
      is90min = true;
    }
  }
  
  // bookings.limited_offer_idからも確認
  if (!serviceId && !is90min && booking.limited_duration) {
    if (booking.limited_duration === 90) {
      is90min = true;
    }
  }
  
  // クーポンのみで他に情報がない場合はnullを返す（モーダルで選択）
  if (!serviceId && !is90min && booking.coupon_id && 
      (!booking.tickets || booking.tickets.length === 0) && 
      (!booking.limited_offers || booking.limited_offers.length === 0)) {
    return null; // クーポンの場合は選択が必要
  }
  
  // キャビのみ（サービスIDで判定）
  if (serviceId === CAVI_SERVICE_ID) {
    return 'キャビ';
  }
  
  // オプションを分類
  const caviOptions = options.filter(opt => CAVI_OPTION_IDS.includes(opt.option_id));
  const otherOptions = options.filter(opt => !CAVI_OPTION_IDS.includes(opt.option_id));
  
  const hasCaviOption = caviOptions.length > 0;
  const hasOtherOption = otherOptions.length > 0;
  
  if (hasCaviOption && (hasOtherOption || is90min)) {
    // キャビオプション + 他オプション（または90分）
    return 'コルギ+オプション+キャビ';
  }
  
  if (hasCaviOption && !hasOtherOption && !is90min) {
    // キャビオプションのみ（60分）
    return 'コルギ+キャビ';
  }
  
  if (hasOtherOption || is90min) {
    // キャビなしでオプションあり、または90分
    return 'コルギ+オプション';
  }
  
  // オプションなし（60分）
  return 'コルギ';
}

// 曜日を取得
function getDayOfWeek(dateStr) {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const date = new Date(dateStr);
  return days[date.getDay()];
}

// リマインドメッセージを生成
function generateReminderMessage(booking, menuTypeOverride = null) {
  const menuType = menuTypeOverride || determineMenuType(booking) || 'メニュー';
  const date = new Date(booking.date);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = getDayOfWeek(booking.date);
  
  // 時間フォーマット (HH:MM)
  const startTime = booking.start_time.substring(0, 5);
  
  const message = `${booking.last_name}　${booking.first_name}様
いつもお世話になっております。
明日${month}月${day}日(${dayOfWeek})${startTime}～　
メニュー【${menuType}】
上記にてご予約いただいています🍀
明日はお気をつけてお越しください🦆
ご来店心よりお待ちしております💕
美骨小顔サロンＡＢＢＹ`;

  return message;
}

// GET: 翌日の予約一覧を取得 or 送信状況を取得
export async function GET(request) {
  try {
    const pool = await getConnection();
    const { searchParams } = new URL(request.url);
    const statusOnly = searchParams.get('statusOnly');
    
    // 翌日の日付を計算
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // 送信状況のみ取得（ボタン表示用）
    if (statusOnly === 'true') {
      // 翌日の予約数を取得
      const [bookingCount] = await pool.query(`
        SELECT COUNT(*) as total
        FROM bookings b
        JOIN customers c ON b.customer_id = c.customer_id
        WHERE b.date = ?
          AND b.status IN ('confirmed', 'pending')
          AND b.type = 'booking'
      `, [tomorrowStr]);
      
      // LINE連携済みの予約数
      const [lineCount] = await pool.query(`
        SELECT COUNT(*) as total
        FROM bookings b
        JOIN customers c ON b.customer_id = c.customer_id
        WHERE b.date = ?
          AND b.status IN ('confirmed', 'pending')
          AND b.type = 'booking'
          AND c.line_user_id IS NOT NULL
          AND c.line_user_id != ''
      `, [tomorrowStr]);
      
      // 今日送信済みの数（翌日の予約に対して）
      const today = new Date().toISOString().split('T')[0];
      const [sentCount] = await pool.query(`
        SELECT COUNT(DISTINCT ml.related_booking_id) as total
        FROM messaging_log ml
        JOIN bookings b ON ml.related_booking_id = b.booking_id
        WHERE ml.message_type = 'reminder'
          AND DATE(ml.sent_at) = ?
          AND b.date = ?
      `, [today, tomorrowStr]);
      
      return NextResponse.json({
        success: true,
        date: tomorrowStr,
        totalBookings: bookingCount[0].total,
        lineConnected: lineCount[0].total,
        sentToday: sentCount[0].total
      });
    }
    
    // 翌日の予約を取得（confirmed/pending のみ）
    const [bookings] = await pool.query(`
      SELECT 
        b.booking_id,
        b.date,
        b.start_time,
        b.end_time,
        b.status,
        c.customer_id,
        c.last_name,
        c.first_name,
        c.line_user_id,
        s.name AS service_name,
        s.service_id,
        cp.name AS coupon_name,
        cp.coupon_id,
        lo.name AS limited_offer_name,
        lo.offer_id AS limited_offer_id,
        lo.duration_minutes AS limited_duration
      FROM bookings b
      JOIN customers c ON b.customer_id = c.customer_id
      LEFT JOIN services s ON b.service_id = s.service_id
      LEFT JOIN coupons cp ON b.coupon_id = cp.coupon_id
      LEFT JOIN limited_offers lo ON b.limited_offer_id = lo.offer_id
      WHERE b.date = ?
        AND b.status IN ('confirmed', 'pending')
        AND b.type = 'booking'
      ORDER BY b.start_time ASC
    `, [tomorrowStr]);
    
    // 各予約のオプション・回数券・期間限定情報を取得
    for (const booking of bookings) {
      // オプション取得
      const [options] = await pool.query(`
        SELECT o.option_id, o.name, o.category
        FROM booking_options bo
        JOIN options o ON bo.option_id = o.option_id
        WHERE bo.booking_id = ?
      `, [booking.booking_id]);
      booking.options = options;
      
      // 回数券情報を取得（service_idを特定するため）
      const [tickets] = await pool.query(`
        SELECT tp.service_id, tp.name as plan_name
        FROM booking_tickets bt
        JOIN customer_tickets ct ON bt.customer_ticket_id = ct.customer_ticket_id
        JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
        WHERE bt.booking_id = ?
      `, [booking.booking_id]);
      booking.tickets = tickets;
      
      // 期間限定情報を取得（base_plan_id経由でservice_idも取得）
      const [limitedOffers] = await pool.query(`
        SELECT lo.offer_id, lo.duration_minutes, lo.name, lo.base_plan_id, tp.service_id
        FROM booking_limited_offers blo
        JOIN limited_offers lo ON blo.offer_id = lo.offer_id
        LEFT JOIN ticket_plans tp ON lo.base_plan_id = tp.plan_id
        WHERE blo.booking_id = ?
      `, [booking.booking_id]);
      booking.limited_offers = limitedOffers;
      
      // メニュー種別を判定
      booking.menu_type = determineMenuType(booking);
      
      // クーポン予約かどうかのフラグ
      booking.is_coupon = !!(booking.coupon_id && !booking.service_id && booking.tickets.length === 0 && booking.limited_offers.length === 0);
      
      // プレビューメッセージを生成（クーポンで未選択の場合はnull）
      if (booking.menu_type) {
        booking.preview_message = generateReminderMessage(booking);
      } else {
        booking.preview_message = null;
      }
    }
    
    // 今日送信済みの予約IDを取得
    const today = new Date().toISOString().split('T')[0];
    const [sentLogs] = await pool.query(`
      SELECT DISTINCT related_booking_id
      FROM messaging_log
      WHERE message_type = 'reminder'
        AND DATE(sent_at) = ?
        AND related_booking_id IS NOT NULL
    `, [today]);
    
    const sentBookingIds = new Set(sentLogs.map(l => l.related_booking_id));
    
    // 各予約に送信済みフラグを追加
    for (const booking of bookings) {
      booking.sent_today = sentBookingIds.has(booking.booking_id);
    }
    
    return NextResponse.json({
      success: true,
      date: tomorrowStr,
      bookings: bookings
    });
    
  } catch (error) {
    console.error('翌日予約取得エラー:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// POST: LINE送信
export async function POST(request) {
  try {
    const { bookingIds, menuTypeOverrides = {} } = await request.json();
    
    if (!bookingIds || bookingIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: '送信対象が選択されていません' 
      }, { status: 400 });
    }
    
    const pool = await getConnection();
    const client = await getLineClient();
    
    if (!client) {
      return NextResponse.json({ 
        success: false, 
        error: 'LINE APIが設定されていません' 
      }, { status: 500 });
    }
    
    // 翌日の日付
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // 選択された予約を取得
    const placeholders = bookingIds.map(() => '?').join(',');
    const [bookings] = await pool.query(`
      SELECT 
        b.booking_id,
        b.date,
        b.start_time,
        c.customer_id,
        c.last_name,
        c.first_name,
        c.line_user_id,
        s.name AS service_name,
        s.service_id,
        cp.name AS coupon_name,
        cp.coupon_id,
        lo.duration_minutes AS limited_duration
      FROM bookings b
      JOIN customers c ON b.customer_id = c.customer_id
      LEFT JOIN services s ON b.service_id = s.service_id
      LEFT JOIN coupons cp ON b.coupon_id = cp.coupon_id
      LEFT JOIN limited_offers lo ON b.limited_offer_id = lo.offer_id
      WHERE b.booking_id IN (${placeholders})
        AND c.line_user_id IS NOT NULL
        AND c.line_user_id != ''
    `, bookingIds);
    
    // 各予約の追加情報を取得
    for (const booking of bookings) {
      // オプション取得
      const [options] = await pool.query(`
        SELECT o.option_id, o.name, o.category
        FROM booking_options bo
        JOIN options o ON bo.option_id = o.option_id
        WHERE bo.booking_id = ?
      `, [booking.booking_id]);
      booking.options = options;
      
      // 回数券情報を取得
      const [tickets] = await pool.query(`
        SELECT tp.service_id, tp.name as plan_name
        FROM booking_tickets bt
        JOIN customer_tickets ct ON bt.customer_ticket_id = ct.customer_ticket_id
        JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
        WHERE bt.booking_id = ?
      `, [booking.booking_id]);
      booking.tickets = tickets;
      
      // 期間限定情報を取得（base_plan_id経由でservice_idも取得）
      const [limitedOffers] = await pool.query(`
        SELECT lo.offer_id, lo.duration_minutes, lo.name, lo.base_plan_id, tp.service_id
        FROM booking_limited_offers blo
        JOIN limited_offers lo ON blo.offer_id = lo.offer_id
        LEFT JOIN ticket_plans tp ON lo.base_plan_id = tp.plan_id
        WHERE blo.booking_id = ?
      `, [booking.booking_id]);
      booking.limited_offers = limitedOffers;
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // 各顧客にメッセージ送信
    for (const booking of bookings) {
      try {
        // メニュータイプを決定（overridesがあればそれを使う）
        const menuType = menuTypeOverrides[booking.booking_id] || determineMenuType(booking);
        
        if (!menuType) {
          errorCount++;
          errors.push(`${booking.last_name}${booking.first_name}: メニュータイプが未選択です`);
          continue;
        }
        
        const message = generateReminderMessage(booking, menuType);
        
        await client.pushMessage({
          to: booking.line_user_id,
          messages: [{ type: 'text', text: message }]
        });
        
        // 送信ログを記録
        await pool.query(`
          INSERT INTO messaging_log (log_id, customer_id, message_type, sent_at, related_booking_id)
          VALUES (UUID(), ?, 'reminder', NOW(), ?)
        `, [booking.customer_id, booking.booking_id]);
        
        successCount++;
      } catch (err) {
        console.error(`送信エラー (${booking.last_name}${booking.first_name}):`, err);
        errorCount++;
        errors.push(`${booking.last_name}${booking.first_name}: ${err.message}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('LINE送信エラー:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}