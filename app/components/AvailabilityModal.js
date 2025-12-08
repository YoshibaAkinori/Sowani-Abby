// app/components/AvailabilityModal.js
"use client";
import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Loader2, Copy, Check } from 'lucide-react';
import './AvailabilityModal.css';

const AvailabilityModal = ({ isOpen, onClose }) => {
  const [availability, setAvailability] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailability();
      setCopied(false);
    }
  }, [isOpen]);

  const fetchAvailability = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/availability');
      const data = await response.json();
      
      if (data.success) {
        setAvailability(data.data.availability || []);
      } else {
        setError('空き時間の取得に失敗しました');
      }
    } catch (err) {
      console.error('空き時間取得エラー:', err);
      setError('空き時間の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateStr, dayOfWeek) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}(${dayOfWeek})`;
  };

  // コピー用テキストを生成
  const generateCopyText = () => {
    return availability.map(day => {
      const dateText = formatDate(day.date, day.dayOfWeek);
      const slotsText = day.freeBlocks.map(block => `${block.start} 〜 ${block.end}`).join('、');
      return `${dateText} ${slotsText}`;
    }).join('\n');
  };

  // クリップボードにコピー
  const handleCopy = async () => {
    const text = generateCopyText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('コピーエラー:', err);
    }
  };

  return (
    <div className="availability-modal-overlay" onClick={onClose}>
      <div className="availability-modal" onClick={(e) => e.stopPropagation()}>
        <div className="availability-modal__header">
          <div className="availability-modal__title">
            <Clock size={20} />
            <h2>直近2週間の空き時間</h2>
          </div>
          <button className="availability-modal__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="availability-modal__content">
          {isLoading ? (
            <div className="availability-modal__loading">
              <Loader2 size={24} className="spin" />
              <span>読み込み中...</span>
            </div>
          ) : error ? (
            <div className="availability-modal__error">
              {error}
            </div>
          ) : availability.length === 0 ? (
            <div className="availability-modal__empty">
              <Calendar size={32} />
              <p>直近2週間に空き時間はありません</p>
            </div>
          ) : (
            <div className="availability-modal__list">
              {availability.map((day) => (
                <div key={day.date} className="availability-modal__day">
                  <div className="availability-modal__date">
                    {formatDate(day.date, day.dayOfWeek)}
                  </div>
                  <div className="availability-modal__slots">
                    {day.freeBlocks.map((block, index) => (
                      <div key={index} className="availability-modal__slot">
                        {block.start} 〜 {block.end}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="availability-modal__footer">
          <p className="availability-modal__note">
            ※ 1時間以上の空き時間を表示しています
          </p>
          {availability.length > 0 && (
            <button 
              className={`availability-modal__copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check size={16} />
                  コピーしました
                </>
              ) : (
                <>
                  <Copy size={16} />
                  テキストをコピー
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvailabilityModal;