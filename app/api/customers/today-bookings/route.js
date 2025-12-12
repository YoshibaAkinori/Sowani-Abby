// app/api/customers/today-bookings/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';

export async function GET(request) {
  try {
    const pool = await getConnection();
    const today = new Date().toISOString().split('T')[0];

    const [rows] = await pool.execute(
      `SELECT
        b.booking_id,
        b.customer_id,
        b.staff_id,
        b.start_time,
        b.end_time,
        b.service_id,
        b.status,
        c.last_name,
        c.first_name,
        s.name as service_name,
        st.staff_id as staff_id,
        st.name as staff_name,
        -- 会計済みかどうかを判定（1 or 0で返る）
        CASE
          WHEN EXISTS (
            SELECT 1 FROM payments p
            WHERE p.booking_id = b.booking_id
            AND p.is_cancelled = FALSE
          ) THEN 1
          ELSE 0
        END as is_paid
      FROM bookings b
      JOIN customers c ON b.customer_id = c.customer_id
      LEFT JOIN services s ON b.service_id = s.service_id
      LEFT JOIN staff st ON b.staff_id = st.staff_id
      WHERE b.date = ?
        AND b.status IN ('pending', 'confirmed', 'completed')
        AND b.status NOT IN ('cancelled', 'no_show')
        AND b.type = 'booking'
      ORDER BY b.start_time ASC`,
      [today]
    );

    // 確実にbooleanに変換
    const bookingsWithPaidStatus = rows.map(row => ({
      ...row,
      is_paid: Boolean(row.is_paid)
    }));

    return NextResponse.json({
      success: true,
      data: bookingsWithPaidStatus
    });
  } catch (error) {
    console.error('今日の予約者取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}