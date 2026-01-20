"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';

const MonthScrollPicker = ({ isOpen, onClose, onConfirm, initialYear, initialMonth }) => {
  const today = new Date();
  
  const [selectedYear, setSelectedYear] = useState(initialYear || today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialMonth || today.getMonth() + 1);
  
  const yearRef = useRef(null);
  const monthRef = useRef(null);
  
  const ITEM_HEIGHT = 44;
  
  // 年の範囲（2024年 〜 今年+1年）
  const currentYear = today.getFullYear();
  const years = Array.from({ length: currentYear + 1 - 2025 + 1 }, (_, i) => 2025 + i);
  
  // 月（1-12）
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // マウスホイールで1項目ずつ移動
  const handleWheel = useCallback((e, ref, items, setter) => {
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
    
    const yearHandler = (e) => handleWheel(e, yearRef, years, setSelectedYear);
    const monthHandler = (e) => handleWheel(e, monthRef, months, setSelectedMonth);
    
    if (yearEl) yearEl.addEventListener('wheel', yearHandler, { passive: false });
    if (monthEl) monthEl.addEventListener('wheel', monthHandler, { passive: false });
    
    return () => {
      if (yearEl) yearEl.removeEventListener('wheel', yearHandler);
      if (monthEl) monthEl.removeEventListener('wheel', monthHandler);
    };
  }, [years, months, handleWheel]);
  
  // モーダルが開いたときに初期値をセット
  useEffect(() => {
    if (isOpen) {
      const year = initialYear || today.getFullYear();
      const month = initialMonth || today.getMonth() + 1;
      
      setSelectedYear(year);
      setSelectedMonth(month);
      
      // スクロール位置を設定
      setTimeout(() => {
        scrollToSelected(yearRef, years.indexOf(year));
        scrollToSelected(monthRef, month - 1);
      }, 50);
    }
  }, [isOpen, initialYear, initialMonth]);
  
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
    onConfirm({ year: selectedYear, month: selectedMonth });
    onClose();
  };
  
  const handleThisMonth = () => {
    const t = new Date();
    setSelectedYear(t.getFullYear());
    setSelectedMonth(t.getMonth() + 1);
    setTimeout(() => {
      scrollToSelected(yearRef, years.indexOf(t.getFullYear()));
      scrollToSelected(monthRef, t.getMonth());
    }, 50);
  };
  
  // タップで選択
  const handleItemClick = (ref, items, setter, value) => {
    const index = items.indexOf(value);
    if (index !== -1) {
      setter(value);
      scrollToSelected(ref, index);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="month-picker-overlay" onClick={onClose}>
      <div className="month-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="month-picker-header">
          <span>年月を選択</span>
          <button className="month-picker-today-btn" onClick={handleThisMonth}>
            今月
          </button>
        </div>
        
        <div className="month-picker-container">
          {/* 選択インジケーター */}
          <div className="month-picker-indicator"></div>
          
          {/* 年 */}
          <div className="month-picker-column">
            <div
              ref={yearRef}
              className="month-picker-scroll"
              onScroll={() => handleScroll(yearRef, years, setSelectedYear)}
            >
              <div className="month-picker-padding"></div>
              {years.map(year => (
                <div
                  key={year}
                  className={`month-picker-item ${year === selectedYear ? 'selected' : ''}`}
                  onClick={() => handleItemClick(yearRef, years, setSelectedYear, year)}
                >
                  {year}年
                </div>
              ))}
              <div className="month-picker-padding"></div>
            </div>
          </div>
          
          {/* 月 */}
          <div className="month-picker-column">
            <div
              ref={monthRef}
              className="month-picker-scroll"
              onScroll={() => handleScroll(monthRef, months, setSelectedMonth)}
            >
              <div className="month-picker-padding"></div>
              {months.map(month => (
                <div
                  key={month}
                  className={`month-picker-item ${month === selectedMonth ? 'selected' : ''}`}
                  onClick={() => handleItemClick(monthRef, months, setSelectedMonth, month)}
                >
                  {month}月
                </div>
              ))}
              <div className="month-picker-padding"></div>
            </div>
          </div>
        </div>
        
        <div className="month-picker-actions">
          <button className="month-picker-cancel" onClick={onClose}>
            キャンセル
          </button>
          <button className="month-picker-confirm" onClick={handleConfirm}>
            確定
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .month-picker-overlay {
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
        
        .month-picker-modal {
          background: white;
          border-radius: 16px;
          width: 280px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .month-picker-header {
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
        
        .month-picker-today-btn {
          padding: 4px 12px;
          font-size: 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
        }
        
        .month-picker-today-btn:hover {
          background: #2563eb;
        }
        
        .month-picker-container {
          display: flex;
          height: 220px;
          position: relative;
        }
        
        .month-picker-indicator {
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
        
        .month-picker-column {
          flex: 1;
          position: relative;
          z-index: 1;
        }
        
        .month-picker-scroll {
          height: 100%;
          overflow-y: auto;
          scroll-snap-type: y mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          overscroll-behavior: contain;
        }
        
        .month-picker-scroll::-webkit-scrollbar {
          display: none;
        }
        
        .month-picker-padding {
          height: 88px;
        }
        
        .month-picker-item {
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
        
        .month-picker-item:active {
          background: rgba(59, 130, 246, 0.1);
        }
        
        .month-picker-item.selected {
          color: #111827;
          font-weight: 600;
        }
        
        .month-picker-actions {
          display: flex;
          border-top: 1px solid #e5e7eb;
        }
        
        .month-picker-cancel,
        .month-picker-confirm {
          flex: 1;
          padding: 16px;
          font-size: 16px;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        
        .month-picker-cancel {
          background: white;
          color: #6b7280;
        }
        
        .month-picker-cancel:hover {
          background: #f9fafb;
        }
        
        .month-picker-confirm {
          background: #3b82f6;
          color: white;
          font-weight: 600;
        }
        
        .month-picker-confirm:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
};

export default MonthScrollPicker;