// app/api/customers/[id]/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';

// 顧客詳細取得
// 顧客詳細取得
export async function GET(request, { params }) {
  try {
    const pool = await getConnection();
    const { id } = await params;
    const customerId = id;

    // 顧客基本情報を取得（visit_countを含む）
    const [customerRows] = await pool.execute(
      `SELECT 
        customer_id,
        line_user_id,
        last_name,
        first_name,
        last_name_kana,
        first_name_kana,
        phone_number,
        email,
        birth_date,
        gender,
        notes,
        base_visit_count,
        visit_count,
        created_at,
        updated_at
      FROM customers 
      WHERE customer_id = ?`,
      [customerId]
    );

    if (customerRows.length === 0) {
      return NextResponse.json(
        { success: false, error: '顧客が見つかりません' },
        { status: 404 }
      );
    }

    const customer = customerRows[0];
    // visit_count はDBから取得した値をそのまま使用（計算不要）

    // 最終来店日を取得（回数券使用日ベース）
    const [lastVisitRows] = await pool.execute(
      `SELECT MAX(DATE(payment_date)) as last_visit_date 
       FROM payments 
       WHERE customer_id = ? 
         AND is_cancelled = FALSE
         AND payment_type = 'ticket'
         AND service_name NOT LIKE '%回数券購入%'`,
      [customerId]
    );
    customer.last_visit_date = lastVisitRows[0].last_visit_date || null;

    // 合計支払額を計算
    try {
      const [totalSpentRows] = await pool.execute(
        `SELECT SUM(total_amount) as total_spent 
         FROM payments 
         WHERE customer_id = ? AND is_cancelled = FALSE`,
        [customerId]
      );
      customer.total_spent = totalSpentRows[0].total_spent || 0;
    } catch (err) {
      customer.total_spent = 0;
    }

    return NextResponse.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('顧客詳細取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}

// 顧客情報更新
export async function PUT(request, { params }) {
  try {
    const pool = await getConnection();
    const { id } = await params;
    const customerId = id;
    
    const body = await request.json();
    const { 
      last_name, 
      first_name, 
      last_name_kana, 
      first_name_kana, 
      phone_number, 
      email, 
      birth_date,
      gender,
      notes,
      base_visit_count,
      line_user_id
    } = body;

    // バリデーション
    if (!last_name || !first_name || !phone_number) {
      return NextResponse.json(
        { success: false, error: '必須項目を入力してください' },
        { status: 400 }
      );
    }

    // UPDATE文を実行
    await pool.execute(
      `UPDATE customers SET
        last_name = ?,
        first_name = ?,
        last_name_kana = ?,
        first_name_kana = ?,
        phone_number = ?,
        email = ?,
        birth_date = ?,
        gender = ?,
        notes = ?,
        base_visit_count = ?,
        line_user_id = ?
      WHERE customer_id = ?`,
      [
        last_name,
        first_name,
        last_name_kana || '',
        first_name_kana || '',
        phone_number,
        email || '',
        birth_date || null,
        gender || 'not_specified',
        notes || '',
        base_visit_count || 0,
        line_user_id || null,
        customerId
      ]
    );

    return NextResponse.json({
      success: true,
      message: '顧客情報を更新しました'
    });
  } catch (error) {
    console.error('顧客更新エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー: ' + error.message },
      { status: 500 }
    );
  }
}

// 顧客削除
export async function DELETE(request, { params }) {
  try {
    const pool = await getConnection();
    const { id } = await params;
    const customerId = id;

    // 関連する予約があるかチェック
    const [bookings] = await pool.execute(
      'SELECT COUNT(*) as count FROM bookings WHERE customer_id = ?',
      [customerId]
    );

    if (bookings[0].count > 0) {
      return NextResponse.json(
        { success: false, error: '予約履歴がある顧客は削除できません' },
        { status: 400 }
      );
    }

    await pool.execute(
      'DELETE FROM customers WHERE customer_id = ?',
      [customerId]
    );

    return NextResponse.json({
      success: true,
      message: '顧客を削除しました'
    });
  } catch (error) {
    console.error('顧客削除エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}