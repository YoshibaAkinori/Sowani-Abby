// app/api/options/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../lib/db';

// オプション一覧取得
export async function GET(request) {
  try {
    const pool = await getConnection();

    const [rows] = await pool.execute(
      `SELECT 
        option_id,
        name,
        category,
        duration_minutes,
        price,
        is_active,
        created_at
      FROM options
      WHERE is_active = TRUE
      ORDER BY 
        CASE category
          WHEN 'フェイシャル' THEN 1
          WHEN 'ボディ' THEN 2
          WHEN 'その他' THEN 3
          ELSE 4
        END,
        name`
    );

    return NextResponse.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('オプション取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}

// オプション新規登録
export async function POST(request) {
  try {
    const pool = await getConnection();
    const body = await request.json();

    const {
      name,
      category = 'その他',
      duration_minutes = 0,
      price,
      is_active = true
    } = body;

    // バリデーション
    if (!name || price === undefined || price === null) {
      return NextResponse.json(
        { success: false, error: '必須項目を入力してください' },
        { status: 400 }
      );
    }

    // 重複チェック
    const [existing] = await pool.execute(
      'SELECT option_id FROM options WHERE name = ?',
      [name]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: '同名のオプションが既に存在します' },
        { status: 400 }
      );
    }

    // 挿入
    await pool.execute(
      `INSERT INTO options (
        option_id,
        name,
        category,
        duration_minutes,
        price,
        is_active
      ) VALUES (UUID(), ?, ?, ?, ?, ?)`,
      [name, category, duration_minutes, price, is_active]
    );

    return NextResponse.json({
      success: true,
      message: 'オプションを登録しました'
    });
  } catch (error) {
    console.error('オプション登録エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}

// オプション更新
export async function PUT(request) {
  try {
    const pool = await getConnection();
    const body = await request.json();

    const {
      option_id,
      name,
      category,
      duration_minutes,
      price,
      is_active
    } = body;

    // バリデーション
    if (!option_id || !name || price === undefined || price === null) {
      return NextResponse.json(
        { success: false, error: '必須項目を入力してください' },
        { status: 400 }
      );
    }

    // 更新
    await pool.execute(
      `UPDATE options 
       SET name = ?, 
           category = ?,
           duration_minutes = ?, 
           price = ?,
           is_active = ?
       WHERE option_id = ?`,
      [name, category || 'その他', duration_minutes || 0, price, is_active, option_id]
    );

    return NextResponse.json({
      success: true,
      message: 'オプション情報を更新しました'
    });
  } catch (error) {
    console.error('オプション更新エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}

// オプション削除
export async function DELETE(request) {
  try {
    const pool = await getConnection();
    const { searchParams } = new URL(request.url);
    const optionId = searchParams.get('id');

    if (!optionId) {
      return NextResponse.json(
        { success: false, error: 'オプションIDが必要です' },
        { status: 400 }
      );
    }

    // 予約で使用されているかチェック
    const [bookingOptions] = await pool.execute(
      'SELECT COUNT(*) as count FROM booking_options WHERE option_id = ?',
      [optionId]
    );

    if (bookingOptions[0].count > 0) {
      // 使用されている場合は無効化のみ
      await pool.execute(
        'UPDATE options SET is_active = FALSE WHERE option_id = ?',
        [optionId]
      );
      return NextResponse.json({
        success: true,
        message: '予約で使用されているため無効化しました'
      });
    }

    // 削除実行
    await pool.execute(
      'DELETE FROM options WHERE option_id = ?',
      [optionId]
    );

    return NextResponse.json({
      success: true,
      message: 'オプションを削除しました'
    });
  } catch (error) {
    console.error('オプション削除エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}