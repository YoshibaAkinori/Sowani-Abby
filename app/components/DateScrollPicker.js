"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';

const DateScrollPicker = ({ isOpen, onClose, onConfirm, initialDate }) => {
  const today = new Date();
  const initial = initialDate ? new Date(initialDate) : today;
  
  const [selectedYear, setSelectedYear] = useState(initial.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initial.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(initial.getDate());
  
  const yearRef = useRef(null);
  const monthRef = useRef(null);
  const dayRef = useRef(null);
  
  // スクロール中かどうかを管理
  const scrollingRef = useRef({ year: false, month: false, day: false });
  const scrollTimeoutRef = useRef({ year: null, month: null, day: null });
  
  const ITEM_HEIGHT = 44;
  
  // マウスホイールで1項目ずつ移動
  const handleWheel = useCallback((e, ref, items, setter, key) => {
    e.preventDefault();
    
    if (!ref.current) return;
    
    const direction = e.deltaY > 0 ? 1 : -1;
    const currentIndex = Math.round(ref.current.scrollTop / ITEM_HEIGHT);
    const newIndex = Math.max(0, Math.min(currentIndex + direction, items.length - 1));
    
    ref.current.scrollTo({
      top: newIndex * ITEM_HEIGHT,
      behavior: 'smooth'
    });
    
    setter(items[newIndex]);
  }, []);
  
  // wheelイベントを登録
  useEffect(() => {
    const yearEl = yearRef.current;
    const monthEl = monthRef.current;
    const dayEl = dayRef.current;
    
    const yearHandler = (e) => handleWheel(e, yearRef, years, setSelectedYear, 'year');
    const monthHandler = (e) => handleWheel(e, monthRef, months, setSelectedMonth, 'month');
    const dayHandler = (e) => handleWheel(e, dayRef, days, setSelectedDay, 'day');
    
    if (yearEl) yearEl.addEventListener('wheel', yearHandler, { passive: false });
    if (monthEl) monthEl.addEventListener('wheel', monthHandler, { passive: false });
    if (dayEl) dayEl.addEventListener('wheel', dayHandler, { passive: false });
    
    return () => {
      if (yearEl) yearEl.removeEventListener('wheel', yearHandler);
      if (monthEl) monthEl.removeEventListener('wheel', monthHandler);
      if (dayEl) dayEl.removeEventListener('wheel', dayHandler);
    };
  }, [years, months, days, handleWheel]);
  
  // 年の範囲（1900年 〜 今年+2年）
  const currentYear = today.getFullYear();
  const years = Array.from({ length: currentYear + 2 - 1900 + 1 }, (_, i) => 1900 + i);
  
  // 月（1-12）
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // 日（選択された年月に応じて変動）
  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };
  
  const days = Array.from(
    { length: getDaysInMonth(selectedYear, selectedMonth) },
    (_, i) => i + 1
  );
  
  // 日が月の日数を超えた場合は調整
  useEffect(() => {
    const maxDay = getDaysInMonth(selectedYear, selectedMonth);
    if (selectedDay > maxDay) {
      setSelectedDay(maxDay);
    }
  }, [selectedYear, selectedMonth, selectedDay]);
  
  // モーダルが開いたときに初期値をセット
  useEffect(() => {
    if (isOpen) {
      const initial = initialDate ? new Date(initialDate) : new Date();
      const year = initial.getFullYear();
      const month = initial.getMonth() + 1;
      const day = initial.getDate();
      
      setSelectedYear(year);
      setSelectedMonth(month);
      setSelectedDay(day);
      
      // スクロール位置を設定
      setTimeout(() => {
        scrollToIndex(yearRef, years.indexOf(year));
        scrollToIndex(monthRef, month - 1);
        scrollToIndex(dayRef, day - 1);
      }, 50);
    }
  }, [isOpen, initialDate]);
  
  const scrollToIndex = (ref, index) => {
    if (ref.current) {
      ref.current.scrollTop = index * ITEM_HEIGHT;
    }
  };
  
  // スクロール終了時にスナップする
  const handleScrollEnd = useCallback((ref, items, setter, key) => {
    if (ref.current) {
      const scrollTop = ref.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      
      // 確実にスナップ位置に移動
      ref.current.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: 'smooth'
      });
      
      setter(items[clampedIndex]);
      scrollingRef.current[key] = false;
    }
  }, []);
  
  const handleScroll = useCallback((ref, items, setter, key) => {
    scrollingRef.current[key] = true;
    
    // 既存のタイムアウトをクリア
    if (scrollTimeoutRef.current[key]) {
      clearTimeout(scrollTimeoutRef.current[key]);
    }
    
    // スクロール停止を検知してスナップ
    scrollTimeoutRef.current[key] = setTimeout(() => {
      handleScrollEnd(ref, items, setter, key);
    }, 100);
  }, [handleScrollEnd]);
  
  const handleConfirm = () => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    onConfirm(dateStr);
    onClose();
  };
  
  const handleToday = () => {
    const t = new Date();
    setSelectedYear(t.getFullYear());
    setSelectedMonth(t.getMonth() + 1);
    setSelectedDay(t.getDate());
    setTimeout(() => {
      scrollToIndex(yearRef, years.indexOf(t.getFullYear()));
      scrollToIndex(monthRef, t.getMonth());
      scrollToIndex(dayRef, t.getDate() - 1);
    }, 50);
  };
  
  // タップで選択
  const handleItemClick = (ref, items, setter, value) => {
    const index = items.indexOf(value);
    if (index !== -1) {
      setter(value);
      scrollToIndex(ref, index);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="date-picker-overlay" onClick={onClose}>
      <div className="date-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="date-picker-header">
          <span>日付を選択</span>
          <button className="date-picker-today-btn" onClick={handleToday}>
            今日
          </button>
        </div>
        
        <div className="date-picker-container">
          {/* 選択インジケーター */}
          <div className="date-picker-indicator"></div>
          
          {/* 年 */}
          <div className="date-picker-column">
            <div
              ref={yearRef}
              className="date-picker-scroll"
              onScroll={() => handleScroll(yearRef, years, setSelectedYear, 'year')}
            >
              <div className="date-picker-padding"></div>
              {years.map(year => (
                <div
                  key={year}
                  className={`date-picker-item ${year === selectedYear ? 'selected' : ''}`}
                  onClick={() => handleItemClick(yearRef, years, setSelectedYear, year)}
                >
                  {year}年
                </div>
              ))}
              <div className="date-picker-padding"></div>
            </div>
          </div>
          
          {/* 月 */}
          <div className="date-picker-column">
            <div
              ref={monthRef}
              className="date-picker-scroll"
              onScroll={() => handleScroll(monthRef, months, setSelectedMonth, 'month')}
            >
              <div className="date-picker-padding"></div>
              {months.map(month => (
                <div
                  key={month}
                  className={`date-picker-item ${month === selectedMonth ? 'selected' : ''}`}
                  onClick={() => handleItemClick(monthRef, months, setSelectedMonth, month)}
                >
                  {month}月
                </div>
              ))}
              <div className="date-picker-padding"></div>
            </div>
          </div>
          
          {/* 日 */}
          <div className="date-picker-column">
            <div
              ref={dayRef}
              className="date-picker-scroll"
              onScroll={() => handleScroll(dayRef, days, setSelectedDay, 'day')}
            >
              <div className="date-picker-padding"></div>
              {days.map(day => (
                <div
                  key={day}
                  className={`date-picker-item ${day === selectedDay ? 'selected' : ''}`}
                  onClick={() => handleItemClick(dayRef, days, setSelectedDay, day)}
                >
                  {day}日
                </div>
              ))}
              <div className="date-picker-padding"></div>
            </div>
          </div>
        </div>
        
        <div className="date-picker-actions">
          <button className="date-picker-cancel" onClick={onClose}>
            キャンセル
          </button>
          <button className="date-picker-confirm" onClick={handleConfirm}>
            確定
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .date-picker-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .date-picker-modal {
          background: white;
          border-radius: 16px;
          width: 320px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .date-picker-header {
          padding: 16px;
          text-align: center;
          font-weight: 600;
          font-size: 16px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
        }
        
        .date-picker-today-btn {
          padding: 4px 12px;
          font-size: 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
        }
        
        .date-picker-today-btn:hover {
          background: #2563eb;
        }
        
        .date-picker-container {
          display: flex;
          height: 220px;
          position: relative;
        }
        
        .date-picker-indicator {
          position: absolute;
          top: 50%;
          left: 12px;
          right: 12px;
          height: 44px;
          transform: translateY(-50%);
          background: #f3f4f6;
          border-radius: 8px;
          pointer-events: none;
          z-index: 0;
        }
        
        .date-picker-column {
          flex: 1;
          position: relative;
          z-index: 1;
        }
        
        .date-picker-scroll {
          height: 100%;
          overflow-y: auto;
          scroll-snap-type: y mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          overscroll-behavior: contain;
        }
        
        .date-picker-scroll::-webkit-scrollbar {
          display: none;
        }
        
        .date-picker-padding {
          height: 88px;
        }
        
        .date-picker-item {
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #9ca3af;
          scroll-snap-align: center;
          scroll-snap-stop: always;
          transition: all 0.15s ease;
          cursor: pointer;
          user-select: none;
        }
        
        .date-picker-item:active {
          background: rgba(59, 130, 246, 0.1);
        }
        
        .date-picker-item.selected {
          color: #111827;
          font-weight: 600;
        }
        
        .date-picker-actions {
          display: flex;
          border-top: 1px solid #e5e7eb;
        }
        
        .date-picker-cancel,
        .date-picker-confirm {
          flex: 1;
          padding: 16px;
          font-size: 16px;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        
        .date-picker-cancel {
          background: white;
          color: #6b7280;
        }
        
        .date-picker-cancel:hover {
          background: #f9fafb;
        }
        
        .date-picker-confirm {
          background: #3b82f6;
          color: white;
          font-weight: 600;
        }
        
        .date-picker-confirm:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
};

export default DateScrollPicker;