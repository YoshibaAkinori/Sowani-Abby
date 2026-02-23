"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const TimeScrollPicker = ({ isOpen, onClose, onConfirm, initialTime, showSeconds = false }) => {
  const initial = initialTime ? initialTime.split(':') : ['12', '00', '00'];
  
  const [selectedHour, setSelectedHour] = useState(parseInt(initial[0]) || 12);
  const [selectedMinute, setSelectedMinute] = useState(parseInt(initial[1]) || 0);
  const [selectedSecond, setSelectedSecond] = useState(parseInt(initial[2]) || 0);
  
  const hourRef = useRef(null);
  const minuteRef = useRef(null);
  const secondRef = useRef(null);
  const scrollTimeoutRef = useRef({ hour: null, minute: null, second: null });
  
  const ITEM_HEIGHT = 44;
  
  // 時（0-23）
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  
  // 分（0-55、5分刻み）
  const minutes = Array.from({ length: 6 }, (_, i) => i * 10);
  
  // 秒（0-59）
  const seconds = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  
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
    const hourEl = hourRef.current;
    const minuteEl = minuteRef.current;
    const secondEl = secondRef.current;
    
    const hourHandler = (e) => handleWheel(e, hourRef, hours, setSelectedHour);
    const minuteHandler = (e) => handleWheel(e, minuteRef, minutes, setSelectedMinute);
    const secondHandler = (e) => handleWheel(e, secondRef, seconds, setSelectedSecond);
    
    if (hourEl) hourEl.addEventListener('wheel', hourHandler, { passive: false });
    if (minuteEl) minuteEl.addEventListener('wheel', minuteHandler, { passive: false });
    if (secondEl) secondEl.addEventListener('wheel', secondHandler, { passive: false });
    
    return () => {
      if (hourEl) hourEl.removeEventListener('wheel', hourHandler);
      if (minuteEl) minuteEl.removeEventListener('wheel', minuteHandler);
      if (secondEl) secondEl.removeEventListener('wheel', secondHandler);
    };
  }, [hours, minutes, seconds, handleWheel]);
  
  const scrollToSelected = (ref, index) => {
    if (ref.current) {
      ref.current.scrollTop = index * ITEM_HEIGHT;
    }
  };
  
  // モーダルが開いたときに初期値をセット
  useEffect(() => {
    if (isOpen) {
      const time = initialTime ? initialTime.split(':') : ['12', '00', '00'];
      const hour = parseInt(time[0]) || 12;
      // 分を5分単位に丸める
      const rawMinute = parseInt(time[1]) || 0;
      const minute = Math.round(rawMinute / 10) * 10;
      const second = parseInt(time[2]) || 0;
      
      setSelectedHour(hour);
      setSelectedMinute(minute >= 60 ? 55 : minute);
      setSelectedSecond(second);
      
      // スクロール位置を設定
      setTimeout(() => {
        scrollToSelected(hourRef, hour);
        scrollToSelected(minuteRef, minute >= 60 ? 5 : minute / 10);
        if (showSeconds) {
          scrollToSelected(secondRef, second);
        }
      }, 50);
    }
  }, [isOpen, initialTime, showSeconds]);
  
  // スクロール終了時にスナップする
  const handleScrollEnd = useCallback((ref, items, setter) => {
    if (ref.current) {
      const scrollTop = ref.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      
      ref.current.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: 'smooth'
      });
      
      setter(items[clampedIndex]);
    }
  }, []);
  
  const handleScroll = useCallback((ref, items, setter, key) => {
    if (scrollTimeoutRef.current[key]) {
      clearTimeout(scrollTimeoutRef.current[key]);
    }
    
    scrollTimeoutRef.current[key] = setTimeout(() => {
      handleScrollEnd(ref, items, setter);
    }, 100);
  }, [handleScrollEnd]);
  
  const handleConfirm = () => {
    const hourStr = String(selectedHour).padStart(2, '0');
    const minuteStr = String(selectedMinute).padStart(2, '0');
    
    if (showSeconds) {
      const secondStr = String(selectedSecond).padStart(2, '0');
      onConfirm(`${hourStr}:${minuteStr}:${secondStr}`);
    } else {
      onConfirm(`${hourStr}:${minuteStr}`);
    }
    onClose();
  };
  
  const handleNow = () => {
    const now = new Date();
    const minute = Math.round(now.getMinutes() / 5) * 5;
    setSelectedHour(now.getHours());
    setSelectedMinute(minute >= 60 ? 55 : minute);
    setSelectedSecond(now.getSeconds());
    setTimeout(() => {
      scrollToSelected(hourRef, now.getHours());
      scrollToSelected(minuteRef, minute >= 60 ? 5 : minute / 10);
      if (showSeconds) {
        scrollToSelected(secondRef, now.getSeconds());
      }
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
    <div className="time-picker-overlay" onClick={onClose}>
      <div className="time-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="time-picker-header">
          <span>時間を選択</span>
          <button className="time-picker-now-btn" onClick={handleNow}>
            現在時刻
          </button>
        </div>
        
        <div className="time-picker-container">
          {/* 選択インジケーター */}
          <div className="time-picker-indicator"></div>
          
          {/* 時 */}
          <div className="time-picker-column">
            <div
              ref={hourRef}
              className="time-picker-scroll"
              onScroll={() => handleScroll(hourRef, hours, setSelectedHour, 'hour')}
            >
              <div className="time-picker-padding"></div>
              {hours.map(hour => (
                <div
                  key={hour}
                  className={`time-picker-item ${hour === selectedHour ? 'selected' : ''}`}
                  onClick={() => handleItemClick(hourRef, hours, setSelectedHour, hour)}
                >
                  {String(hour).padStart(2, '0')}時
                </div>
              ))}
              <div className="time-picker-padding"></div>
            </div>
          </div>
          
          {/* 分 */}
          <div className="time-picker-column">
            <div
              ref={minuteRef}
              className="time-picker-scroll"
              onScroll={() => handleScroll(minuteRef, minutes, setSelectedMinute, 'minute')}
            >
              <div className="time-picker-padding"></div>
              {minutes.map(minute => (
                <div
                  key={minute}
                  className={`time-picker-item ${minute === selectedMinute ? 'selected' : ''}`}
                  onClick={() => handleItemClick(minuteRef, minutes, setSelectedMinute, minute)}
                >
                  {String(minute).padStart(2, '0')}分
                </div>
              ))}
              <div className="time-picker-padding"></div>
            </div>
          </div>
          
          {/* 秒（オプション） */}
          {showSeconds && (
            <div className="time-picker-column">
              <div
                ref={secondRef}
                className="time-picker-scroll"
                onScroll={() => handleScroll(secondRef, seconds, setSelectedSecond, 'second')}
              >
                <div className="time-picker-padding"></div>
                {seconds.map(second => (
                  <div
                    key={second}
                    className={`time-picker-item ${second === selectedSecond ? 'selected' : ''}`}
                    onClick={() => handleItemClick(secondRef, seconds, setSelectedSecond, second)}
                  >
                    {String(second).padStart(2, '0')}秒
                  </div>
                ))}
                <div className="time-picker-padding"></div>
              </div>
            </div>
          )}
        </div>
        
        <div className="time-picker-actions">
          <button className="time-picker-cancel" onClick={onClose}>
            キャンセル
          </button>
          <button className="time-picker-confirm" onClick={handleConfirm}>
            確定
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .time-picker-overlay {
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
        
        .time-picker-modal {
          background: white;
          border-radius: 16px;
          width: ${showSeconds ? '280px' : '220px'};
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .time-picker-header {
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
        
        .time-picker-now-btn {
          padding: 4px 12px;
          font-size: 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
        }
        
        .time-picker-now-btn:hover {
          background: #2563eb;
        }
        
        .time-picker-container {
          display: flex;
          height: 220px;
          position: relative;
        }
        
        .time-picker-indicator {
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
        
        .time-picker-column {
          flex: 1;
          position: relative;
          z-index: 1;
        }
        
        .time-picker-scroll {
          height: 100%;
          overflow-y: auto;
          scroll-snap-type: y mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          overscroll-behavior: contain;
        }
        
        .time-picker-scroll::-webkit-scrollbar {
          display: none;
        }
        
        .time-picker-padding {
          height: 88px;
        }
        
        .time-picker-item {
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: #9ca3af;
          scroll-snap-align: center;
          scroll-snap-stop: always;
          transition: all 0.15s ease;
          cursor: pointer;
          user-select: none;
        }
        
        .time-picker-item:active {
          background: rgba(59, 130, 246, 0.1);
        }
        
        .time-picker-item.selected {
          color: #111827;
          font-weight: 600;
        }
        
        .time-picker-actions {
          display: flex;
          border-top: 1px solid #e5e7eb;
        }
        
        .time-picker-cancel,
        .time-picker-confirm {
          flex: 1;
          padding: 16px;
          font-size: 16px;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        
        .time-picker-cancel {
          background: white;
          color: #6b7280;
        }
        
        .time-picker-cancel:hover {
          background: #f9fafb;
        }
        
        .time-picker-confirm {
          background: #3b82f6;
          color: white;
          font-weight: 600;
        }
        
        .time-picker-confirm:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
};

export default TimeScrollPicker;