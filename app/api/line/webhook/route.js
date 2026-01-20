// app/api/line/webhook/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';
import crypto from 'crypto';

// 署名検証
function verifySignature(body, signature) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    console.warn('LINE_CHANNEL_SECRET が設定されていません');
    return true; // 開発時はスキップ
  }
  
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');
  
  return hash === signature;
}

// ユーザープロフィール取得
async function getUserProfile(userId) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) return null;
  
  try {
    const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.error('プロフィール取得エラー:', err);
  }
  return null;
}

export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-line-signature');
    
    // 署名検証
    if (!verifySignature(body, signature)) {
      console.error('署名検証失敗');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const data = JSON.parse(body);
    const pool = await getConnection();
    
    // イベント処理
    for (const event of data.events || []) {
      const userId = event.source?.userId;
      if (!userId) continue;
      
      // すでに顧客DBに登録済みかチェック
      const [existing] = await pool.query(
        'SELECT customer_id FROM customers WHERE line_user_id = ?',
        [userId]
      );
      
      if (existing.length > 0) {
        // すでに連携済み - スキップ
        //console.log(`LINE UserID ${userId} は連携済み`);
        continue;
      }
      
      // プロフィール取得
      const profile = await getUserProfile(userId);
      
      if (event.type === 'follow') {
        // 友だち追加イベント
        await pool.query(
          `INSERT INTO line_pending_links 
           (line_user_id, display_name, profile_image_url, event_type, received_at)
           VALUES (?, ?, ?, 'follow', NOW())
           ON DUPLICATE KEY UPDATE 
             display_name = VALUES(display_name),
             profile_image_url = VALUES(profile_image_url),
             event_type = 'follow',
             received_at = NOW()`,
          [userId, profile?.displayName || null, profile?.pictureUrl || null]
        );
        //console.log(`友だち追加: ${profile?.displayName || userId}`);
        
      } else if (event.type === 'message' && event.message?.type === 'text') {
        // テキストメッセージイベント
        const messageText = event.message.text;
        
        // 連携待ちテーブルに追加/更新
        await pool.query(
          `INSERT INTO line_pending_links 
           (line_user_id, display_name, profile_image_url, event_type, message_text, received_at)
           VALUES (?, ?, ?, 'message', ?, NOW())
           ON DUPLICATE KEY UPDATE 
             display_name = VALUES(display_name),
             profile_image_url = VALUES(profile_image_url),
             event_type = 'message',
             message_text = VALUES(message_text),
             received_at = NOW()`,
          [userId, profile?.displayName || null, profile?.pictureUrl || null, messageText]
        );
        //console.log(`メッセージ受信: ${profile?.displayName || userId} - "${messageText}"`);
      }
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Webhook処理エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// LINE側の検証用（GET）
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}