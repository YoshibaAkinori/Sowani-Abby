"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Search, Calendar, Phone, Mail, CreditCard, Tag, Clock, Edit2, Plus, FileText, Save, X } from 'lucide-react';
import './customers.css';
import Receipt from '../components/Receipt';
import TicketGroupList from '../components/TicketGroupList';
import DateScrollPicker from '../components/DateScrollPicker';

const CustomersPage = () => {
  const [activeTab, setActiveTab] = useState('basic');
  const [searchName, setSearchName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [todayBookings, setTodayBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptPaymentId, setReceiptPaymentId] = useState(null);
  
  // 予約日付選択
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 編集モード関連
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    last_name: '',
    first_name: '',
    last_name_kana: '',
    first_name_kana: '',
    phone_number: '',
    email: '',
    birth_date: '',
    gender: 'not_specified',
    notes: '',
    base_visit_count: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 顧客詳細データ
  const [customerTickets, setCustomerTickets] = useState([]);
  const [customerCoupons, setCustomerCoupons] = useState([]);
  const [visitHistory, setVisitHistory] = useState([]);

  // 初期データ読み込み
  useEffect(() => {
    fetchBookingsByDate();
  }, [bookingDate]);

  // 指定日の予約者取得
  const fetchBookingsByDate = async () => {
    try {
      const response = await fetch(`/api/customers/today-bookings?date=${bookingDate}`);
      const data = await response.json();
      if (data.success) {
        setTodayBookings(data.data || []);
      }
    } catch (error) {
      console.error('予約者取得エラー:', error);
    }
  };

  // 名前検索
  const handleNameSearch = async () => {
    if (!searchName.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/customers/search?name=${encodeURIComponent(searchName)}`);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.data || []);
        // 結果が1件のみの場合は自動選択
        if (data.data?.length === 1) {
          handleSelectCustomer(data.data[0].customer_id);
        }
      } else {
        alert('検索に失敗しました');
      }
    } catch (error) {
      console.error('検索エラー:', error);
      alert('検索中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 顧客選択
  const handleSelectCustomer = async (customerId) => {
    setIsLoading(true);
    setIsEditMode(false); // 編集モードをリセット
    try {
      // 顧客基本情報
      const customerRes = await fetch(`/api/customers/${customerId}`);
      const customerData = await customerRes.json();

      if (customerData.success) {
        setSelectedCustomer(customerData.data);

        // 回数券取得
        const ticketsRes = await fetch(`/api/customers/${customerId}/tickets`);
        const ticketsData = await ticketsRes.json();
        setCustomerTickets(ticketsData.data || []);

        // クーポン履歴取得
        const couponsRes = await fetch(`/api/customers/${customerId}/coupons`);
        const couponsData = await couponsRes.json();
        setCustomerCoupons(couponsData.data || []);

        // 来店履歴取得
        const historyRes = await fetch(`/api/customers/${customerId}/visit-history`);
        const historyData = await historyRes.json();
        setVisitHistory(historyData.data || []);

        // 検索結果をクリア
        setSearchResults([]);
        setSearchName('');
      }
    } catch (error) {
      console.error('顧客情報取得エラー:', error);
      alert('顧客情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };
  // レシート表示
  const handleShowReceipt = (paymentId) => {
    setReceiptPaymentId(paymentId);
    setShowReceipt(true);
  };

  // レシートモーダルを閉じる
  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setReceiptPaymentId(null);
  };

  // 今日の予約者から選択
  const handleSelectFromBooking = (customerId) => {
    handleSelectCustomer(customerId);
  };

  // 性別ラベル取得
  const getGenderLabel = (gender) => {
    const labels = {
      'male': '男性',
      'female': '女性',
      'other': 'その他',
      'not_specified': '未設定'
    };
    return labels[gender] || '未設定';
  };
  // 顧客選択を解除
  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerTickets([]);
    setCustomerCoupons([]);
    setVisitHistory([]);
    setActiveTab('basic');
    setIsEditMode(false);
  };

  // 編集モード開始
  const handleStartEdit = () => {
    setEditFormData({
      last_name: selectedCustomer.last_name || '',
      first_name: selectedCustomer.first_name || '',
      last_name_kana: selectedCustomer.last_name_kana || '',
      first_name_kana: selectedCustomer.first_name_kana || '',
      phone_number: selectedCustomer.phone_number || '',
      email: selectedCustomer.email || '',
      birth_date: selectedCustomer.birth_date || '',
      gender: selectedCustomer.gender || 'not_specified',
      notes: selectedCustomer.notes || '',
      base_visit_count: selectedCustomer.base_visit_count || ''
    });
    setIsEditMode(true);
    setErrorMessage('');
    setSuccessMessage('');
  };

  // 編集キャンセル
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditFormData({
      last_name: '',
      first_name: '',
      last_name_kana: '',
      first_name_kana: '',
      phone_number: '',
      email: '',
      birth_date: '',
      gender: 'not_specified',
      notes: '',
      base_visit_count: ''
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  // 保存処理
  const handleSaveEdit = async () => {
    // バリデーション
    if (!editFormData.last_name || !editFormData.first_name || !editFormData.phone_number) {
      setErrorMessage('姓・名・電話番号は必須です');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/customers/${selectedCustomer.customer_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });

      const result = await response.json();

      if (result.success) {
        setSuccessMessage('顧客情報を更新しました');
        setIsEditMode(false);
        // 最新情報を再取得
        await handleSelectCustomer(selectedCustomer.customer_id);

        // 成功メッセージを3秒後に消す
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        setErrorMessage(result.error || '更新に失敗しました');
      }
    } catch (error) {
      console.error('更新エラー:', error);
      setErrorMessage('更新中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="customers-page">
      {/* ヘッダー */}
      <header className="customers-page__header">
        <div className="customers-page__header-container">
          <Link href="/" className="customers-page__back-link">
            <ArrowLeft size={20} />
            <span>予約一覧に戻る</span>
          </Link>
          <div className="customers-page__header-title">
            <Users size={24} />
            <h1>ABBY 顧客管理</h1>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="customers-page__main">
        {/* 検索セクション */}
        {!selectedCustomer && (
          <section className="customers-page__search-section">
            <div className="customers-page__search-grid">
              {/* 左側: 名前検索 */}
              <div className="customers-page__search-box">
                <label className="customers-page__search-label">
                  <Search size={16} />
                  お客様検索(名前)
                </label>
                <div className="customers-page__search-input-group">
                  <input
                    type="text"
                    className="customers-page__search-input"
                    placeholder="姓名を入力(例: 田中、田中花子)"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleNameSearch()}
                    disabled={isLoading}
                  />
                  <button
                    className="customers-page__search-btn"
                    onClick={handleNameSearch}
                    disabled={isLoading}
                  >
                    <Search size={16} />
                    {isLoading ? '検索中...' : '検索'}
                  </button>
                </div>

                {/* 検索結果 */}
                {searchResults.length > 0 && (
                  <div className="customers-page__search-results">
                    {searchResults.map(customer => (
                      <div
                        key={customer.customer_id}
                        className="customers-page__search-result-item"
                        onClick={() => handleSelectCustomer(customer.customer_id)}
                      >
                        <div className="customers-page__result-name">
                          {customer.last_name} {customer.first_name}
                          ({customer.last_name_kana} {customer.first_name_kana})
                        </div>
                        <div className="customers-page__result-info">
                          <div className="customers-page__result-info-item">
                            <Phone size={14} />
                            {customer.phone_number}
                          </div>
                          {customer.email && (
                            <div className="customers-page__result-info-item">
                              <Mail size={14} />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 右側: 予約者一覧 */}
              <div className="customers-page__search-box">
                <label className="customers-page__search-label">
                  <Calendar size={16} />
                  予約者一覧
                </label>
                
                {/* 日付選択ボタン */}
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    marginBottom: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} color="#6b7280" />
                    {(() => {
                      const d = new Date(bookingDate);
                      const today = new Date();
                      const isToday = bookingDate === today.toISOString().split('T')[0];
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);
                      const isYesterday = bookingDate === yesterday.toISOString().split('T')[0];
                      const tomorrow = new Date(today);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const isTomorrow = bookingDate === tomorrow.toISOString().split('T')[0];
                      
                      const label = isToday ? '（今日）' : isYesterday ? '（昨日）' : isTomorrow ? '（明日）' : '';
                      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${label}`;
                    })()}
                  </span>
                  <span style={{ color: '#9ca3af' }}>▼</span>
                </button>

                <div className="customers-page__today-bookings" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {todayBookings.length > 0 ? (
                    todayBookings.map(booking => (
                      <div
                        key={booking.booking_id}
                        className="customers-page__today-booking-item"
                        onClick={() => handleSelectFromBooking(booking.customer_id)}
                      >
                        <div className="customers-page__today-booking-info">
                          <span className="customers-page__today-booking-time">
                            {booking.start_time?.substring(0, 5)}
                          </span>
                          <div>
                            <div className="customers-page__today-booking-name">
                              {booking.last_name} {booking.first_name}
                            </div>
                            <div className="customers-page__today-booking-service">
                              {booking.service_name} / {booking.staff_name}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="customers-page__empty-state">
                      <Calendar size={32} />
                      <p style={{ fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
                        この日の予約はありません
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 詳細情報セクション */}
        {selectedCustomer ? (
          <section className="customers-page__detail-section">
            {/* ヘッダー */}
            <div className="customers-page__detail-header">
              <div className="customers-page__detail-title">
                <Users size={24} />
                <h2>{selectedCustomer.last_name} {selectedCustomer.first_name} 様</h2>
              </div>
              <div className="customers-page__detail-actions">
                {!isEditMode ? (
                  <>
                    <button
                      className="customers-page__action-btn customers-page__action-btn--secondary"
                      onClick={handleStartEdit}
                      disabled={activeTab !== 'basic'}
                    >
                      <Edit2 size={16} />
                      編集
                    </button>
                    <button
                      className="customers-page__action-btn customers-page__action-btn--secondary"
                      onClick={handleClearCustomer}
                    >
                      <X size={16} />
                      解除
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="customers-page__action-btn customers-page__action-btn--secondary"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    >
                      <X size={16} />
                      キャンセル
                    </button>
                    <button
                      className="customers-page__action-btn customers-page__action-btn--primary"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                    >
                      <Save size={16} />
                      {isSaving ? '保存中...' : '保存'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* エラー・成功メッセージ */}
            {errorMessage && (
              <div className="customers-page__message customers-page__message--error">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="customers-page__message customers-page__message--success">
                {successMessage}
              </div>
            )}

            {/* タブナビゲーション */}
            <div className="customers-page__tabs">
              <button
                className={`customers-page__tab ${activeTab === 'basic' ? 'customers-page__tab--active' : ''}`}
                onClick={() => {
                  setActiveTab('basic');
                  if (isEditMode) handleCancelEdit();
                }}
              >
                基本情報
              </button>
              <button
                className={`customers-page__tab ${activeTab === 'tickets' ? 'customers-page__tab--active' : ''}`}
                onClick={() => {
                  setActiveTab('tickets');
                  if (isEditMode) handleCancelEdit();
                }}
              >
                保有回数券
              </button>
              <button
                className={`customers-page__tab ${activeTab === 'coupons' ? 'customers-page__tab--active' : ''}`}
                onClick={() => {
                  setActiveTab('coupons');
                  if (isEditMode) handleCancelEdit();
                }}
              >
                クーポン利用履歴
              </button>
              <button
                className={`customers-page__tab ${activeTab === 'history' ? 'customers-page__tab--active' : ''}`}
                onClick={() => {
                  setActiveTab('history');
                  if (isEditMode) handleCancelEdit();
                }}
              >
                来店履歴
              </button>
            </div>

            {/* タブコンテンツ */}
            <div className="customers-page__tab-content">
              {/* 基本情報タブ */}
              {activeTab === 'basic' && (
                <div className="customers-page__info-grid">
                  {/* 来店回数 */}
                  <div className="customers-page__info-item">
                    <div className="customers-page__info-label">
                      来店回数
                      {isEditMode && (
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                          (初回値調整)
                        </span>
                      )}
                    </div>
                    {isEditMode ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="number"
                            className="customers-page__info-input"
                            placeholder={selectedCustomer.base_visit_count || 0}
                            value={editFormData.base_visit_count}
                            onChange={(e) => setEditFormData({
                              ...editFormData,
                              base_visit_count: parseInt(e.target.value) || ''
                            })}
                            min="0"
                            style={{ width: '120px' }}
                          />
                          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            回 (来店記録分は自動加算)
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="customers-page__info-value" style={{ color: '#3b82f6', fontWeight: 700 }}>
                        {selectedCustomer.visit_count} 回
                      </div>
                    )}
                  </div>

                  {/* 姓名 */}
                  <div className="customers-page__info-item">
                    <div className="customers-page__info-label">
                      氏名 {isEditMode && <span className="customers-page__form-required">*</span>}
                    </div>
                    {isEditMode ? (
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <input
                          type="text"
                          className="customers-page__info-input"
                          value={editFormData.last_name}
                          onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                          placeholder="姓"
                        />
                        <input
                          type="text"
                          className="customers-page__info-input"
                          value={editFormData.first_name}
                          onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                          placeholder="名"
                        />
                      </div>
                    ) : (
                      <div className="customers-page__info-value">
                        {selectedCustomer.last_name} {selectedCustomer.first_name}
                      </div>
                    )}
                  </div>

                  {/* フリガナ */}
                  <div className="customers-page__info-item">
                    <div className="customers-page__info-label">フリガナ</div>
                    {isEditMode ? (
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <input
                          type="text"
                          className="customers-page__info-input"
                          value={editFormData.last_name_kana}
                          onChange={(e) => setEditFormData({ ...editFormData, last_name_kana: e.target.value })}
                          placeholder="セイ"
                        />
                        <input
                          type="text"
                          className="customers-page__info-input"
                          value={editFormData.first_name_kana}
                          onChange={(e) => setEditFormData({ ...editFormData, first_name_kana: e.target.value })}
                          placeholder="メイ"
                        />
                      </div>
                    ) : (
                      <div className="customers-page__info-value">
                        {selectedCustomer.last_name_kana} {selectedCustomer.first_name_kana}
                      </div>
                    )}
                  </div>

                  {/* 性別 */}
                  <div className="customers-page__info-item">
                    <div className="customers-page__info-label">性別</div>
                    {isEditMode ? (
                      <select
                        className="customers-page__info-input"
                        value={editFormData.gender}
                        onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                      >
                        <option value="not_specified">未設定</option>
                        <option value="male">男性</option>
                        <option value="female">女性</option>
                        <option value="other">その他</option>
                      </select>
                    ) : (
                      <div className="customers-page__info-value">
                        {getGenderLabel(selectedCustomer.gender)}
                      </div>
                    )}
                  </div>

                  {/* 生年月日 */}
                  <div className="customers-page__info-item">
                    <div className="customers-page__info-label">生年月日</div>
                    {isEditMode ? (
                      <input
                        type="date"
                        className="customers-page__info-input"
                        value={editFormData.birth_date}
                        onChange={(e) => setEditFormData({ ...editFormData, birth_date: e.target.value })}
                      />
                    ) : (
                      <div className="customers-page__info-value">
                        {selectedCustomer.birth_date || <span className="customers-page__info-value--empty">未登録</span>}
                      </div>
                    )}
                  </div>

                  {/* 電話番号 */}
                  <div className="customers-page__info-item">
                    <div className="customers-page__info-label">
                      電話番号 {isEditMode && <span className="customers-page__form-required">*</span>}
                    </div>
                    {isEditMode ? (
                      <input
                        type="tel"
                        className="customers-page__info-input"
                        value={editFormData.phone_number}
                        onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                        placeholder="090-0000-0000"
                      />
                    ) : (
                      <div className="customers-page__info-value">
                        <Phone size={20} />
                        {selectedCustomer.phone_number}
                      </div>
                    )}
                  </div>

                  {/* メールアドレス */}
                  <div className="customers-page__info-item">
                    <div className="customers-page__info-label">メールアドレス</div>
                    {isEditMode ? (
                      <input
                        type="email"
                        className="customers-page__info-input"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        placeholder="example@email.com"
                      />
                    ) : (
                      <div className="customers-page__info-value">
                        {selectedCustomer.email ? (
                          <>
                            <Mail size={20} />
                            {selectedCustomer.email}
                          </>
                        ) : (
                          <span className="customers-page__info-value--empty">未登録</span>
                        )}
                      </div>
                    )}
                  </div>


                  {/* LINE連携状態 */}
                  <div className="customers-page__info-item">
                    <div className="customers-page__info-label">LINE連携</div>
                    <div className="customers-page__info-value">
                      {selectedCustomer.line_user_id ? (
                        <span className="customers-page__line-status customers-page__line-status--linked">
                          連携済み
                        </span>
                      ) : (
                        <span className="customers-page__line-status customers-page__line-status--unlinked">
                          未連携
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 初回登録日 - 編集不可 */}
                  <div className="customers-page__info-item">
                    <div className="customers-page__info-label">初回登録日</div>
                    <div className="customers-page__info-value">
                      {new Date(selectedCustomer.created_at).toLocaleDateString('ja-JP')}
                    </div>
                  </div>

                  {/* 備考 */}
                  <div className="customers-page__info-item" style={{ gridColumn: '1 / -1' }}>
                    <div className="customers-page__info-label">備考</div>
                    {isEditMode ? (
                      <textarea
                        className="customers-page__info-textarea"
                        value={editFormData.notes}
                        onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                        placeholder="特記事項があれば記入してください"
                        rows={4}
                      />
                    ) : (
                      <div className="customers-page__info-value">
                        {selectedCustomer.notes || <span className="customers-page__info-value--empty">なし</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 保有回数券タブ */}
              {activeTab === 'tickets' && (
                <TicketGroupList tickets={customerTickets} />
              )}

              {/* クーポン利用履歴タブ */}
              {activeTab === 'coupons' && (
                <div className="customers-page__coupon-list">
                  {customerCoupons.map(coupon => (
                    <div key={coupon.usage_id} className="customers-page__coupon-item">
                      <div className="customers-page__coupon-info">
                        <Tag className="customers-page__coupon-icon" size={20} />
                        <div>
                          <div className="customers-page__coupon-name">
                            {coupon.coupon_name}
                          </div>
                          <div className="customers-page__coupon-date">
                            利用日: {new Date(coupon.used_at).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {customerCoupons.length === 0 && (
                    <div className="customers-page__empty-state">
                      <Tag size={48} />
                      <p>クーポンの利用履歴はありません</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div>
                  <table className="customers-page__history-table">
                    <thead>
                      <tr>
                        <th>来店日</th>
                        <th>施術内容</th>
                        <th>担当スタッフ</th>
                        <th>支払方法</th>
                        <th>金額</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>レシート</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitHistory.map(visit => {
                        // キャンセル予約の場合
                        if (visit.record_type === 'cancelled_booking') {
                          return (
                            <tr key={visit.id} className="cancelled-row">
                              <td className="customers-page__history-date">
                                {visit.date}
                                {visit.start_time && (
                                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                    予約時間: {visit.start_time}
                                  </div>
                                )}
                              </td>
                              <td className="customers-page__history-service">
                                <div>{visit.service}</div>
                                {visit.cancel_notes && (
                                  <div className="customers-page__cancel-reason">
                                    理由: {visit.cancel_notes}
                                  </div>
                                )}
                              </td>
                              <td className="customers-page__history-staff">
                                {visit.staff}
                              </td>
                              <td className="customers-page__history-payment">
                                <span style={{ color: '#9ca3af' }}>-</span>
                              </td>
                              <td className="customers-page__history-amount">
                                <span style={{ color: '#9ca3af' }}>-</span>
                              </td>
                              {/* ★追加 */}
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ color: '#d1d5db' }}>-</span>
                              </td>
                            </tr>
                          );
                        }

                        // 通常の来店履歴
                        const isTicketPurchaseOnly = visit.ticket_purchases &&
                          visit.ticket_purchases.length > 0 &&
                          !visit.service;

                        // 回数券使用のみの場合
                        const isTicketUseOnly = visit.detail_info?.type === 'ticket_use' && !visit.service;

                        return (
                          <tr key={visit.id}>
                            <td className="customers-page__history-date">
                              {visit.date}
                            </td>
                            <td className="customers-page__history-service">
                              {/* 通常のサービス表示(回数券使用のみの場合は表示しない) */}
                              {!isTicketPurchaseOnly && !isTicketUseOnly && visit.service && (
                                <div style={{
                                  color: visit.detail_info?.type === 'coupon' ?
                                    '#f59e0b' : visit.detail_info?.type === 'limited_offer' ?
                                      '#810af0ff' : '#374151',
                                  fontWeight: visit.detail_info?.type ? '600' : 'normal'
                                }}>
                                  {visit.service}
                                  {visit.price > 0 && (
                                    <span style={{ marginLeft: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                                      (¥{visit.price.toLocaleString()})
                                    </span>
                                  )}
                                  {visit.detail_info?.type === 'coupon' && (
                                    <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>
                                      - クーポン利用
                                    </span>
                                  )}
                                  {visit.detail_info?.type === 'limited_offer' && (
                                    <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>
                                      - 期間限定オファー
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* 回数券使用の場合 */}
                              {visit.detail_info?.type === 'ticket_use' && (
                                <div style={{ marginTop: isTicketUseOnly ? 0 : '0.25rem' }}>
                                  {visit.detail_info.ticket_uses.map((ticket, idx) => (
                                    <div key={idx} style={{ color: '#3b82f6', fontWeight: 600 }}>
                                      {isTicketUseOnly ? '' : '+ '}
                                      回数券使用: {ticket.plan_name}
                                      {ticket.remaining_payment > 0 && (
                                        <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>
                                          (残金支払い ¥{ticket.remaining_payment.toLocaleString()})
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* 回数券購入の場合 */}
                              {visit.ticket_purchases && visit.ticket_purchases.length > 0 && (
                                <div style={{ marginTop: isTicketPurchaseOnly ? 0 : '0.25rem' }}>
                                  {visit.ticket_purchases.map((ticket, idx) => (
                                    <div key={idx} style={{ color: '#10b981', fontWeight: 600 }}>
                                      {isTicketPurchaseOnly ? '' : '+ '}
                                      回数券購入: {ticket.plan_name}
                                      <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                                        (¥{ticket.amount.toLocaleString()})
                                      </span>
                                      {ticket.is_immediate_use && (
                                        <span style={{ color: '#3b82f6', marginLeft: '0.5rem' }}>
                                          + 初回使用
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* オプション情報の表示 */}
                              {visit.options && visit.options.length > 0 && (
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                  {visit.options.map((opt, idx) => (
                                    <div key={idx}>
                                      オプション: {opt.option_name}
                                      {opt.is_free ? ' (無料)' : ` (+¥${opt.price.toLocaleString()})`}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="customers-page__history-staff">
                              {visit.staff}
                            </td>
                            <td className="customers-page__history-payment">
                              {visit.detail_info?.type === 'ticket_use' && visit.amount === 0 ? (
                                <span style={{ color: '#3b82f6', fontWeight: 600 }}>回数券</span>
                              ) : (
                                <>
                                  {visit.payment_method === 'cash' && '現金'}
                                  {visit.payment_method === 'card' && 'カード'}
                                  {visit.payment_method === 'mixed' && '混合'}
                                  {!visit.payment_method && '-'}
                                </>
                              )}
                            </td>
                            <td className="customers-page__history-amount">
                              ¥{visit.amount.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {visit.payment_id && !visit.is_cancelled && visit.record_type !== 'cancelled_booking' ? (
                                <button
                                  onClick={() => handleShowReceipt(visit.payment_id)}
                                  className="customers-page__receipt-btn"
                                  title="レシートを表示"
                                >
                                  <FileText size={16} />
                                </button>
                              ) : (
                                <span style={{ color: '#d1d5db' }}>-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {visitHistory.length === 0 && (
                    <div className="customers-page__empty-state">
                      <FileText size={48} />
                      <p>来店履歴はありません</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        ) : (
          /* 顧客未選択時の表示 */
          <div className="customers-page__detail-section">
            <div className="customers-page__empty-state" style={{ padding: '4rem' }}>
              <Users size={64} />
              <p style={{ fontSize: '1rem', marginTop: '1rem' }}>
                上の検索欄からお客様を検索してください
              </p>
            </div>
          </div>
        )}
      </main>

      {/* レシートモーダル */}
      {showReceipt && receiptPaymentId && (
        <Receipt
          paymentId={receiptPaymentId}
          onClose={handleCloseReceipt}
        />
      )}

      {/* 日付スクロールピッカー */}
      <DateScrollPicker
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(date) => setBookingDate(date)}
        initialDate={bookingDate}
      />
    </div>
  );
};

export default CustomersPage;