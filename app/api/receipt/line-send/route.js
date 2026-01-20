// app/api/receipt/line-send/route.js
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

// レシートデータをテキスト形式に変換
function formatReceiptText(data) {
  const { payment, services, options, ticketUses, ticketPurchases, shopName } = data;
  
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

    // レシートデータを取得
    const receiptRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/receipt/print?payment_id=${payment_id}`);
    const receiptResult = await receiptRes.json();
    
    if (!receiptResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'レシートデータの取得に失敗しました' 
      }, { status: 500 });
    }

    // テキスト形式に変換
    const receiptText = formatReceiptText(receiptResult.data);

    // LINE送信
    await client.pushMessage({
      to: lineUserId,
      messages: [
        {
          type: 'text',
          text: '本日はご来店ありがとうございました✨\nレシートをお送りいたします。'
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