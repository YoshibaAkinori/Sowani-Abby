// app/api/register-closing/sales/route.js
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

// GET: 特定日付の売上データを取得
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
    // その日のpayments（決済データ）から集計
    const [salesRows] = await pool.query(
      `SELECT 
        SUM(cash_amount) as cash_amount,
        SUM(card_amount) as card_amount,
        COUNT(*) as transaction_count
      FROM payments
      WHERE DATE(payment_date) = ?
        AND is_cancelled = 0`,
      [date]
    );

    const sales = salesRows[0];

    // 前日のレジ締めデータから前日繰越を取得
    const previousDate = new Date(date);
    previousDate.setDate(previousDate.getDate() - 1);
    const previousDateStr = previousDate.toISOString().split('T')[0];

    let previous_balance = 50000; // デフォルト値

    try {
      // 前日のレジ締めデータから前日繰越を取得
      const [previousRows] = await pool.query(
        `SELECT register_total as previous_balance
        FROM daily_closings
        WHERE date = ?`,
        [previousDateStr]
      );

      if (previousRows.length > 0 && previousRows[0].previous_balance) {
        previous_balance = previousRows[0].previous_balance;
      }
    } catch (err) {
      console.log('Previous balance lookup failed, using default:', err.message);
    }

    return NextResponse.json({
      success: true,
      data: {
        cash_amount: parseInt(sales.cash_amount) || 0,
        card_amount: parseInt(sales.card_amount) || 0,
        transaction_count: parseInt(sales.transaction_count) || 0,
        previous_balance: previous_balance,
        fixed_amount: 50000 // レジ規定額（固定）
      }
    });

  } catch (error) {
    console.error('売上データ取得エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}