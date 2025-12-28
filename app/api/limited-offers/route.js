// app/api/limited-offers/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../lib/db';

// 期間限定オファー一覧取得
export async function GET(request) {
  try {
    const pool = await getConnection();

    const [rows] = await pool.execute(
      `SELECT 
       lo.offer_id,
       lo.offer_type,
       lo.name,
       lo.description,
       lo.category,
       lo.base_plan_id,
       lo.duration_minutes,
       lo.original_price,
       lo.special_price,
       lo.total_sessions,
       lo.validity_days,
       lo.start_date,
       lo.end_date,
       lo.max_bookings,
       lo.max_sales,
       lo.current_sales,
       lo.current_bookings,
       lo.is_active,
       lo.created_at,
       tp.name as base_plan_name,
       tp.gender_restriction as base_gender_restriction,
       s.name as base_service_name
      FROM limited_offers lo
      LEFT JOIN ticket_plans tp ON lo.base_plan_id = tp.plan_id
      LEFT JOIN services s ON tp.service_id = s.service_id
      WHERE lo.is_active = TRUE
      ORDER BY lo.created_at DESC`
    );

    return NextResponse.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('期間限定オファー取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}

// 期間限定オファー新規登録
export async function POST(request) {
  try {
    const pool = await getConnection();
    const body = await request.json();

    const {
      offer_type,
      name,
      description,
      category,
      base_plan_id,
      duration_minutes,
      original_price,
      special_price,
      total_sessions,
      validity_days = 180,
      start_date,
      end_date,
      max_bookings,
      max_sales,
      is_active = true
    } = body;

    // バリデーション
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'オファー名は必須です' },
        { status: 400 }
      );
    }

    if (offer_type === 'ticket' && !special_price) {
      return NextResponse.json(
        { success: false, error: '回数券の場合は特別価格が必要です' },
        { status: 400 }
      );
    }

    // 挿入
    await pool.execute(
      `INSERT INTO limited_offers (
        offer_id,
        offer_type,
        name,
        description,
        category,
        base_plan_id,
        duration_minutes,
        original_price,
        special_price,
        total_sessions,
        validity_days,
        start_date,
        end_date,
        max_bookings,
        current_bookings,
        max_sales,
        current_sales,
        is_active
      ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?)`,
      [
        offer_type || 'service',
        name,
        description || '',
        category || null,
        base_plan_id || null,
        duration_minutes || 0,
        original_price || null,
        special_price || null,
        total_sessions || null,
        validity_days,
        start_date || null,
        end_date || null,
        max_bookings || null,
        max_sales || null,
        is_active
      ]
    );

    return NextResponse.json({
      success: true,
      message: '期間限定オファーを登録しました'
    });
  } catch (error) {
    console.error('期間限定オファー登録エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー: ' + error.message },
      { status: 500 }
    );
  }
}

// 期間限定オファー更新
export async function PUT(request) {
  try {
    const pool = await getConnection();
    const body = await request.json();

    const {
      offer_id,
      offer_type,
      name,
      description,
      category,
      base_plan_id,
      duration_minutes,
      original_price,
      special_price,
      total_sessions,
      validity_days,
      start_date,
      end_date,
      max_bookings,
      max_sales,
      is_active
    } = body;

    // バリデーション
    if (!offer_id || !name) {
      return NextResponse.json(
        { success: false, error: '必須項目を入力してください' },
        { status: 400 }
      );
    }

    // 更新
    await pool.execute(
      `UPDATE limited_offers 
       SET offer_type = ?,
           name = ?, 
           description = ?,
           category = ?,
           base_plan_id = ?,
           duration_minutes = ?,
           original_price = ?,
           special_price = ?,
           total_sessions = ?,
           validity_days = ?,
           start_date = ?,
           end_date = ?,
           max_bookings = ?,
           max_sales = ?,
           is_active = ?
       WHERE offer_id = ?`,
      [
        offer_type,
        name,
        description || '',
        category || null,
        base_plan_id || null,
        duration_minutes || 0,
        original_price || null,
        special_price || null,
        total_sessions || null,
        validity_days,
        start_date || null,
        end_date || null,
        max_bookings || null,
        max_sales || null,
        is_active,
        offer_id
      ]
    );

    return NextResponse.json({
      success: true,
      message: '期間限定オファー情報を更新しました'
    });
  } catch (error) {
    console.error('期間限定オファー更新エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}

// 期間限定オファー削除
export async function DELETE(request) {
  try {
    const pool = await getConnection();
    const { searchParams } = new URL(request.url);
    const offerId = searchParams.get('id');

    if (!offerId) {
      return NextResponse.json(
        { success: false, error: 'オファーIDが必要です' },
        { status: 400 }
      );
    }

    // 予約または購入履歴があるかチェック
    const [bookings] = await pool.execute(
      'SELECT COUNT(*) as count FROM bookings WHERE limited_offer_id = ?',
      [offerId]
    );

    const [purchases] = await pool.execute(
      'SELECT COUNT(*) as count FROM limited_ticket_purchases WHERE offer_id = ?',
      [offerId]
    );

    if (bookings[0].count > 0 || purchases[0].count > 0) {
      // 使用履歴がある場合は無効化のみ
      await pool.execute(
        'UPDATE limited_offers SET is_active = FALSE WHERE offer_id = ?',
        [offerId]
      );
      return NextResponse.json({
        success: true,
        message: '使用履歴があるため無効化しました'
      });
    }

    // 削除実行
    await pool.execute(
      'DELETE FROM limited_offers WHERE offer_id = ?',
      [offerId]
    );

    return NextResponse.json({
      success: true,
      message: '期間限定オファーを削除しました'
    });
  } catch (error) {
    console.error('期間限定オファー削除エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}