"use client";
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import AvailabilityModal from './AvailabilityModal';

const CalendarModal = ({ isOpen, selectedDate, onDateSelect, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date(selectedDate);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [showAvailability, setShowAvailability] = useState(false);

  if (!isOpen) return null;

  const today = new Date();
  const selectedDateObj = new Date(selectedDate);

  // 月の名前を取得
  const getMonthName = (date) => {
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
  };

  // 月を変更
  const changeMonth = (delta) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
  };

  // その月の日付配列を生成
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // 月の最初と最後の日
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 最初の週の開始日（日曜日から）
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // 最後の週の終了日
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const days = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // 日付をクリック
  const handleDateClick = (date) => {
    // ローカルタイムゾーンで YYYY-MM-DD を生成
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    onDateSelect(dateString);
  };

  // 日付の表示クラスを取得
  const getDateClass = (date) => {
    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
    const isToday = date.toDateString() === today.toDateString();
    const isSelected = date.toDateString() === selectedDateObj.toDateString();
    const isPast = date < today && !isToday;

    let classes = 'calendar-modal__date';

    if (!isCurrentMonth) classes += ' calendar-modal__date--other-month';
    if (isToday) classes += ' calendar-modal__date--today';
    if (isSelected) classes += ' calendar-modal__date--selected';
    if (isPast) classes += ' calendar-modal__date--past';

    return classes;
  };

  return (
    <div className="calendar-modal__overlay" onClick={onClose}>
      <div className="calendar-modal__content" onClick={(e) => e.stopPropagation()}>
        <div className="calendar-modal__header">
          <h3 className="calendar-modal__title">日付を選択</h3>
          <button className="calendar-modal__close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="calendar-modal__nav">
          <button
            className="calendar-modal__nav-btn"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="calendar-modal__month-year">
            {getMonthName(currentMonth)}
          </span>
          <button
            className="calendar-modal__nav-btn"
            onClick={() => changeMonth(1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="calendar-modal__calendar">
          <div className="calendar-modal__weekdays">
            {['日', '月', '火', '水', '木', '金', '土'].map(day => (
              <div key={day} className="calendar-modal__weekday">
                {day}
              </div>
            ))}
          </div>

          <div className="calendar-modal__dates">
            {calendarDays.map((date, index) => (
              <button
                key={index}
                className={getDateClass(date)}
                onClick={() => handleDateClick(date)}
              >
                {date.getDate()}
              </button>
            ))}
          </div>
        </div>

        <div className="calendar-modal__footer">
          <button
            className="calendar-modal__today-btn"
            onClick={() => handleDateClick(today)}
          >
            今日
          </button>
          <button
            className="calendar-modal__availability-btn"
            onClick={() => setShowAvailability(true)}  // ← ここを変更
          >
            今月の空き時間
          </button>
        </div>
      </div>
      <AvailabilityModal
        isOpen={showAvailability}
        onClose={() => setShowAvailability(false)}
      />
    </div>
  );
};

export default CalendarModal;