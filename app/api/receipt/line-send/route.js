// app/api/receipt/line-send/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';
import fs from 'fs';
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

export async function POST(request) {
  const tempFilePath = null;
  
  try {
    const { payment_id, image_base64, customer_id } = await request.json();

    if (!payment_id || !image_base64) {
      return NextResponse.json({ 
        success: false, 
        error: 'payment_idとimage_base64が必要です' 
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

    // Base64から画像データを抽出
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 一時ファイル保存
    const tempDir = '/tmp/receipts';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const fileName = `receipt_${payment_id}_${Date.now()}.png`;
    const tempFilePath = path.join(tempDir, fileName);
    fs.writeFileSync(tempFilePath, imageBuffer);

    // 公開URL生成（Next.jsのpublicディレクトリ経由）
    // 注意: 本番環境ではドメインを環境変数から取得
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // publicディレクトリにも一時コピー（LINEがアクセスできるように）
    const publicDir = path.join(process.cwd(), 'public', 'temp');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const publicFilePath = path.join(publicDir, fileName);
    fs.copyFileSync(tempFilePath, publicFilePath);

    const imageUrl = `${baseUrl}/temp/${fileName}`;

    // LINE送信
    await client.pushMessage({
      to: lineUserId,
      messages: [
        {
          type: 'text',
          text: '本日はご来店ありがとうございました✨\nレシートをお送りいたします。'
        },
        {
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl
        }
      ]
    });

    // 送信後、少し待ってからファイル削除（LINEがダウンロードする時間を確保）
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (fs.existsSync(publicFilePath)) fs.unlinkSync(publicFilePath);
      } catch (e) {
        console.error('一時ファイル削除エラー:', e);
      }
    }, 30000); // 30秒後に削除

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
    
    // エラー時もファイル削除を試みる
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
    }

    return NextResponse.json({ 
      success: false, 
      error: error.message || 'LINE送信に失敗しました' 
    }, { status: 500 });
  }
}