// app/api/availability/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../lib/db';

export async function GET(request) {
  try {
    const pool = await getConnection();
    
    // 直近2週間の日付範囲を計算
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 13);
    
    const startDate = today.toISOString().split('T')[0];
    const endDate = twoWeeksLater.toISOString().split('T')[0];

    // 1. アクティブなスタッフを取得（マネージャー含む）
    const [staffList] = await pool.execute(
      `SELECT staff_id, name, role FROM staff WHERE is_active = TRUE`
    );

    if (staffList.length === 0) {
      return NextResponse.json({
        success: true,
        data: { availability: [], message: '対象スタッフがいません' }
      });
    }

    // マネージャーと通常スタッフを分離
    const managers = staffList.filter(s => s.role === 'マネージャー');
    const regularStaff = staffList.filter(s => s.role !== 'マネージャー');

    const allStaffIds = staffList.map(s => s.staff_id);
    const regularStaffIds = regularStaff.map(s => s.staff_id);
    const placeholdersAll = allStaffIds.map(() => '?').join(',');
    const placeholdersRegular = regularStaffIds.length > 0 ? regularStaffIds.map(() => '?').join(',') : null;

    // 2. 通常スタッフのシフトを取得
    let shifts = [];
    if (placeholdersRegular) {
      const [shiftRows] = await pool.execute(
        `SELECT staff_id, date, start_time, end_time 
         FROM shifts 
         WHERE staff_id IN (${placeholdersRegular}) 
           AND date BETWEEN ? AND ?`,
        [...regularStaffIds, startDate, endDate]
      );
      shifts = shiftRows;
    }

    // 3. 全スタッフの予約を取得（キャンセル・ノーショー以外）
    const [bookings] = await pool.execute(
      `SELECT staff_id, date, start_time, end_time 
       FROM bookings 
       WHERE staff_id IN (${placeholdersAll}) 
         AND date BETWEEN ? AND ?
         AND status NOT IN ('cancelled', 'no_show')`,
      [...allStaffIds, startDate, endDate]
    );

    // 4. 日付ごとにシフト・予約をグループ化
    const shiftsByDate = {};
    shifts.forEach(shift => {
      const dateStr = shift.date.toISOString ? shift.date.toISOString().split('T')[0] : shift.date.split('T')[0];
      if (!shiftsByDate[dateStr]) shiftsByDate[dateStr] = [];
      shiftsByDate[dateStr].push(shift);
    });

    const bookingsByDate = {};
    bookings.forEach(booking => {
      const dateStr = booking.date.toISOString ? booking.date.toISOString().split('T')[0] : booking.date.split('T')[0];
      if (!bookingsByDate[dateStr]) bookingsByDate[dateStr] = [];
      bookingsByDate[dateStr].push(booking);
    });

    // 5. 各日付の空き時間を計算
    const availability = [];
    
    // 営業時間（マネージャー用のデフォルト）
    const BUSINESS_START = '10:00';
    const BUSINESS_END = '23:00';
    
    for (let d = new Date(today); d <= twoWeeksLater; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayShifts = shiftsByDate[dateStr] || [];
      const dayBookings = bookingsByDate[dateStr] || [];

      // 通常スタッフのシフト情報を収集
      const staffAvailability = [];

      // 通常スタッフ: シフトがある人のみ
      dayShifts.forEach(shift => {
        staffAvailability.push({
          staff_id: shift.staff_id,
          start_time: shift.start_time,
          end_time: shift.end_time,
          isManager: false
        });
      });

      // マネージャー: 常に営業時間で勤務可能
      managers.forEach(manager => {
        staffAvailability.push({
          staff_id: manager.staff_id,
          start_time: BUSINESS_START,
          end_time: BUSINESS_END,
          isManager: true
        });
      });

      // 誰も勤務していない日はスキップ（マネージャーがいれば常に表示）
      if (staffAvailability.length === 0) continue;

      // 全体の時間範囲を計算
      let earliestStart = '23:59';
      let latestEnd = '00:00';
      
      staffAvailability.forEach(sa => {
        if (sa.start_time < earliestStart) earliestStart = sa.start_time;
        if (sa.end_time > latestEnd) latestEnd = sa.end_time;
      });

      // 30分単位のタイムスロットを作成
      const slots = generateTimeSlots(earliestStart, latestEnd, 30);
      
      // 各スロットで少なくとも1人のスタッフが空いているかチェック
      const availableSlots = slots.map(slot => {
        const isAvailable = staffAvailability.some(sa => {
          // このスタッフはこの時間勤務しているか
          if (slot.start < sa.start_time || slot.end > sa.end_time) {
            return false;
          }
          
          // このスタッフはこの時間予約/予定が入っていないか
          const staffBookings = dayBookings.filter(b => b.staff_id === sa.staff_id);
          const hasConflict = staffBookings.some(booking => {
            return slot.start < booking.end_time && slot.end > booking.start_time;
          });
          
          return !hasConflict;
        });
        
        return { ...slot, available: isAvailable };
      });

      // 連続した空きスロットを1時間以上のブロックにまとめる
      const freeBlocks = mergeAvailableSlots(availableSlots, 60);

      if (freeBlocks.length > 0) {
        availability.push({
          date: dateStr,
          dayOfWeek: getDayOfWeek(d),
          freeBlocks
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        startDate,
        endDate,
        availability
      }
    });

  } catch (error) {
    console.error('空き時間取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'データベースエラー' },
      { status: 500 }
    );
  }
}

// 時間スロットを生成（30分単位）
function generateTimeSlots(startTime, endTime, intervalMinutes) {
  const slots = [];
  let current = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  while (current + intervalMinutes <= end) {
    slots.push({
      start: minutesToTime(current),
      end: minutesToTime(current + intervalMinutes)
    });
    current += intervalMinutes;
  }

  return slots;
}

// 連続した空きスロットをマージ（最小分数以上のブロックのみ）
function mergeAvailableSlots(slots, minMinutes) {
  const blocks = [];
  let blockStart = null;
  let blockEnd = null;

  slots.forEach((slot, index) => {
    if (slot.available) {
      if (blockStart === null) {
        blockStart = slot.start;
      }
      blockEnd = slot.end;
    }
    
    // 空きが途切れた、または最後のスロット
    if (!slot.available || index === slots.length - 1) {
      if (blockStart !== null && blockEnd !== null) {
        const duration = timeToMinutes(blockEnd) - timeToMinutes(blockStart);
        if (duration >= minMinutes) {
          blocks.push({ start: blockStart, end: blockEnd });
        }
      }
      blockStart = null;
      blockEnd = null;
    }
  });

  return blocks;
}

// ヘルパー関数
function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getDayOfWeek(date) {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[date.getDay()];
}