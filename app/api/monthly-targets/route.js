// app/api/monthly-targets/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../lib/db';

// GET: 月次目標と実績を取得
export async function GET(request) {
  try {
    const pool = await getConnection();
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year')) || new Date().getFullYear();
    const month = parseInt(searchParams.get('month')) || new Date().getMonth() + 1;
    const staffId = searchParams.get('staffId'); // 指定なしで全スタッフ

    // 目標を取得
    let targetQuery = `
      SELECT 
        mt.target_id,
        mt.year,
        mt.month,
        mt.staff_id,
        mt.target_amount,
        s.name as staff_name
      FROM monthly_targets mt
      LEFT JOIN staff s ON mt.staff_id = s.staff_id
      WHERE mt.year = ? AND mt.month = ?
    `;
    const targetParams = [year, month];

    if (staffId) {
      targetQuery += ' AND (mt.staff_id = ? OR mt.staff_id IS NULL)';
      targetParams.push(staffId);
    }

    const [targets] = await pool.execute(targetQuery, targetParams);

    // 実績を取得（店舗全体）
    const [totalSales] = await pool.execute(
      `SELECT 
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(cash_amount), 0) as cash_sales,
        COALESCE(SUM(card_amount), 0) as card_sales,
        COUNT(*) as transaction_count
      FROM payments
      WHERE YEAR(payment_date) = ? 
        AND MONTH(payment_date) = ?
        AND is_cancelled = FALSE`,
      [year, month]
    );

    // スタッフ別実績を取得
    const [staffSales] = await pool.execute(
      `SELECT 
        p.staff_id,
        s.name as staff_name,
        COALESCE(SUM(p.total_amount), 0) as total_sales,
        COUNT(*) as transaction_count
      FROM payments p
      JOIN staff s ON p.staff_id = s.staff_id
      WHERE YEAR(p.payment_date) = ? 
        AND MONTH(p.payment_date) = ?
        AND p.is_cancelled = FALSE
      GROUP BY p.staff_id, s.name`,
      [year, month]
    );

    // 店舗全体の目標
    const storeTarget = targets.find(t => t.staff_id === null);
    
    // スタッフ別目標と実績をマージ
    const staffTargetsMap = new Map();
    targets.filter(t => t.staff_id !== null).forEach(t => {
      staffTargetsMap.set(t.staff_id, t);
    });

    const staffData = staffSales.map(sales => {
      const target = staffTargetsMap.get(sales.staff_id);
      return {
        staff_id: sales.staff_id,
        staff_name: sales.staff_name,
        target_amount: target?.target_amount || 0,
        actual_amount: parseInt(sales.total_sales) || 0,
        transaction_count: parseInt(sales.transaction_count) || 0,
        progress: target?.target_amount > 0 
          ? Math.round((sales.total_sales / target.target_amount) * 100) 
          : 0
      };
    });

    // 目標未設定のスタッフも追加（売上0でも目標があるスタッフ）
    targets.filter(t => t.staff_id !== null).forEach(t => {
      if (!staffData.find(s => s.staff_id === t.staff_id)) {
        staffData.push({
          staff_id: t.staff_id,
          staff_name: t.staff_name,
          target_amount: t.target_amount,
          actual_amount: 0,
          transaction_count: 0,
          progress: 0
        });
      }
    });

    const storeTotalSales = parseInt(totalSales[0].total_sales) || 0;
    const storeTargetAmount = storeTarget?.target_amount || 0;

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        store: {
          target_amount: storeTargetAmount,
          actual_amount: storeTotalSales,
          cash_sales: parseInt(totalSales[0].cash_sales) || 0,
          card_sales: parseInt(totalSales[0].card_sales) || 0,
          transaction_count: parseInt(totalSales[0].transaction_count) || 0,
          progress: storeTargetAmount > 0 
            ? Math.round((storeTotalSales / storeTargetAmount) * 100) 
            : 0
        },
        staff: staffData
      }
    });

  } catch (error) {
    console.error('月次目標取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー: ' + error.message },
      { status: 500 }
    );
  }
}

// POST: 目標を設定/更新
export async function POST(request) {
  try {
    const pool = await getConnection();
    const body = await request.json();
    const { year, month, staff_id, target_amount } = body;

    if (!year || !month || target_amount === undefined) {
      return NextResponse.json(
        { success: false, error: '年月と目標金額は必須です' },
        { status: 400 }
      );
    }

    // UPSERT（存在すれば更新、なければ挿入）
    if (staff_id) {
      // スタッフ別目標
      await pool.execute(
        `INSERT INTO monthly_targets (target_id, year, month, staff_id, target_amount)
         VALUES (UUID(), ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE target_amount = VALUES(target_amount), updated_at = NOW()`,
        [year, month, staff_id, target_amount]
      );
    } else {
      // 店舗全体目標
      await pool.execute(
        `INSERT INTO monthly_targets (target_id, year, month, staff_id, target_amount)
         VALUES (UUID(), ?, ?, NULL, ?)
         ON DUPLICATE KEY UPDATE target_amount = VALUES(target_amount), updated_at = NOW()`,
        [year, month, target_amount]
      );
    }

    return NextResponse.json({
      success: true,
      message: '目標を設定しました'
    });

  } catch (error) {
    console.error('目標設定エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー: ' + error.message },
      { status: 500 }
    );
  }
}