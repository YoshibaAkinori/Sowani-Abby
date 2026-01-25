// app/components/TomorrowReminderModal.js
"use client";
import React, { useState, useEffect } from 'react';
import { X, Send, MessageCircle, Check, AlertCircle, User, Clock, Calendar } from 'lucide-react';
import './TomorrowReminderModal.css';

const TomorrowReminderModal = ({ isOpen, onClose }) => {
  const [bookings, setBookings] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [tomorrowDate, setTomorrowDate] = useState('');
  const [previewBooking, setPreviewBooking] = useState(null);
  const [menuTypeOverrides, setMenuTypeOverrides] = useState({}); // クーポン予約のメニュー選択

  // メニュータイプの選択肢
  const MENU_OPTIONS = [
    { value: 'コルギ', label: 'コルギ' },
    { value: 'コルギ+オプション', label: 'コルギ+オプション' },
    { value: 'コルギ+キャビ', label: 'コルギ+キャビ' },
    { value: 'コルギ+オプション+キャビ', label: 'コルギ+オプション+キャビ' },
    { value: 'キャビ', label: 'キャビ' },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchTomorrowBookings();
    }
  }, [isOpen]);

  const fetchTomorrowBookings = async () => {
    setLoading(true);
    setResult(null);
    setMenuTypeOverrides({}); // リセット
    try {
      const res = await fetch('/api/reminder/tomorrow');
      const data = await res.json();
      
      if (data.success) {
        setBookings(data.bookings || []);
        setTomorrowDate(data.date);
        // LINE連携済み＆未送信の予約をデフォルトで選択
        const lineConnectedIds = (data.bookings || [])
          .filter(b => b.line_user_id && !b.sent_today)
          .map(b => b.booking_id);
        setSelectedIds(lineConnectedIds);
      }
    } catch (error) {
      console.error('予約取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (bookingId) => {
    setSelectedIds(prev => 
      prev.includes(bookingId)
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const handleSelectAll = () => {
    const lineConnectedIds = bookings
      .filter(b => b.line_user_id && !b.sent_today)
      .map(b => b.booking_id);
    setSelectedIds(lineConnectedIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleSend = async () => {
    if (selectedIds.length === 0) {
      alert('送信対象を選択してください');
      return;
    }

    // クーポン予約でメニュー未選択のものがないかチェック
    const unselectedCoupons = selectedIds.filter(id => {
      const booking = bookings.find(b => b.booking_id === id);
      return booking && booking.is_coupon && !booking.menu_type && !menuTypeOverrides[id];
    });

    if (unselectedCoupons.length > 0) {
      alert('クーポン予約のメニューを選択してください');
      return;
    }

    if (!confirm(`${selectedIds.length}名にリマインドメッセージを送信しますか？`)) {
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/reminder/tomorrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bookingIds: selectedIds,
          menuTypeOverrides: menuTypeOverrides
        })
      });

      const data = await res.json();

      if (data.success) {
        setResult({
          type: 'success',
          message: `送信完了: ${data.successCount}名${data.errorCount > 0 ? ` (エラー: ${data.errorCount}名)` : ''}`
        });
        // 送信後にリロードして状態を更新
        fetchTomorrowBookings();
      } else {
        setResult({
          type: 'error',
          message: data.error || '送信に失敗しました'
        });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: '送信中にエラーが発生しました'
      });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timeStr) => {
    return timeStr ? timeStr.substring(0, 5) : '';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getMonth() + 1}月${date.getDate()}日(${days[date.getDay()]})`;
  };

  // プレビューメッセージを生成
  const generatePreviewMessage = (booking) => {
    const menuType = menuTypeOverrides[booking.booking_id] || booking.menu_type || 'メニュー';
    const date = new Date(booking.date);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = days[date.getDay()];
    const startTime = booking.start_time.substring(0, 5);
    
    return `${booking.last_name}　${booking.first_name}様
いつもお世話になっております。
明日${month}月${day}日(${dayOfWeek})${startTime}～　
メニュー【${menuType}】
上記にてご予約いただいています🍀
明日はお気をつけてお越しください🦆
ご来店心よりお待ちしております💕
美骨小顔サロンＡＢＢＹ`;
  };

  if (!isOpen) return null;

  const lineConnectedCount = bookings.filter(b => b.line_user_id).length;
  const noLineCount = bookings.filter(b => !b.line_user_id).length;

  return (
    <div className="reminder-modal-overlay" onClick={onClose}>
      <div className="reminder-modal" onClick={e => e.stopPropagation()}>
        <div className="reminder-modal__header">
          <div className="reminder-modal__title">
            <MessageCircle size={24} />
            <span>明日の予約リマインド</span>
          </div>
          <button className="reminder-modal__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="reminder-modal__content">
          {loading ? (
            <div className="reminder-modal__loading">
              <div className="spinner"></div>
              <p>読み込み中...</p>
            </div>
          ) : (
            <>
              <div className="reminder-modal__info">
                <Calendar size={18} />
                <span>{formatDate(tomorrowDate)} の予約</span>
                <span className="reminder-modal__count">
                  全{bookings.length}件
                  {lineConnectedCount > 0 && ` (LINE: ${lineConnectedCount}件)`}
                  {bookings.filter(b => b.sent_today).length > 0 && (
                    <span className="reminder-modal__sent-count">
                      送信済: {bookings.filter(b => b.sent_today).length}件
                    </span>
                  )}
                </span>
              </div>

              {result && (
                <div className={`reminder-modal__result reminder-modal__result--${result.type}`}>
                  {result.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                  {result.message}
                </div>
              )}

              {bookings.length === 0 ? (
                <div className="reminder-modal__empty">
                  <p>明日の予約はありません</p>
                </div>
              ) : (
                <>
                  <div className="reminder-modal__actions">
                    <button 
                      className="reminder-modal__action-btn"
                      onClick={handleSelectAll}
                      disabled={lineConnectedCount === 0}
                    >
                      全て選択
                    </button>
                    <button 
                      className="reminder-modal__action-btn"
                      onClick={handleDeselectAll}
                    >
                      選択解除
                    </button>
                    <span className="reminder-modal__selected-count">
                      {selectedIds.length}名選択中
                    </span>
                  </div>

                  <div className="reminder-modal__list">
                    {bookings.map(booking => (
                      <div 
                        key={booking.booking_id}
                        className={`reminder-modal__item ${!booking.line_user_id ? 'no-line' : ''} ${selectedIds.includes(booking.booking_id) ? 'selected' : ''} ${booking.sent_today ? 'sent' : ''} ${booking.is_coupon ? 'coupon' : ''}`}
                      >
                        <div className="reminder-modal__item-check">
                          {booking.sent_today ? (
                            <span className="sent-badge">送信済</span>
                          ) : booking.line_user_id ? (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(booking.booking_id)}
                              onChange={() => handleToggleSelect(booking.booking_id)}
                            />
                          ) : (
                            <span className="no-line-badge">LINE未連携</span>
                          )}
                        </div>
                        <div className="reminder-modal__item-info">
                          <div className="reminder-modal__item-name">
                            <User size={16} />
                            {booking.last_name} {booking.first_name} 様
                          </div>
                          <div className="reminder-modal__item-time">
                            <Clock size={14} />
                            {formatTime(booking.start_time)}～
                          </div>
                          <div className="reminder-modal__item-menu">
                            {booking.is_coupon && !booking.menu_type ? (
                              <select
                                className="reminder-modal__menu-select"
                                value={menuTypeOverrides[booking.booking_id] || ''}
                                onChange={(e) => setMenuTypeOverrides(prev => ({
                                  ...prev,
                                  [booking.booking_id]: e.target.value
                                }))}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="">メニューを選択</option>
                                {MENU_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            ) : (
                              <>【{menuTypeOverrides[booking.booking_id] || booking.menu_type}】</>
                            )}
                            {booking.coupon_name && (
                              <span className="reminder-modal__coupon-badge">クーポン</span>
                            )}
                          </div>
                        </div>
                        {booking.line_user_id && !booking.sent_today && (
                          <button
                            className="reminder-modal__preview-btn"
                            onClick={() => setPreviewBooking(previewBooking?.booking_id === booking.booking_id ? null : booking)}
                          >
                            プレビュー
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {previewBooking && (
                    <div className="reminder-modal__preview">
                      <div className="reminder-modal__preview-header">
                        <span>メッセージプレビュー</span>
                        <button onClick={() => setPreviewBooking(null)}>
                          <X size={16} />
                        </button>
                      </div>
                      <div className="reminder-modal__preview-content">
                        {generatePreviewMessage(previewBooking)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="reminder-modal__footer">
          <button className="reminder-modal__cancel-btn" onClick={onClose}>
            閉じる
          </button>
          <button
            className="reminder-modal__send-btn"
            onClick={handleSend}
            disabled={sending || selectedIds.length === 0 || loading}
          >
            <Send size={18} />
            {sending ? '送信中...' : `LINE送信 (${selectedIds.length}名)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TomorrowReminderModal;