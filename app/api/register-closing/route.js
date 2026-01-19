// app/api/register-closing/route.js
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'salon_user',
  password: process.env.DB_PASSWORD || 'salon_password',
  database: process.env.DB_NAME || 'salon_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// GET: 特定日付のレジ締めデータ取得
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json(
      { success: false, error: 'Date parameter is required' },
      { status: 400 }
    );
  }

  try {
    const [rows] = await pool.query(
      `SELECT * FROM daily_closings WHERE date = ?`,
      [date]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }

    const closing = rows[0];
    
    // payments処理
    if (closing.payments) {
      if (Array.isArray(closing.payments)) {
        // そのまま
      } else if (typeof closing.payments === 'string') {
        try {
          closing.payments = JSON.parse(closing.payments);
        } catch (e) {
          closing.payments = [];
        }
      } else if (typeof closing.payments === 'object') {
        closing.payments = Array.isArray(closing.payments) ? closing.payments : [closing.payments];
      }
    } else {
      closing.payments = [];
    }

    // レジ内現金の枚数オブジェクト
    closing.register_count = {
      ten_thousand: closing.register_ten_thousand || 0,
      five_thousand: closing.register_five_thousand || 0,
      two_thousand: closing.register_two_thousand || 0,
      one_thousand: closing.register_one_thousand || 0,
      five_hundred: closing.register_five_hundred || 0,
      one_hundred: closing.register_one_hundred || 0,
      fifty: closing.register_fifty || 0,
      ten: closing.register_ten || 0,
      five: closing.register_five || 0,
      one: closing.register_one || 0
    };

    // 両替バッグの枚数オブジェクト
    closing.bag_count = {
      ten_thousand: closing.bag_ten_thousand || 0,
      five_thousand: closing.bag_five_thousand || 0,
      two_thousand: closing.bag_two_thousand || 0,
      one_thousand: closing.bag_one_thousand || 0,
      five_hundred: closing.bag_five_hundred || 0,
      one_hundred: closing.bag_one_hundred || 0,
      fifty: closing.bag_fifty || 0,
      ten: closing.bag_ten || 0,
      five: closing.bag_five || 0,
      one: closing.bag_one || 0
    };

    return NextResponse.json({ success: true, data: closing });

  } catch (error) {
    console.error('レジ締めデータ取得エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: レジ締めデータの保存/更新
export async function POST(request) {
  let connection;
  
  try {
    const data = await request.json();
    const { date, staff_id } = data;

    if (!date || !staff_id) {
      return NextResponse.json(
        { success: false, error: '日付とスタッフIDは必須です' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    const [existing] = await connection.query(
      'SELECT closing_id FROM daily_closings WHERE date = ?',
      [date]
    );

    const paymentsJson = JSON.stringify(data.payments || []);

    const values = [
      data.staff_id,
      data.register_ten_thousand || 0,
      data.register_five_thousand || 0,
      data.register_two_thousand || 0,
      data.register_one_thousand || 0,
      data.register_five_hundred || 0,
      data.register_one_hundred || 0,
      data.register_fifty || 0,
      data.register_ten || 0,
      data.register_five || 0,
      data.register_one || 0,
      data.register_total || 0,
      data.bag_ten_thousand || 0,
      data.bag_five_thousand || 0,
      data.bag_two_thousand || 0,
      data.bag_one_thousand || 0,
      data.bag_five_hundred || 0,
      data.bag_one_hundred || 0,
      data.bag_fifty || 0,
      data.bag_ten || 0,
      data.bag_five || 0,
      data.bag_one || 0,
      data.bag_total || 0,
      data.envelope_amount || 0,
      data.expected_envelope || 0,
      data.discrepancy || 0,
      data.cash_sales || 0,
      data.card_sales || 0,
      data.total_sales || 0,
      data.transaction_count || 0,
      data.fixed_amount || 30000,
      paymentsJson,
      data.total_payments || 0,
      data.notes || null
    ];

    if (existing.length > 0) {
      await connection.query(
        `UPDATE daily_closings SET
          staff_id = ?,
          register_ten_thousand = ?, register_five_thousand = ?, register_two_thousand = ?,
          register_one_thousand = ?, register_five_hundred = ?, register_one_hundred = ?,
          register_fifty = ?, register_ten = ?, register_five = ?, register_one = ?,
          register_total = ?,
          bag_ten_thousand = ?, bag_five_thousand = ?, bag_two_thousand = ?,
          bag_one_thousand = ?, bag_five_hundred = ?, bag_one_hundred = ?,
          bag_fifty = ?, bag_ten = ?, bag_five = ?, bag_one = ?,
          bag_total = ?,
          envelope_amount = ?, expected_envelope = ?, discrepancy = ?,
          cash_sales = ?, card_sales = ?, total_sales = ?,
          transaction_count = ?, fixed_amount = ?,
          payments = ?, total_payments = ?, notes = ?
        WHERE date = ?`,
        [...values, date]
      );
    } else {
      const closingId = crypto.randomUUID();
      await connection.query(
        `INSERT INTO daily_closings (
          closing_id, date, staff_id,
          register_ten_thousand, register_five_thousand, register_two_thousand,
          register_one_thousand, register_five_hundred, register_one_hundred,
          register_fifty, register_ten, register_five, register_one,
          register_total,
          bag_ten_thousand, bag_five_thousand, bag_two_thousand,
          bag_one_thousand, bag_five_hundred, bag_one_hundred,
          bag_fifty, bag_ten, bag_five, bag_one,
          bag_total,
          envelope_amount, expected_envelope, discrepancy,
          cash_sales, card_sales, total_sales,
          transaction_count, fixed_amount,
          payments, total_payments, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [closingId, date, ...values]
      );
    }

    connection.release();

    return NextResponse.json({
      success: true,
      message: 'レジ締めデータを保存しました'
    });

  } catch (error) {
    if (connection) connection.release();
    console.error('レジ締めデータ保存エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}