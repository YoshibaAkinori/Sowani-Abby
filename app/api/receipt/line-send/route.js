// app/api/receipt/line-send/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';
import { promises as fs } from 'fs';
import path from 'path';

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

// プリンター設定読み込み（店舗名取得用）
async function loadPrinterConfig() {
  const CONFIG_PATH = path.join(process.cwd(), 'config', 'printer.json');
  const DEFAULT_CONFIG = {
    shop_name: '美骨小顔サロン ABBY',
  };

  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch (error) {
    return DEFAULT_CONFIG;
  }
}

// レシートデータ取得
async function getReceiptData(paymentId) {
  const pool = await getConnection();

  const [payments] = await pool.execute(`
    SELECT 
      p.*,
      c.last_name, c.first_name,
      st.name as staff_name
    FROM payments p
    LEFT JOIN customers c ON p.customer_id = c.customer_id
    LEFT JOIN staff st ON p.staff_id = st.staff_id
    WHERE p.payment_id = ?
  `, [paymentId]);

  if (payments.length === 0) {
    return null;
  }

  const payment = payments[0];

  const [options] = await pool.execute(`
    SELECT * FROM payment_options WHERE payment_id = ?
  `, [paymentId]);

  const [childPayments] = await pool.execute(`
    SELECT p.*
    FROM payments p
    WHERE p.related_payment_id = ?
  `, [paymentId]);

  const childIds = childPayments.map(c => c.payment_id);
  let grandchildPayments = [];
  if (childIds.length > 0) {
    const placeholders = childIds.map(() => '?').join(',');
    const [grandchildren] = await pool.execute(`
      SELECT p.*
      FROM payments p
      WHERE p.related_payment_id IN (${placeholders})
    `, childIds);
    grandchildPayments = grandchildren;
  }

  // チケット基本情報を取得（通常回数券）
  const allPayments = [payment, ...childPayments, ...grandchildPayments];
  const ticketIds = [...new Set(allPayments.filter(p => p.ticket_id).map(p => p.ticket_id))];
  let ticketInfoMap = new Map();

  if (ticketIds.length > 0) {
    const placeholders = ticketIds.map(() => '?').join(',');
    const [tickets] = await pool.execute(`
      SELECT 
        ct.customer_ticket_id as ticket_id,
        ct.sessions_remaining,
        tp.total_sessions,
        ct.expiry_date,
        tp.name as plan_name,
        tp.price as full_price,
        s.name as service_name,
        COALESCE((
          SELECT SUM(amount_paid) 
          FROM ticket_payments 
          WHERE customer_ticket_id = ct.customer_ticket_id
        ), 0) as total_paid
      FROM customer_tickets ct
      LEFT JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
      LEFT JOIN services s ON tp.service_id = s.service_id
      WHERE ct.customer_ticket_id IN (${placeholders})
    `, ticketIds);

    tickets.forEach(t => {
      // 残金を計算
      const remainingBalance = (t.full_price || 0) - (t.total_paid || 0);
      ticketInfoMap.set(t.ticket_id, {
        ...t,
        remaining_balance: remainingBalance > 0 ? remainingBalance : 0
      });
    });
  }

  // 期間限定オファー情報を取得
  let limitedOfferInfo = null;
  if (payment.limited_offer_id && payment.customer_id) {
    const [purchaseInfo] = await pool.execute(`
      SELECT 
        ltp.purchase_id,
        ltp.expiry_date,
        ltp.sessions_remaining,
        ltp.purchase_price,
        lo.name as offer_name,
        lo.total_sessions,
        lo.special_price,
        COALESCE((
          SELECT SUM(amount_paid) 
          FROM ticket_payments 
          WHERE customer_ticket_id = ltp.purchase_id AND ticket_type = 'limited'
        ), 0) as total_paid
      FROM limited_ticket_purchases ltp
      JOIN limited_offers lo ON ltp.offer_id = lo.offer_id
      WHERE ltp.offer_id = ? AND ltp.customer_id = ?
      ORDER BY ltp.purchase_date DESC LIMIT 1
    `, [payment.limited_offer_id, payment.customer_id]);
    
    if (purchaseInfo.length > 0) {
      const info = purchaseInfo[0];
      const remainingBalance = (info.purchase_price || info.special_price || 0) - (info.total_paid || 0);
      limitedOfferInfo = {
        ...info,
        remaining_balance: remainingBalance > 0 ? remainingBalance : 0
      };
    }
  }

  // 分類
  const services = [];
  const ticketUses = [];
  const ticketPurchases = [];

  // 親payment = 通常サービス
  // payment.service_name に直接スナップショットがある
  if (payment.service_name && !payment.ticket_id) {
    services.push({
      service_name: payment.service_name,
      price: payment.total_amount
    });
  } else if (payment.service_id && !payment.ticket_id) {
    // service_nameがない場合はservicesテーブルから取得
    const [serviceInfo] = await pool.execute('SELECT service_name FROM services WHERE service_id = ?', [payment.service_id]);
    if (serviceInfo.length > 0) {
      services.push({
        service_name: serviceInfo[0].service_name,
        price: payment.total_amount
      });
    }
  } else if (!payment.ticket_id && payment.booking_id) {
    // それでもない場合、bookingからサービス名を取得
    const [bookingInfo] = await pool.execute(`
      SELECT s.service_name 
      FROM bookings b
      LEFT JOIN services s ON b.service_id = s.service_id
      WHERE b.booking_id = ?
    `, [payment.booking_id]);
    if (bookingInfo.length > 0 && bookingInfo[0].service_name) {
      services.push({
        service_name: bookingInfo[0].service_name,
        price: payment.total_amount
      });
    }
  }

  // 子payment
  for (const child of childPayments) {
    // 回数券購入: payment_type === 'ticket' && is_ticket_purchase === 1
    if (child.payment_type === 'ticket' && child.is_ticket_purchase) {
      const ticketInfo = ticketInfoMap.get(child.ticket_id);
      ticketPurchases.push({
        plan_name: ticketInfo?.plan_name || '回数券',
        service_name: ticketInfo?.service_name,
        amount: child.total_amount,
        sessions_remaining: ticketInfo?.sessions_remaining,
        total_sessions: ticketInfo?.total_sessions,
        remaining_balance: child.ticket_balance_at_payment ?? ticketInfo?.remaining_balance ?? 0,
        expiry_date: ticketInfo?.expiry_date
      });
    } 
    // 回数券使用: payment_type === 'ticket' && is_ticket_purchase !== 1
    else if (child.payment_type === 'ticket' && !child.is_ticket_purchase && !child.is_remaining_payment) {
      const ticketInfo = ticketInfoMap.get(child.ticket_id);
      ticketUses.push({
        plan_name: ticketInfo?.plan_name || '回数券',
        service_name: ticketInfo?.service_name,
        sessions_remaining: ticketInfo?.sessions_remaining,
        total_sessions: ticketInfo?.total_sessions,
        remaining_balance: child.ticket_balance_at_payment ?? ticketInfo?.remaining_balance ?? 0,
        expiry_date: ticketInfo?.expiry_date,
        remaining_payment: child.total_amount || 0
      });
    }
  }

  // 孫payment
  for (const grandchild of grandchildPayments) {
    // 回数券使用
    if (grandchild.payment_type === 'ticket' && !grandchild.is_ticket_purchase && !grandchild.is_remaining_payment) {
      const ticketInfo = ticketInfoMap.get(grandchild.ticket_id);
      ticketUses.push({
        plan_name: ticketInfo?.plan_name || '回数券',
        service_name: ticketInfo?.service_name,
        sessions_remaining: ticketInfo?.sessions_remaining,
        total_sessions: ticketInfo?.total_sessions,
        remaining_balance: grandchild.ticket_balance_at_payment || ticketInfo?.remaining_balance || 0,
        expiry_date: ticketInfo?.expiry_date,
        remaining_payment: grandchild.total_amount || 0
      });
    }
  }

  // 期間限定オファー（福袋）をticketUsesに追加
  if (limitedOfferInfo) {
    ticketUses.push({
      plan_name: limitedOfferInfo.offer_name || '期間限定オファー',
      service_name: null,
      sessions_remaining: limitedOfferInfo.sessions_remaining,
      total_sessions: limitedOfferInfo.total_sessions,
      remaining_balance: limitedOfferInfo.remaining_balance || 0,
      expiry_date: limitedOfferInfo.expiry_date,
      remaining_payment: 0,
      is_limited_offer: true
    });
  }

  return {
    payment: {
      ...payment,
      customer_name: `${payment.last_name || ''} ${payment.first_name || ''}`.trim()
    },
    services,
    options,
    ticketUses,
    ticketPurchases,
    limitedOfferExpiry: limitedOfferInfo?.expiry_date || null,
    limitedOfferInfo
  };
}

