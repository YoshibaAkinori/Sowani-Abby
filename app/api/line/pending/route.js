// app/api/line/pending/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';

// GET: 連携待ち一覧取得
export async function GET() {
  try {
    const pool = await getConnection();
    
    // 未連携のものを取得（直近30件）
    const [rows] = await pool.query(`
      SELECT 
        id,
        line_user_id,
        display_name,
        profile_image_url,
        event_type,
        message_text,
        received_at
      FROM line_pending_links
      WHERE linked = FALSE
      ORDER BY received_at DESC
      LIMIT 30
    `);
    
    return NextResponse.json({ success: true, data: rows });
    
  } catch (error) {
    console.error('連携待ち取得エラー:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: 連携実行
export async function POST(request) {
  try {
    const { pendingId, customerId } = await request.json();
    
    if (!pendingId || !customerId) {
      return NextResponse.json(
        { success: false, error: 'pendingId と customerId が必要です' },
        { status: 400 }
      );
    }
    
    const pool = await getConnection();
    
    // 連携待ちレコード取得
    const [pending] = await pool.query(
      'SELECT line_user_id FROM line_pending_links WHERE id = ? AND linked = FALSE',
      [pendingId]
    );
    
    if (pending.length === 0) {
      return NextResponse.json(
        { success: false, error: '連携待ちデータが見つかりません' },
        { status: 404 }
      );
    }
    
    const lineUserId = pending[0].line_user_id;
    
    // 顧客テーブルを更新
    const [updateResult] = await pool.query(
      'UPDATE customers SET line_user_id = ? WHERE customer_id = ?',
      [lineUserId, customerId]
    );
    
    if (updateResult.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: '顧客が見つかりません' },
        { status: 404 }
      );
    }
    
    // 連携待ちを完了にする
    await pool.query(
      `UPDATE line_pending_links 
       SET linked = TRUE, linked_customer_id = ?, linked_at = NOW()
       WHERE id = ?`,
      [customerId, pendingId]
    );
    
    return NextResponse.json({ success: true, message: 'LINE連携が完了しました' });
    
  } catch (error) {
    console.error('LINE連携エラー:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: 連携待ちを削除（スキップ）
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pendingId = searchParams.get('id');
    
    if (!pendingId) {
      return NextResponse.json(
        { success: false, error: 'id が必要です' },
        { status: 400 }
      );
    }
    
    const pool = await getConnection();
    
    await pool.query(
      'DELETE FROM line_pending_links WHERE id = ?',
      [pendingId]
    );
    
    return NextResponse.json({ success: true, message: '削除しました' });
    
  } catch (error) {
    console.error('削除エラー:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}