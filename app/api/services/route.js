// app/api/services/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../lib/db';

// コース一覧取得
export async function GET(request) {
  try {
    const pool = await getConnection();
    const { searchParams } = new URL(request.url);
    const includeTickets = searchParams.get('includeTickets') === 'true';
    
    // サービス一覧を取得
    const [services] = await pool.execute(
      `SELECT 
        service_id,
        name,
        description,
        duration_minutes,
        price,
        first_time_price,
        free_option_choices,
        category,
        is_active,
        created_at
      FROM services
      WHERE is_active = TRUE
      ORDER BY category, name`
    );

    // 回数券プランも取得する場合
    if (includeTickets) {
      const [ticketPlans] = await pool.execute(
        `SELECT 
          tp.plan_id,
          tp.service_id,
          tp.name as plan_name,
          tp.total_sessions,
          tp.price as total_price,
          tp.validity_days,
          s.name as service_name
        FROM ticket_plans tp
        JOIN services s ON tp.service_id = s.service_id
        ORDER BY s.name, tp.total_sessions`
      );

      return NextResponse.json({
        success: true,
        data: {
          services,
          ticketPlans
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: services
    });
  } catch (error) {
    console.error('サービス取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}

// コース新規登録
export async function POST(request) {
  try {
    const pool = await getConnection();
    const body = await request.json();

    const {
      name,
      description,
      duration_minutes,
      price,
      first_time_price,
      has_first_time_discount,
      category,
      is_active = true
    } = body;

    // バリデーション
    if (!name || !duration_minutes || !price || !category) {
      return NextResponse.json(
        { success: false, error: '必須項目を入力してください' },
        { status: 400 }
      );
    }

    // 初回割引の設定
    const finalFirstTimePrice = has_first_time_discount ? (first_time_price || price) : null;
    const finalHasDiscount = has_first_time_discount || false;

    // 挿入
    const [result] = await pool.execute(
      `INSERT INTO services (
        service_id,
        name,
        description,
        duration_minutes,
        price,
        first_time_price,
        has_first_time_discount,
        category,
        is_active
      ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || '',
        duration_minutes,
        price,
        finalFirstTimePrice,
        finalHasDiscount,
        category,
        is_active
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'コースを登録しました'
    });
  } catch (error) {
    console.error('サービス登録エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}

// コース更新
export async function PUT(request) {
  try {
    const pool = await getConnection();
    const body = await request.json();

    const {
      service_id,
      name,
      description,
      duration_minutes,
      price,
      first_time_price,
      has_first_time_discount,
      category,
      is_active
    } = body;

    // バリデーション
    if (!service_id || !name || !duration_minutes || !price || !category) {
      return NextResponse.json(
        { success: false, error: '必須項目を入力してください' },
        { status: 400 }
      );
    }

    // 初回割引の設定
    const finalFirstTimePrice = has_first_time_discount ? (first_time_price || price) : null;
    const finalHasDiscount = has_first_time_discount || false;

    // 更新
    await pool.execute(
      `UPDATE services 
       SET name = ?, 
           description = ?, 
           duration_minutes = ?, 
           price = ?,
           first_time_price = ?,
           has_first_time_discount = ?,
           category = ?, 
           is_active = ?
       WHERE service_id = ?`,
      [
        name,
        description || '',
        duration_minutes,
        price,
        finalFirstTimePrice,
        finalHasDiscount,
        category,
        is_active,
        service_id
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'コース情報を更新しました'
    });
  } catch (error) {
    console.error('サービス更新エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}

// コース削除
export async function DELETE(request) {
  try {
    const pool = await getConnection();
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('id');

    if (!serviceId) {
      return NextResponse.json(
        { success: false, error: 'サービスIDが必要です' },
        { status: 400 }
      );
    }

    // 関連する回数券プランがあるかチェック
    const [ticketPlans] = await pool.execute(
      'SELECT COUNT(*) as count FROM ticket_plans WHERE service_id = ?',
      [serviceId]
    );

    if (ticketPlans[0].count > 0) {
      return NextResponse.json(
        { success: false, error: '回数券プランが存在するため削除できません' },
        { status: 400 }
      );
    }

    // 予約があるかチェック
    const [bookings] = await pool.execute(
      'SELECT COUNT(*) as count FROM bookings WHERE service_id = ?',
      [serviceId]
    );

    if (bookings[0].count > 0) {
      // 予約がある場合は無効化のみ
      await pool.execute(
        'UPDATE services SET is_active = FALSE WHERE service_id = ?',
        [serviceId]
      );
      return NextResponse.json({
        success: true,
        message: '予約履歴があるため無効化しました'
      });
    }

    // 削除実行
    await pool.execute(
      'DELETE FROM services WHERE service_id = ?',
      [serviceId]
    );

    return NextResponse.json({
      success: true,
      message: 'コースを削除しました'
    });
  } catch (error) {
    console.error('サービス削除エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}