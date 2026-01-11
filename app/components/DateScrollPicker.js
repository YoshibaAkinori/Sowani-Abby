"use client";
import React, { useState, useRef, useEffect } from 'react';

const DateScrollPicker = ({ isOpen, onClose, onConfirm, initialDate }) => {
  const today = new Date();
  const initial = initialDate ? new Date(initialDate) : today;
  
  const [selectedYear, setSelectedYear] = useState(initial.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initial.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(initial.getDate());
  
  const yearRef = useRef(null);
  const monthRef = useRef(null);
  const dayRef = useRef(null);
  
  const ITEM_HEIGHT = 44;
  const VISIBLE_ITEMS = 5;
  
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
  }, [selectedYear, selectedMonth]);
  
  // 初期位置にスクロール
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToSelected(yearRef, years.indexOf(selectedYear));
        scrollToSelected(monthRef, selectedMonth - 1);
        scrollToSelected(dayRef, selectedDay - 1);
      }, 50);
    }
  }, [isOpen]);
  
  const scrollToSelected = (ref, index) => {
    if (ref.current) {
      ref.current.scrollTop = index * ITEM_HEIGHT;
    }
  };
  
  const handleScroll = (ref, items, setter) => {
    if (ref.current) {
      const scrollTop = ref.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      setter(items[clampedIndex]);
    }
  };
  
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
      scrollToSelected(yearRef, years.indexOf(t.getFullYear()));
      scrollToSelected(monthRef, t.getMonth());
      scrollToSelected(dayRef, t.getDate() - 1);
    }, 50);
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
              onScroll={() => handleScroll(yearRef, years, setSelectedYear)}
            >
              <div className="date-picker-padding"></div>
              {years.map(year => (
                <div
                  key={year}
                  className={`date-picker-item ${year === selectedYear ? 'selected' : ''}`}
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
              onScroll={() => handleScroll(monthRef, months, setSelectedMonth)}
            >
              <div className="date-picker-padding"></div>
              {months.map(month => (
                <div
                  key={month}
                  className={`date-picker-item ${month === selectedMonth ? 'selected' : ''}`}
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
              onScroll={() => handleScroll(dayRef, days, setSelectedDay)}
            >
              <div className="date-picker-padding"></div>
              {days.map(day => (
                <div
                  key={day}
                  className={`date-picker-item ${day === selectedDay ? 'selected' : ''}`}
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
          transition: all 0.15s ease;
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