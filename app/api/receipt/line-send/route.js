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

  // チケット基本情報を取得
  const allPayments = [payment, ...childPayments, ...grandchildPayments];
  const ticketIds = [...new Set(allPayments.filter(p => p.ticket_id).map(p => p.ticket_id))];
  let ticketInfoMap = new Map();

  if (ticketIds.length > 0) {
    const placeholders = ticketIds.map(() => '?').join(',');
    const [tickets] = await pool.execute(`
      SELECT 
        ct.ticket_id,
        ct.sessions_remaining,
        ct.total_sessions,
        ct.remaining_balance,
        ct.expiry_date,
        tp.plan_name,
        s.service_name
      FROM customer_tickets ct
      LEFT JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
      LEFT JOIN services s ON tp.service_id = s.service_id
      WHERE ct.ticket_id IN (${placeholders})
    `, ticketIds);

    tickets.forEach(t => {
      ticketInfoMap.set(t.ticket_id, t);
    });
  }

  // 分類
  const services = [];
  const ticketUses = [];
  const ticketPurchases = [];

  // 親payment = 通常サービス
  if (payment.service_id && !payment.ticket_id) {
    const [serviceInfo] = await pool.execute('SELECT * FROM services WHERE service_id = ?', [payment.service_id]);
    if (serviceInfo.length > 0) {
      services.push({
        service_name: serviceInfo[0].service_name,
        price: payment.total_amount
      });
    }
  }

  // 子payment
  for (const child of childPayments) {
    if (child.payment_type === 'ticket_purchase') {
      const ticketInfo = ticketInfoMap.get(child.ticket_id);
      ticketPurchases.push({
        plan_name: ticketInfo?.plan_name || '回数券',
        service_name: ticketInfo?.service_name,
        amount: child.total_amount,
        sessions_remaining: ticketInfo?.sessions_remaining,
        total_sessions: ticketInfo?.total_sessions,
        remaining_balance: ticketInfo?.remaining_balance,
        expiry_date: ticketInfo?.expiry_date
      });
    } else if (child.payment_type === 'ticket_use') {
      const ticketInfo = ticketInfoMap.get(child.ticket_id);
      ticketUses.push({
        plan_name: ticketInfo?.plan_name || '回数券',
        service_name: ticketInfo?.service_name,
        sessions_remaining: ticketInfo?.sessions_remaining,
        total_sessions: ticketInfo?.total_sessions,
        remaining_balance: ticketInfo?.remaining_balance,
        remaining_payment: child.total_amount || 0
      });
    }
  }

  // 孫payment
  for (const grandchild of grandchildPayments) {
    if (grandchild.payment_type === 'ticket_use') {
      const ticketInfo = ticketInfoMap.get(grandchild.ticket_id);
      ticketUses.push({
        plan_name: ticketInfo?.plan_name || '回数券',
        service_name: ticketInfo?.service_name,
        sessions_remaining: ticketInfo?.sessions_remaining,
        total_sessions: ticketInfo?.total_sessions,
        remaining_balance: ticketInfo?.remaining_balance,
        remaining_payment: grandchild.total_amount || 0
      });
    }
  }

  return {
    payment: {
      ...payment,
      customer_name: `${payment.last_name || ''} ${payment.first_name || ''}`.trim()
    },
    services,
    options,
    ticketUses,
    ticketPurchases
  };
}

// レシートデータをテキスト形式に変換
function formatReceiptText(data, shopName) {
  const { payment, services, options, ticketUses, ticketPurchases } = data;
  
  let text = '';
  
  // ヘッダー
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `  ${shopName || 'サロン'}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
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
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `合計  ¥${payment.total_amount.toLocaleString()}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
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

    // LINE送信
    await client.pushMessage({
      to: lineUserId,
      messages: [
        {
          type: 'text',
          text: '本日はご来店ありがとうございました\nレシートをお送りいたします。'
        },
        {
          type: 'text',
          text: receiptText
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
      message: 'LINEにレシートを送信しました' 
    });

  } catch (error) {
    console.error('LINE送信エラー:', error);

    return NextResponse.json({ 
      success: false, 
      error: error.message || 'LINE送信に失敗しました' 
    }, { status: 500 });
  }
}