// レシートデータをテキスト形式に変換
function formatReceiptText(data, shopName) {
  const { payment, services, options, ticketUses, ticketPurchases } = data;
  
  let text = '';
  
  // ヘッダー
  text += `━━━━━━━━━━━━\n`;
  text += `${shopName || 'サロン'}\n`;
  text += `━━━━━━━━━━━━\n\n`;
  
  // 日時・担当
  const paymentDate = new Date(payment.payment_date);
  const dateStr = `${paymentDate.getFullYear()}/${(paymentDate.getMonth() + 1).toString().padStart(2, '0')}/${paymentDate.getDate().toString().padStart(2, '0')}`;
  const timeStr = `${paymentDate.getHours().toString().padStart(2, '0')}:${paymentDate.getMinutes().toString().padStart(2, '0')}`;
  
  text += `日時: ${dateStr} ${timeStr}\n`;
  text += `${payment.customer_name} 様\n`;
  if (payment.staff_name) {
    text += `担当: ${payment.staff_name}\n`;
  }
  text += `\n`;
  
  // 施術内容
  if (services && services.length > 0) {
    text += `【施術内容】\n`;
    for (const service of services) {
      text += `・${service.service_name}\n`;
      if (service.price > 0) {
        text += `    ¥${service.price.toLocaleString()}\n`;
      }
    }
    text += `\n`;
  }
  
  // オプション
  if (options && options.length > 0) {
    text += `【オプション】\n`;
    for (const opt of options) {
      const priceText = opt.is_free ? '(無料)' : `¥${opt.price.toLocaleString()}`;
      text += `・${opt.option_name} ${priceText}\n`;
    }
    text += `\n`;
  }
  
  // 回数券使用
  if (ticketUses && ticketUses.length > 0) {
    text += `【回数券使用】\n`;
    for (const t of ticketUses) {
      text += `・${t.plan_name || t.service_name}\n`;
      text += `  残り ${t.sessions_remaining}/${t.total_sessions} 回\n`;
      if (t.remaining_payment > 0) {
        text += `  残金支払 ¥${t.remaining_payment.toLocaleString()}\n`;
      }
    }
    text += `\n`;
  }
  
  // 回数券購入
  if (ticketPurchases && ticketPurchases.length > 0) {
    text += `【回数券購入】\n`;
    for (const t of ticketPurchases) {
      text += `・${t.plan_name || t.service_name}\n`;
      text += `  ¥${(t.amount || 0).toLocaleString()}\n`;
      text += `  残り ${t.sessions_remaining}/${t.total_sessions} 回\n`;
      if (t.expiry_date) {
        const expiry = new Date(t.expiry_date);
        text += `  有効期限: ${expiry.getFullYear()}/${expiry.getMonth() + 1}/${expiry.getDate()}\n`;
      }
    }
    text += `\n`;
  }
  
  // 割引
  if (payment.discount_amount > 0) {
    text += `【割引】\n`;
    text += `  -¥${payment.discount_amount.toLocaleString()}\n\n`;
  }
  
  // 合計
  text += `━━━━━━━━━━━━\n`;
  text += `合計  ¥${payment.total_amount.toLocaleString()}\n`;
  text += `━━━━━━━━━━━━\n\n`;
  
  // 支払方法
  if (payment.payment_method === 'cash') {
    text += `現金  ¥${payment.cash_amount.toLocaleString()}\n`;
  } else if (payment.payment_method === 'card') {
    text += `カード  ¥${payment.card_amount.toLocaleString()}\n`;
  } else if (payment.payment_method === 'mixed') {
    text += `現金  ¥${payment.cash_amount.toLocaleString()}\n`;
    text += `カード  ¥${payment.card_amount.toLocaleString()}\n`;
  }
  
  return text;
}

