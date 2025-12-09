// app/api/coupons/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../lib/db';

// クーポン一覧取得（N+1問題を解決）
export async function GET(request) {
  try {
    const pool = await getConnection();
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    
    const [rows] = await pool.execute(
      `SELECT 
        c.coupon_id,
        c.name,
        c.description,
        c.base_service_id,
        c.free_option_count,
        c.total_price,
        c.validity_days,
        c.usage_limit,
        c.used_count,
        c.is_active,
        c.created_at,
        s.name as service_name,
        c.total_duration_minutes
      FROM coupons c
      LEFT JOIN services s ON c.base_service_id = s.service_id
      WHERE c.is_active = TRUE
      ORDER BY c.created_at DESC`
    );

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // ★改善ポイント1: 全クーポンIDを取得
    const couponIds = rows.map(c => c.coupon_id);

    // ★改善ポイント2: 指定オプション情報を一括取得
    const placeholders = couponIds.map(() => '?').join(',');
    const [allOptions] = await pool.execute(
      `SELECT 
        cio.coupon_id,
        cio.option_id,
        cio.quantity,
        o.name as option_name,
        o.price as option_price,
        o.duration_minutes
      FROM coupon_included_options cio
      JOIN options o ON cio.option_id = o.option_id
      WHERE cio.coupon_id IN (${placeholders})
      ORDER BY o.name`,
      couponIds
    );

    // ★改善ポイント3: 顧客IDが指定されている場合、使用状況を一括取得
    let usageMap = new Map();
    if (customerId) {
      const [allUsage] = await pool.execute(
        `SELECT 
          coupon_id,
          COUNT(*) as usage_count 
        FROM coupon_usage 
        WHERE coupon_id IN (${placeholders})
          AND customer_id = ?
        GROUP BY coupon_id`,
        [...couponIds, customerId]
      );

      allUsage.forEach(usage => {
        usageMap.set(usage.coupon_id, usage.usage_count);
      });
    }

    // ★改善ポイント4: クーポンごとにオプションをグループ化
    const optionsMap = new Map();
    allOptions.forEach(opt => {
      if (!optionsMap.has(opt.coupon_id)) {
        optionsMap.set(opt.coupon_id, []);
      }
      optionsMap.get(opt.coupon_id).push(opt);
    });

    // ★改善ポイント5: 各クーポンに関連情報を付与
    const couponsWithDetails = rows.map(coupon => {
      const included_options = optionsMap.get(coupon.coupon_id) || [];
      
      let is_selectable;
      if (customerId) {
        const usageCount = usageMap.get(coupon.coupon_id) || 0;
        const usageLimit = coupon.usage_limit;
        // 使用上限がnullなら無制限、ある場合は上限と比較
        is_selectable = (usageLimit === null || usageCount < usageLimit) && coupon.is_active;
      } else {
        // 顧客IDなしの場合は、単にis_activeで判定
        is_selectable = coupon.is_active;
      }

      return {
        ...coupon,
        included_options,
        is_selectable
      };
    });

    return NextResponse.json({
      success: true,
      data: couponsWithDetails
    });
  } catch (error) {
    console.error('クーポン取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}


// クーポン新規登録
export async function POST(request) {
  const pool = await getConnection();
  const connection = await pool.getConnection(); // ★★★ 修正 ★★★
  
  try {
    const body = await request.json();

    const {
      name,
      description,
      base_service_id,
      included_options = [], // [{ option_id, quantity }]
      free_option_count = 0,
      total_price,
      validity_days = 180,
      usage_limit,
      is_active = true
    } = body;

    // バリデーション
    if (!name || !total_price) {
      return NextResponse.json(
        { success: false, error: '必須項目を入力してください' },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    // クーポン登録
    const [result] = await connection.execute(
      `INSERT INTO coupons (
        coupon_id,
        name,
        description,
        base_service_id,
        free_option_count,
        total_price,
        validity_days,
        usage_limit,
        is_active
      ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || '',
        base_service_id || null, // ★★★ 修正 ★★★
        free_option_count,
        total_price,
        validity_days,
        usage_limit || null, // ★★★ 修正 ★★★
        is_active
      ]
    );

    // 挿入されたcoupon_idを取得
    const [couponRow] = await connection.execute(
      'SELECT coupon_id FROM coupons WHERE name = ? ORDER BY created_at DESC LIMIT 1',
      [name]
    );
    const couponId = couponRow[0].coupon_id;

    // 指定オプションを登録
    if (included_options && included_options.length > 0) {
      for (const option of included_options) {
        await connection.execute(
          `INSERT INTO coupon_included_options (
            coupon_option_id,
            coupon_id,
            option_id,
            quantity
          ) VALUES (UUID(), ?, ?, ?)`,
          [couponId, option.option_id, option.quantity || 1]
        );
      }
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: 'クーポンを登録しました'
    });
  } catch (error) {
    await connection.rollback();
    console.error('クーポン登録エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release(); // ★★★ 修正 ★★★
    }
  }
}

// クーポン更新
export async function PUT(request) {
  const pool = await getConnection();
  const connection = await pool.getConnection(); // ★★★ 修正 ★★★
  
  try {
    const body = await request.json();

    const {
      coupon_id,
      name,
      description,
      base_service_id,
      included_options = [],
      free_option_count,
      total_price,
      validity_days,
      usage_limit,
      is_active
    } = body;

    // バリデーション
    if (!coupon_id || !name || !total_price) {
      return NextResponse.json(
        { success: false, error: '必須項目を入力してください' },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    // クーポン更新
    await connection.execute(
      `UPDATE coupons 
       SET name = ?, 
           description = ?,
           base_service_id = ?,
           free_option_count = ?,
           total_price = ?,
           validity_days = ?,
           usage_limit = ?,
           is_active = ?
       WHERE coupon_id = ?`,
      [
        name,
        description || '',
        base_service_id || null, // ★★★ 修正 ★★★
        free_option_count,
        total_price,
        validity_days,
        usage_limit || null, // ★★★ 修正 ★★★
        is_active,
        coupon_id
      ]
    );

    // 既存の指定オプションを削除
    await connection.execute(
      'DELETE FROM coupon_included_options WHERE coupon_id = ?',
      [coupon_id]
    );

    // 新しい指定オプションを登録
    if (included_options && included_options.length > 0) {
      for (const option of included_options) {
        await connection.execute(
          `INSERT INTO coupon_included_options (
            coupon_option_id,
            coupon_id,
            option_id,
            quantity
          ) VALUES (UUID(), ?, ?, ?)`,
          [coupon_id, option.option_id, option.quantity || 1]
        );
      }
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: 'クーポン情報を更新しました'
    });
  } catch (error) {
    await connection.rollback();
    console.error('クーポン更新エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release(); // ★★★ 修正 ★★★
    }
  }
}

// クーポン削除
export async function DELETE(request) {
  try {
    const pool = await getConnection();
    const { searchParams } = new URL(request.url);
    const couponId = searchParams.get('id');

    if (!couponId) {
      return NextResponse.json(
        { success: false, error: 'クーポンIDが必要です' },
        { status: 400 }
      );
    }

    // 使用履歴があるかチェック
    const [usage] = await pool.execute(
      'SELECT COUNT(*) as count FROM coupon_usage WHERE coupon_id = ?',
      [couponId]
    );

    if (usage[0].count > 0) {
      // 使用履歴がある場合は無効化のみ
      await pool.execute(
        'UPDATE coupons SET is_active = FALSE WHERE coupon_id = ?',
        [couponId]
      );
      return NextResponse.json({
        success: true,
        message: '使用履歴があるため無効化しました'
      });
    }

    // 削除実行（CASCADE設定により中間テーブルも自動削除）
    await pool.execute(
      'DELETE FROM coupons WHERE coupon_id = ?',
      [couponId]
    );

    return NextResponse.json({
      success: true,
      message: 'クーポンを削除しました'
    });
  } catch (error) {
    console.error('クーポン削除エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}