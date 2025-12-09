// app/api/marketing/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../lib/db';

// LINE Messaging API設定
let messagingClient = null;

async function getLineClient() {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return null;
  }
  
  if (!messagingClient) {
    const { messagingApi } = await import('@line/bot-sdk');
    const { MessagingApiClient } = messagingApi;
    messagingClient = new MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    });
  }
  return messagingClient;
}

export async function POST(request) {
  try {
    const pool = await getConnection();
    const { action, criteria, message, targetUserIds } = await request.json();

    // --- アクション: ターゲット検索 ---
    if (action === 'search') {
      let query = '';
      let params = [];

      if (criteria.type === 'last_visit') {
        // 最終来店から days 以上経過しているユーザー
        // LINE未連携も含めて全員表示
        const days = parseInt(criteria.days) || 30;
        query = `
          SELECT 
            c.customer_id as id, 
            CONCAT(c.last_name, ' ', c.first_name) as name, 
            c.line_user_id,
            c.phone_number,
            MAX(p.payment_date) as last_visit
          FROM customers c
          LEFT JOIN payments p ON c.customer_id = p.customer_id 
            AND p.is_cancelled = FALSE
            AND p.payment_type != 'ticket_purchase'
          GROUP BY c.customer_id, c.last_name, c.first_name, c.line_user_id, c.phone_number
          HAVING last_visit IS NOT NULL 
            AND last_visit < DATE_SUB(NOW(), INTERVAL ? DAY)
          ORDER BY last_visit ASC
        `;
        params = [days];

      } else if (criteria.type === 'ticket_expiry') {
        // チケット有効期限が days 以内のユーザー（かつ残り回数がある）
        // LINE未連携も含めて全員表示
        const days = parseInt(criteria.days) || 30;
        query = `
          SELECT 
            c.customer_id as id, 
            CONCAT(c.last_name, ' ', c.first_name) as name, 
            c.line_user_id,
            c.phone_number,
            ct.expiry_date,
            tp.name as ticket_name,
            ct.sessions_remaining
          FROM customers c
          JOIN customer_tickets ct ON c.customer_id = ct.customer_id
          JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
          WHERE ct.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
            AND ct.sessions_remaining > 0
          ORDER BY ct.expiry_date ASC
        `;
        params = [days];

      } else if (criteria.type === 'no_line') {
        // LINE未連携のお客様（連携促進用）
        query = `
          SELECT 
            c.customer_id as id, 
            CONCAT(c.last_name, ' ', c.first_name) as name, 
            c.phone_number,
            c.email,
            MAX(p.payment_date) as last_visit
          FROM customers c
          LEFT JOIN payments p ON c.customer_id = p.customer_id 
            AND p.is_cancelled = FALSE
          WHERE (c.line_user_id IS NULL OR c.line_user_id = '')
          GROUP BY c.customer_id, c.last_name, c.first_name, c.phone_number, c.email
          ORDER BY last_visit DESC
          LIMIT 100
        `;
        params = [];

      } else if (criteria.type === 'birthday') {
        // 今月誕生日のお客様（LINE未連携も含む）
        query = `
          SELECT 
            c.customer_id as id, 
            CONCAT(c.last_name, ' ', c.first_name) as name, 
            c.line_user_id,
            c.phone_number,
            c.birth_date
          FROM customers c
          WHERE c.birth_date IS NOT NULL
            AND MONTH(c.birth_date) = MONTH(CURDATE())
          ORDER BY DAY(c.birth_date) ASC
        `;
        params = [];
      }

      const [rows] = await pool.query(query, params);
      return NextResponse.json({ success: true, data: rows });
    }

    // --- アクション: メッセージ送信 ---
    if (action === 'send') {
      if (!targetUserIds || targetUserIds.length === 0) {
        return NextResponse.json({ success: false, error: '送信対象が選択されていません' }, { status: 400 });
      }

      if (!message || message.trim() === '') {
        return NextResponse.json({ success: false, error: 'メッセージを入力してください' }, { status: 400 });
      }

      const client = await getLineClient();
      
      if (!client) {
        return NextResponse.json({ 
          success: false, 
          error: 'LINE APIが設定されていません。環境変数 LINE_CHANNEL_ACCESS_TOKEN を確認してください。' 
        }, { status: 500 });
      }

      // LINE Messaging APIで送信（500人ずつ分割）
      const chunkSize = 500;
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let i = 0; i < targetUserIds.length; i += chunkSize) {
        const chunk = targetUserIds.slice(i, i + chunkSize);
        try {
          await client.multicast({
            to: chunk,
            messages: [{ type: 'text', text: message }]
          });
          successCount += chunk.length;
        } catch (err) {
          console.error('LINE送信エラー:', err);
          errorCount += chunk.length;
          errors.push(err.message);
        }
      }

      // 送信ログを記録
      try {
        await pool.query(`
          INSERT INTO messaging_log (log_id, customer_id, message_type, sent_at)
          SELECT UUID(), customer_id, 'marketing', NOW()
          FROM customers 
          WHERE line_user_id IN (${targetUserIds.map(() => '?').join(',')})
        `, targetUserIds);
      } catch (logErr) {
        console.error('ログ記録エラー:', logErr);
      }

      return NextResponse.json({ 
        success: true, 
        count: successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    // --- アクション: 統計情報取得 ---
    if (action === 'stats') {
      // LINE連携済み顧客数
      const [lineConnected] = await pool.query(`
        SELECT COUNT(*) as count FROM customers 
        WHERE line_user_id IS NOT NULL AND line_user_id != ''
      `);

      // 総顧客数
      const [totalCustomers] = await pool.query(`
        SELECT COUNT(*) as count FROM customers
      `);

      // 有効な回数券保有者数
      const [activeTickets] = await pool.query(`
        SELECT COUNT(DISTINCT customer_id) as count 
        FROM customer_tickets 
        WHERE sessions_remaining > 0 AND expiry_date >= CURDATE()
      `);

      return NextResponse.json({
        success: true,
        data: {
          lineConnected: lineConnected[0].count,
          totalCustomers: totalCustomers[0].count,
          activeTicketHolders: activeTickets[0].count
        }
      });
    }

    return NextResponse.json({ success: false, error: '不正なアクションです' }, { status: 400 });

  } catch (error) {
    console.error('Marketing API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET: 統計情報取得
export async function GET(request) {
  try {
    const pool = await getConnection();

    const [lineConnected] = await pool.query(`
      SELECT COUNT(*) as count FROM customers 
      WHERE line_user_id IS NOT NULL AND line_user_id != ''
    `);

    const [totalCustomers] = await pool.query(`
      SELECT COUNT(*) as count FROM customers
    `);

    return NextResponse.json({
      success: true,
      lineConnected: lineConnected[0].count,
      totalCustomers: totalCustomers[0].count
    });
  } catch (error) {
    console.error('Marketing Stats Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}