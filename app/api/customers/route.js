// app/api/customers/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../lib/db';

// 顧客一覧取得
export async function GET(request) {
  try {
    const pool = await getConnection();
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';

    let query = `
      SELECT 
        c.customer_id,
        c.line_user_id,
        c.last_name,
        c.first_name,
        c.last_name_kana,
        c.first_name_kana,
        c.phone_number,
        c.email,
        c.birth_date,
        c.gender,
        c.notes,
        c.is_existing_customer,
        c.base_visit_count,
        c.visit_count,
        c.created_at,
        c.updated_at
    `;

    // 統計情報を含める場合
    if (includeStats) {
      query += `,
        MAX(CASE 
          WHEN p.is_cancelled = FALSE 
          THEN DATE(p.payment_date)
        END) as last_visit_date,
        COALESCE(SUM(CASE 
          WHEN p.is_cancelled = FALSE 
          THEN p.total_amount 
        END), 0) as total_spent
      FROM customers c
      LEFT JOIN payments p ON c.customer_id = p.customer_id
      GROUP BY c.customer_id
      `;
    } else {
      query += `
      FROM customers c
      `;
    }

    query += `ORDER BY c.created_at DESC`;

    const [rows] = await pool.execute(query);

    return NextResponse.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('顧客一覧取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}

// 顧客新規登録
export async function POST(request) {
  try {
    const pool = await getConnection();
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
      is_existing_customer,
      base_visit_count,
      line_user_id
    } = body;

    // バリデーション
    if (!last_name || !first_name || !phone_number) {
      return NextResponse.json(
        { success: false, error: '姓名と電話番号は必須です' },
        { status: 400 }
      );
    }

    // 電話番号の重複チェック
    const [existingCustomers] = await pool.execute(
      'SELECT customer_id FROM customers WHERE phone_number = ?',
      [phone_number]
    );

    if (existingCustomers.length > 0) {
      return NextResponse.json(
        { success: false, error: 'この電話番号は既に登録されています' },
        { status: 400 }
      );
    }

    // 新規登録
    const [result] = await pool.execute(
      `INSERT INTO customers (
        customer_id,
        last_name,
        first_name,
        last_name_kana,
        first_name_kana,
        phone_number,
        email,
        birth_date,
        gender,
        notes,
        is_existing_customer,
        base_visit_count,
        line_user_id
      ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        is_existing_customer ? 1 : 0,
        base_visit_count || 0,
        line_user_id || null
      ]
    );

    // 登録した顧客のIDを取得
    const [newCustomer] = await pool.execute(
      'SELECT customer_id, last_name, first_name FROM customers WHERE phone_number = ? ORDER BY created_at DESC LIMIT 1',
      [phone_number]
    );

    return NextResponse.json({
      success: true,
      message: '顧客を登録しました',
      data: newCustomer[0]
    });
  } catch (error) {
    console.error('顧客登録エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー: ' + error.message },
      { status: 500 }
    );
  }
}