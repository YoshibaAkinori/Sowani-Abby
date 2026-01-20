// app/api/bookings/excel/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';
import { updateExcel } from '../../../../lib/updateExcel';

export async function POST(request) {
  const pool = await getConnection();

  try {
    const body = await request.json();
    const { booking_id } = body;

    console.log('[Excel API] 開始 - booking_id:', booking_id);

    if (!booking_id) {
      return NextResponse.json(
        { success: false, error: '予約IDが必要です' },
        { status: 400 }
      );
    }

    // 予約情報を取得（回数券・福袋情報も含む）
    const [bookingRows] = await pool.execute(
      `SELECT 
          b.booking_id,
          b.date,
          b.customer_id,
          b.customer_ticket_id,
          b.limited_offer_id,
          c.last_name,
          c.first_name,
          c.base_visit_count,
          s.name as staff_name,
          tp.service_category as ticket_category
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.customer_id
        LEFT JOIN staff s ON b.staff_id = s.staff_id
        LEFT JOIN customer_tickets ct ON b.customer_ticket_id = ct.customer_ticket_id
        LEFT JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
        WHERE b.booking_id = ?`,
      [booking_id]
    );

    if (bookingRows.length === 0) {
      console.log('[Excel API] 予約が見つかりません');
      return NextResponse.json(
        { success: false, error: '予約が見つかりません' },
        { status: 404 }
      );
    }

    const booking = bookingRows[0];
    console.log('[Excel API] 予約:', booking.last_name, booking.first_name);

    // 来店回数: customersテーブルのvisit_countを取得
    const [customerRows] = await pool.execute(
      `SELECT visit_count FROM customers WHERE customer_id = ?`,
      [booking.customer_id]
    );
    const currentVisitCount = parseInt(customerRows[0]?.visit_count) || 0;
    console.log('[Excel API] 現在の来店回数:', currentVisitCount);

    // 来店回数をカウントするか判定
    // 回数券使用（「その他」以外）または福袋使用の場合のみ+1
    let shouldCountVisit = false;
    
    // 1. 回数券使用の場合
    if (booking.customer_ticket_id && booking.ticket_category !== 'その他') {
      shouldCountVisit = true;
      console.log('[Excel API] 回数券使用（その他以外）→ +1');
    }
    
    // 2. 福袋（期間限定オファー）の回数券使用の場合
    if (booking.limited_offer_id) {
      // 福袋の回数券かどうか確認
      const [limitedTicketCheck] = await pool.execute(
        `SELECT ltp.purchase_id 
         FROM limited_ticket_purchases ltp
         WHERE ltp.offer_id = ? AND ltp.customer_id = ?`,
        [booking.limited_offer_id, booking.customer_id]
      );
      if (limitedTicketCheck.length > 0) {
        shouldCountVisit = true;
        console.log('[Excel API] 福袋回数券使用 → +1');
      }
    }

    const totalVisitCount = shouldCountVisit ? currentVisitCount + 1 : currentVisitCount;
    console.log('[Excel API] Excel登録する来店回数:', totalVisitCount);

    // 日付をYYYY-MM-DD形式に変換
    let dateStr = booking.date;
    if (booking.date instanceof Date) {
      dateStr = booking.date.toISOString().split('T')[0];
    } else if (typeof booking.date === 'string' && booking.date.includes('T')) {
      dateStr = booking.date.split('T')[0];
    }

    // 予約データを準備
    const bookingData = {
      date: dateStr,
      customer_name: `${booking.last_name} ${booking.first_name}`,
      staff_name: booking.staff_name || '未設定',
      visit_count: totalVisitCount
    };

    console.log('[Excel API] Excelデータ:', bookingData);

    // Node.js版でExcel更新
    const result = await updateExcel(bookingData);

    if (!result.success) {
      console.error('[Excel API] Excel更新失敗:', result.error);
      throw new Error(result.error || 'Excel更新に失敗しました');
    }

    console.log('[Excel API] 成功 - 行:', result.row);

    return NextResponse.json({
      success: true,
      message: 'Excelファイルを更新しました',
      data: {
        file_name: result.file_name,
        row: result.row,
        customer_name: bookingData.customer_name,
        visit_count: totalVisitCount
      }
    });

  } catch (error) {
    console.error('[Excel API] エラー:', error);
    return NextResponse.json(
      { success: false, error: 'Excel更新中にエラーが発生しました: ' + error.message },
      { status: 500 }
    );
  }
}