export async function POST(request) {
  try {
    const { payment_id, customer_id } = await request.json();

    if (!payment_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'payment_idが必要です' 
      }, { status: 400 });
    }

    const pool = await getConnection();

    // 顧客のLINE IDを取得
    let lineUserId = null;
    
    if (customer_id) {
      const [customers] = await pool.query(
        'SELECT line_user_id FROM customers WHERE customer_id = ?',
        [customer_id]
      );
      if (customers.length > 0) {
        lineUserId = customers[0].line_user_id;
      }
    }

    // customer_idがない場合、payment_idから取得
    if (!lineUserId) {
      const [payments] = await pool.query(`
        SELECT c.line_user_id 
        FROM payments p
        JOIN customers c ON p.customer_id = c.customer_id
        WHERE p.payment_id = ?
      `, [payment_id]);
      
      if (payments.length > 0) {
        lineUserId = payments[0].line_user_id;
      }
    }

    if (!lineUserId) {
      return NextResponse.json({ 
        success: false, 
        error: 'LINE未連携のお客様です' 
      }, { status: 400 });
    }

    // LINE クライアント取得
    const client = await getLineClient();
    if (!client) {
      return NextResponse.json({ 
        success: false, 
        error: 'LINE APIが設定されていません' 
      }, { status: 500 });
    }

    // レシートデータを直接取得
    const receiptData = await getReceiptData(payment_id);
    if (!receiptData) {
      return NextResponse.json({ 
        success: false, 
        error: 'レシートデータの取得に失敗しました' 
      }, { status: 500 });
    }

    // 店舗名取得
    const config = await loadPrinterConfig();

    // テキスト形式に変換
    const receiptText = formatReceiptText(receiptData, config.shop_name);

    // 挨拶メッセージ作成
    let greetingMessage = `ご来店ありがとうございました✨
コルギ施術後のお顔の状態はいかがでしょうか？
気になる点やご不安なことがございましたら、
いつでもお気軽にご相談ください。`;

    // 有効期限がある場合（回数券使用・購入 または 期間限定オファー）
    let expiryDate = null;
    let expiryLabel = '回数券';
    
    console.log('[LINE] ticketUses:', JSON.stringify(receiptData.ticketUses));
    console.log('[LINE] ticketPurchases:', JSON.stringify(receiptData.ticketPurchases));
    console.log('[LINE] limitedOfferExpiry:', receiptData.limitedOfferExpiry);
    
    // 回数券の有効期限をチェック
    const ticketWithExpiry = [...(receiptData.ticketUses || []), ...(receiptData.ticketPurchases || [])]
      .find(t => t.expiry_date);
    
    console.log('[LINE] ticketWithExpiry:', JSON.stringify(ticketWithExpiry));
    
    if (ticketWithExpiry) {
      expiryDate = ticketWithExpiry.expiry_date;
      expiryLabel = '回数券';
    }
    
    // 期間限定オファーの有効期限をチェック
    if (!expiryDate && receiptData.limitedOfferExpiry) {
      expiryDate = receiptData.limitedOfferExpiry;
      expiryLabel = '期間限定オファー';
    }
    
    console.log('[LINE] expiryDate:', expiryDate);
    
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const expiryStr = `${expiry.getFullYear()}年${expiry.getMonth() + 1}月${expiry.getDate()}日`;
      greetingMessage += `

🎟${expiryLabel}について
有効期限は${expiryStr}までとなります。
お客様のペースで無理なくご利用ください🌿`;
    }

    // 残金がある場合
    const ticketWithBalance = [...(receiptData.ticketUses || []), ...(receiptData.ticketPurchases || [])]
      .find(t => t.remaining_balance > 0);
    
    console.log('[LINE] ticketWithBalance:', JSON.stringify(ticketWithBalance));
    
    if (ticketWithBalance) {
      greetingMessage += `

💰お支払い残金
残金 ¥${ticketWithBalance.remaining_balance.toLocaleString()} は次回以降のご来店時にてお支払いをお願いいたします。`;
    }

    // 予約リンク追加
    greetingMessage += `

▼次回予約はこちら
https://beauty.hotpepper.jp/kr/slnH000417938/`;

    // LINE送信（挨拶メッセージのみ）
    await client.pushMessage({
      to: lineUserId,
      messages: [
        {
          type: 'text',
          text: greetingMessage
        }
      ]
    });

    // 送信ログ記録
    try {
      await pool.query(`
        INSERT INTO messaging_log (log_id, customer_id, message_type, sent_at)
        SELECT UUID(), customer_id, 'receipt', NOW()
        FROM payments WHERE payment_id = ?
      `, [payment_id]);
    } catch (logError) {
      console.error('ログ記録エラー:', logError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'LINEにメッセージを送信しました' 
    });

  } catch (error) {
    console.error('LINE送信エラー:', error);

    return NextResponse.json({ 
      success: false, 
      error: error.message || 'LINE送信に失敗しました' 
    }, { status: 500 });
  }
}