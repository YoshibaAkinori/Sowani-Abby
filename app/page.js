"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronLeft, ChevronRight, Settings, User, Clock, Users, BarChart3, CreditCard } from 'lucide-react';
import { useStaff } from '../contexts/StaffContext';
import BookingModal from './components/BookingModal';
import CalendarModal from './components/CalendarModal';
import './global.css';

const SalonBoard = () => {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);


  // ★ Contextから取得
  const { activeStaff, loading: staffLoading } = useStaff();
  const [shiftsCache, setShiftsCache] = useState({});

  ////console.log('activeStaff:', activeStaff);
  ////console.log('staffLoading:', staffLoading);

  // ★ 初期値としてスタッフの骨組みを即座に作成
  const [staffShifts, setStaffShifts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // ★ activeStaffが変更されたら、即座にスタッフの骨組みを作成
  useEffect(() => {
    if (activeStaff.length > 0) {
      const initialStaffShifts = activeStaff.map(staff => ({
        ...staff,
        shift: null,
        hasShift: false
      }));
      setStaffShifts(initialStaffShifts);
    }
  }, [activeStaff]);

  // ★ 日付が変更されたら、シフトと予約データを取得
  useEffect(() => {
    if (activeStaff.length > 0) {
      fetchDataForDate();
    }
  }, [selectedDate, activeStaff]);

  const fetchDataForDate = async () => {
    setIsLoading(true);
    try {
      const [year, month] = selectedDate.split('-');
      const cacheKey = `${year}-${month}`;

      // ★ マネージャー以外のスタッフのみシフト取得
      const nonManagerStaff = activeStaff.filter(s => s.role !== 'マネージャー');

      // ★ キャッシュチェック：同じ月のシフトデータがあれば再利用
      let monthShiftsData;
      if (shiftsCache[cacheKey]) {
        //console.log(`キャッシュを使用: ${cacheKey}`);
        monthShiftsData = shiftsCache[cacheKey];
      } else {
        //console.log(`APIから取得: ${cacheKey}`);
        const response = await fetch(
          `/api/shifts?staffIds=${nonManagerStaff.map(s => s.staff_id).join(',')}&year=${year}&month=${month}`
        );
        const data = await response.json();
        monthShiftsData = data.data;

        setShiftsCache(prev => ({
          ...prev,
          [cacheKey]: monthShiftsData
        }));
      }

      const staffShiftsData = nonManagerStaff.map(staff => {
        const staffShiftList = monthShiftsData?.[staff.staff_id] || [];
        const dayShift = staffShiftList.find(s => s.date.startsWith(selectedDate));
        return { ...staff, shift: dayShift || null, hasShift: !!dayShift };
      });

      const bookingsResponse = await fetch(`/api/bookings?date=${selectedDate}`);
      const bookingsData = await bookingsResponse.json();

      const managerStaff = activeStaff
        .filter(s => s.role === 'マネージャー')
        .map(staff => ({ ...staff, shift: null, hasShift: true }));

      setStaffShifts([...managerStaff, ...staffShiftsData]);

      if (bookingsData.success) {
        const formattedBookings = bookingsData.data.map(b => {
          // サービス名の決定ロジック
          let serviceName = '予定';
          if (b.service_name) {
            serviceName = b.service_name;
          } else if (b.limited_purchases && b.limited_purchases.length > 0) {
            // 期間限定購入がある場合
            serviceName = b.limited_purchases.map(lp => lp.offer_name || lp.plan_name).join(', ');
          } else if (b.tickets && b.tickets.length > 0) {
            // 回数券がある場合
            serviceName = b.tickets.map(t => t.plan_name).join(', ');
          } else if (b.notes) {
            serviceName = b.notes;
          }

          // サービスカテゴリの決定ロジック
          let serviceType = '予定';
          if (b.service_category) {
            serviceType = b.service_category;
          } else if (b.limited_purchases && b.limited_purchases.length > 0) {
            serviceType = '期間限定';
          } else if (b.tickets && b.tickets.length > 0) {
            serviceType = '回数券';
          }

          return {
            id: b.booking_id,
            staffId: b.staff_id,
            staffName: b.staff_name,
            bed: b.bed_id ? `ベッド${b.bed_id}` : '',
            date: b.date.split('T')[0],
            startTime: b.start_time,
            endTime: b.end_time,
            service: serviceName,
            client: `${b.last_name || ''} ${b.first_name || ''}`,
            serviceType: serviceType,
            status: b.status,
            type: b.type
          };
        });
        setBookings(formattedBookings);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error('データ取得エラー:', err);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };


  const bedCount = 2;
  const beds = Array.from({ length: bedCount }, (_, i) => `ベッド${i + 1}`);

  const timeSlots = [];
  for (let hour = 9; hour < 24; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  const headerRowData = {
    id: 'HEADER_ROW',
    staff_id: 'HEADER_ROW',
    name: '',
    color: 'transparent'
  };

  // ★ ベッドと同じように、activeStaffから直接表示用配列を作成
  const displayStaff = activeStaff.length > 0
    ? [headerRowData, ...activeStaff]
    : [];

  //console.log('displayStaff:', displayStaff);

  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const calculateBookingPosition = (startTime, endTime) => {
    const timelineStartMinutes = 9 * 60;
    const totalTimelineMinutes = (24 - 9) * 60;
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const duration = endMinutes - startMinutes;
    const leftPercent = ((startMinutes - timelineStartMinutes) / totalTimelineMinutes) * 100;
    const widthPercent = (duration / totalTimelineMinutes) * 100;
    return { left: `${leftPercent}%`, width: `${widthPercent}%` };
  };

  const getServiceColorClass = (serviceType) => {
    switch (serviceType) {
      case 'フェイシャル': return 'salon-board__booking--facial';
      case 'ボディトリート': return 'salon-board__booking--body-treatment';
      case 'クーポン': return 'salon-board__booking--coupon';
      case '期間限定': return 'salon-board__booking--limited';
      default: return 'salon-board__booking--other';
    }
  };

  const changeDate = (days) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    const newDate = currentDate.toISOString().split('T')[0];

    const [oldYear, oldMonth] = selectedDate.split('-');
    const [newYear, newMonth] = newDate.split('-');
    if (oldYear !== newYear || oldMonth !== newMonth) {
      //console.log('月が変わったのでキャッシュをクリア');
      setShiftsCache({});
    }

    setSelectedDate(newDate);
  };

  const isSlotInShiftTime = (staff, timeSlot) => {
    if (staff.role === 'マネージャー') return true;

    // ★ staffShiftsから該当スタッフのシフト情報を取得
    const staffShift = staffShifts.find(s => s.staff_id === staff.staff_id);
    if (!staffShift || !staffShift.shift || !staffShift.shift.start_time || !staffShift.shift.end_time) return false;

    const slotMinutes = timeToMinutes(timeSlot);
    const startMinutes = timeToMinutes(staffShift.shift.start_time);
    const endMinutes = timeToMinutes(staffShift.shift.end_time);
    return slotMinutes >= startMinutes && slotMinutes < endMinutes;
  };

  const isSlotAvailable = (staffId, timeSlot) => {
    const slotMinutes = timeToMinutes(timeSlot);
    return !bookings.some(booking => {
      if (booking.staffId !== staffId) return false;
      const startMinutes = timeToMinutes(booking.startTime);
      const endMinutes = timeToMinutes(booking.endTime);
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });
  };

  const handleSlotClick = (staffId, timeSlot, slotIndex) => {
    const staff = activeStaff.find(s => s.staff_id === staffId);
    if (!staff) return;
    setSelectedSlot({
      staffId,
      staffName: staff.name,
      timeSlot,
      slotIndex,
      date: selectedDate
    });
    setActiveModal('booking');
  };

  const handleBookingClick = async (bookingId) => {
    try {
      const response = await fetch(`/api/bookings?id=${bookingId}`);
      const data = await response.json();
      if (data.success && data.data) {
        const booking = Array.isArray(data.data) ? data.data[0] : data.data;
        
        // 支払い済み（completed）かどうか判定
        const isCompleted = booking.status === 'completed';
        
        setSelectedSlot({
          bookingId: booking.booking_id,
          isEdit: !isCompleted,  // completedの場合は編集モードではない
          isCompleted: isCompleted,  // 施術完了フラグを追加
          staffId: booking.staff_id,
          staffName: booking.staff_name,
          date: booking.date.split('T')[0],
          timeSlot: booking.start_time,
          bookingData: booking
        });
        setActiveModal('booking');
      }
    } catch (err) {
      console.error('予約詳細取得エラー:', err);
      alert('予約情報の取得に失敗しました');
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedSlot(null);
    fetchDataForDate();
  };

  const toggleSettings = () => {
    router.push('/settings');
  };

  const openCalendarModal = () => {
    setActiveModal('calendar');
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setActiveModal(null);
  };

  const handlePageChange = (page) => {
    router.push(`/${page}`);
    setActiveModal(null);
  };

  // ★ activeStaffが空の場合のみローディング表示
  if (activeStaff.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.125rem',
        color: '#6b7280'
      }}>
        読み込み中...
      </div>
    );
  }

  return (
    <div className="salon-board">
      <header className="salon-board__header">
        <div className="salon-board__header-content">
          <div className="salon-board__header-title">
            <h1>ABBY 予約一覧</h1>
          </div>

          <div className="salon-board__header-controls">
            <button
              className="salon-board__header-logo salon-board__calendar-btn"
              onClick={openCalendarModal}
            >
              <Calendar />
            </button>
            <div className="salon-board__date-navigation">
              <button onClick={() => changeDate(-1)} className="salon-board__date-nav-btn">
                <ChevronLeft />
              </button>
              <span className="salon-board__date-display">
                {new Date(selectedDate).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short'
                })}
              </span>
              <button onClick={() => changeDate(1)} className="salon-board__date-nav-btn">
                <ChevronRight />
              </button>
            </div>
            <button className="salon-board__settings-btn" onClick={toggleSettings}>
              <Settings />
            </button>
          </div>
        </div>
      </header>

      <div className="salon-board__content">
        <div className="salon-board__db-info">
          <div className="salon-board__db-info-content">
            <div className="salon-board__db-info-item">
              <User />
              <span>スタッフ: {activeStaff.length}名</span>
            </div>
            <div className="salon-board__db-info-item">
              <Clock />
              <span>本日の予約: {bookings.filter(b => b.type === 'booking').length}件</span>
            </div>
          </div>
        </div>

        <div className="shared-horizontal-scroller">
          <div className="wide-content-wrapper">
            <div className="salon-board__section">
              <h3 className="salon-board__section-title"><User />スタッフ別スケジュール</h3>
              <div className="salon-board__rows">
                {displayStaff.map(staff => {
                  const isHeader = staff.id === 'HEADER_ROW';

                  // ★ staffShiftsから該当スタッフのシフト情報を取得
                  const staffShift = staffShifts.find(s => s.staff_id === staff.staff_id);
                  const isHoliday = !isHeader && staff.role !== 'マネージャー' && (!staffShift || !staffShift.hasShift);

                  const rowClassName = `salon-board__row ${isHeader ? 'salon-board__row--is-header' : ''} ${isHoliday ? 'salon-board__row--holiday' : ''}`;

                  return (
                    <div key={staff.staff_id || staff.id} className={rowClassName}>
                      <div className="salon-board__row-content">
                        <div className="salon-board__row-label">
                          {!isHeader && (
                            <div className="salon-board__label-content">
                              <div className="salon-board__label-main">
                                <div className="salon-board__color-indicator" style={{ backgroundColor: staff.color }}></div>
                                <span className="salon-board__label-text">{staff.name}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="salon-board__timeline">
                          <div className="salon-board__grid-lines">
                            {timeSlots.map(time => {
                              const isInShiftTime = !isHeader && !isHoliday && isSlotInShiftTime(staff, time);
                              const isAvailable = isInShiftTime && isSlotAvailable(staff.staff_id, time);
                              const isOutOfShift = !isHeader && !isHoliday && !isInShiftTime;
                              return (
                                <div
                                  key={`${staff.staff_id}-${time}`}
                                  className={`salon-board__grid-line ${isAvailable ? 'salon-board__clickable-slot' : ''}`}
                                  onClick={() => isAvailable && handleSlotClick(staff.staff_id, time)}
                                  style={{ backgroundColor: isOutOfShift ? '#f8f9fa' : 'transparent' }}
                                />
                              );
                            })}
                          </div>

                          {isHeader ? (
                            <div className="time-header-content">
                              <div className="time-header__top-row">
                                {timeSlots.map((time, index) => (
                                  <div key={`top-${time}`} className="time-header__cell time-header__cell--hour">
                                    {index % 2 === 0 ? time : ''}
                                  </div>
                                ))}
                              </div>
                              <div className="time-header__bottom-row">
                                {timeSlots.map(time => (
                                  <div key={`bottom-${time}`} className="time-header__cell time-header__cell--minute">
                                    {time.split(':')[1]}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            !isHoliday && bookings
                              .filter(booking => booking.staffId === staff.staff_id)
                              .map(booking => {
                                const { left, width } = calculateBookingPosition(booking.startTime, booking.endTime);
                                const serviceColorClass = getServiceColorClass(booking.serviceType);
                                return (
                                  <div
                                    key={booking.id}
                                    className={`salon-board__booking ${serviceColorClass}`}
                                    onClick={() => handleBookingClick(booking.id)}
                                    style={{ left, width, cursor: 'pointer' }}
                                  >
                                    <div className="salon-board__booking-content">
                                      {booking.type === 'schedule' ? (
                                        <div className="salon-board__booking-client">{booking.service}</div>
                                      ) : (
                                        <>
                                          <div className="salon-board__booking-client">{`${booking.client} 様`}</div>
                                          <div className="salon-board__booking-service">{booking.service} / {booking.bed}</div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {!activeModal && (
              <div className="salon-board__section">
                <h3 className="salon-board__section-title">ベッド別スケジュール</h3>
                <div className="salon-board__rows">
                  {['ベッド1', 'ベッド2'].map(bed => (
                    <div key={bed} className="salon-board__row">
                      <div className="salon-board__row-content">
                        <div className="salon-board__row-label">
                          <div className="salon-board__label-content">
                            <div className="salon-board__label-main">
                              <span className="salon-board__label-text">{bed}</span>
                            </div>
                          </div>
                        </div>
                        <div className="salon-board__timeline">
                          <div className="salon-board__grid-lines">
                            {timeSlots.map((time, index) => (
                              <div
                                key={time}
                                className={`salon-board__grid-line ${index % 2 === 0
                                  ? 'salon-board__grid-line--even'
                                  : 'salon-board__grid-line--odd'
                                  }`}
                              ></div>
                            ))}
                          </div>
                          {bookings
                            .filter(booking => booking.bed === bed)
                            .map(booking => {
                              const { left, width } = calculateBookingPosition(booking.startTime, booking.endTime);
                              const serviceColorClass = getServiceColorClass(booking.serviceType);
                              const staff = activeStaff.find(s => s.staff_id === booking.staffId);
                              return (
                                <div key={booking.id} className={`salon-board__booking ${serviceColorClass}`} style={{ left, width }}>
                                  <div className="salon-board__booking-content">
                                    <div className="salon-board__booking-client">
                                      {booking.type === 'schedule'
                                        ? booking.service
                                        : `${booking.client} 様`
                                      }
                                    </div>
                                    <div className="salon-board__booking-service salon-board__booking-service--with-icon">
                                      {staff && <div className="salon-board__small-color-indicator" style={{ backgroundColor: staff.color }} />}
                                      {booking.type === 'schedule'
                                        ? staff?.name
                                        : `${staff?.name} / ${booking.service}`
                                      }
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="salon-board__lower-area">
          {activeModal === 'booking' ? (
            <BookingModal
              activeModal={activeModal}
              selectedSlot={selectedSlot}
              onClose={closeModal}
              onModalChange={setActiveModal}
            />
          ) : (
            <div className="salon-board__db-panel">
              <div className="salon-board__db-section">
                <h3 className="salon-board__db-section-title">スタッフ業務</h3>
                <div className="salon-board__card-grid">
                  <button
                    className="salon-board__action-card salon-board__action-card--customers"
                    onClick={() => handlePageChange('customers')}
                  >
                    <Users className="salon-board__card-icon" />
                    <div className="salon-board__card-content">
                      <h4>顧客情報</h4>
                      <p>顧客一覧・詳細情報</p>
                    </div>
                  </button>
                  <button
                    className="salon-board__action-card salon-board__action-card--register"
                    onClick={() => handlePageChange('register')}
                  >
                    <CreditCard className="salon-board__card-icon" />
                    <div className="salon-board__card-content">
                      <h4>レジ/お会計</h4>
                      <p>お会計処理・決済</p>
                    </div>
                  </button>
                </div>
              </div>
              <div className="salon-board__db-section">
                <h3 className="salon-board__db-section-title">売上分析</h3>
                <div className="salon-board__card-grid">
                  <button
                    className="salon-board__action-card salon-board__action-card--analytics"
                    onClick={() => handlePageChange('analytics')}
                  >
                    <BarChart3 className="salon-board__card-icon" />
                    <div className="salon-board__card-content">
                      <h4>売上分析</h4>
                      <p>売上レポート・統計</p>
                    </div>
                  </button>
                  <div className="salon-board__stats-card">
                    <div className="salon-board__stats-list">
                      <div className="salon-board__stat-item">
                        <span className="salon-board__stat-label">本日の予約</span>
                        <span className="salon-board__stat-value">{bookings.filter(b => b.type === 'booking').length}件</span>
                      </div>
                      <div className="salon-board__stat-item">
                        <span className="salon-board__stat-label">
                          <span className="salon-board__stat-label-with-icon">
                            <span className="salon-board__stat-category-indicator salon-board__stat-category-indicator--facial"></span>
                            フェイシャル
                          </span>
                        </span>
                        <span className="salon-board__stat-value">
                          {bookings.filter(b => b.serviceType === 'フェイシャル').length}件
                        </span>
                      </div>
                      <div className="salon-board__stat-item">
                        <span className="salon-board__stat-label">
                          <span className="salon-board__stat-label-with-icon">
                            <span className="salon-board__stat-category-indicator salon-board__stat-category-indicator--body"></span>
                            ボディトリート
                          </span>
                        </span>
                        <span className="salon-board__stat-value">
                          {bookings.filter(b => b.serviceType === 'ボディトリート').length}件
                        </span>
                      </div>
                      <div className="salon-board__stat-item">
                        <span className="salon-board__stat-label">
                          <span className="salon-board__stat-label-with-icon">
                            <span className="salon-board__stat-category-indicator salon-board__stat-category-indicator--coupon"></span>
                            クーポン
                          </span>
                        </span>
                        <span className="salon-board__stat-value">
                          {bookings.filter(b => b.serviceType === 'クーポン').length}件
                        </span>
                      </div>
                      <div className="salon-board__stat-item">
                        <span className="salon-board__stat-label">
                          <span className="salon-board__stat-label-with-icon">
                            <span className="salon-board__stat-category-indicator salon-board__stat-category-indicator--limited"></span>
                            期間限定
                          </span>
                        </span>
                        <span className="salon-board__stat-value">
                          {bookings.filter(b => b.serviceType === '期間限定').length}件
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CalendarModal
        isOpen={activeModal === 'calendar'}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        onClose={closeModal}
      />
    </div>
  );
};
export default SalonBoard;