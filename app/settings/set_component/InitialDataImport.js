"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Check, AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react';

const InitialDataImport = () => {
  // マスターデータ
  const [limitedOffers, setLimitedOffers] = useState([]);
  const [ticketPlans, setTicketPlans] = useState([]);
  
  // 顧客情報
  const [customerData, setCustomerData] = useState({
    last_name: '',
    first_name: '',
    last_name_kana: '',
    first_name_kana: '',
    phone_number: '',
    email: '',
    birth_date: '',
    gender: 'not_specified',
    visit_count: 0,
    is_existing: true,
    notes: '',
  });

  // 追加する回数券リスト
  const [tickets, setTickets] = useState([]);
  
  // 現在編集中の回数券
  const [currentTicket, setCurrentTicket] = useState({
    ticket_type: 'limited',
    offer_id: '',
    plan_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    sessions_remaining: '',
    purchase_price: '',
    payments: [{ amount: '', method: 'cash', date: new Date().toISOString().split('T')[0] }],
  });

  // 登録済みリスト
  const [registeredList, setRegisteredList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showRegisteredList, setShowRegisteredList] = useState(true);

  // マスターデータ取得
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [offersRes, plansRes] = await Promise.all([
        fetch('/api/limited-offers'),
        fetch('/api/ticket-plans')
      ]);
      
      const offersData = await offersRes.json();
      const plansData = await plansRes.json();
      
      if (offersData.success) {
        setLimitedOffers(offersData.data || []);
      }
      if (plansData.success) {
        setTicketPlans(plansData.data || []);
      }
    } catch (error) {
      console.error('マスターデータ取得エラー:', error);
    }
  };

  // 福袋選択時に自動入力
  const handleOfferSelect = (offerId) => {
    const offer = limitedOffers.find(o => o.offer_id === offerId);
    if (offer) {
      const purchaseDate = currentTicket.purchase_date || new Date().toISOString().split('T')[0];
      const expiryDate = new Date(purchaseDate);
      expiryDate.setDate(expiryDate.getDate() + (offer.validity_days || 180));
      
      setCurrentTicket(prev => ({
        ...prev,
        offer_id: offerId,
        sessions_remaining: offer.total_sessions,
        purchase_price: offer.special_price || offer.original_price,
        expiry_date: expiryDate.toISOString().split('T')[0],
      }));
    }
  };

  // 通常回数券選択時に自動入力
  const handlePlanSelect = (planId) => {
    const plan = ticketPlans.find(p => p.plan_id === planId);
    if (plan) {
      const purchaseDate = currentTicket.purchase_date || new Date().toISOString().split('T')[0];
      const expiryDate = new Date(purchaseDate);
      expiryDate.setDate(expiryDate.getDate() + (plan.validity_days || 180));
      
      setCurrentTicket(prev => ({
        ...prev,
        plan_id: planId,
        sessions_remaining: plan.total_sessions,
        purchase_price: plan.price,
        expiry_date: expiryDate.toISOString().split('T')[0],
      }));
    }
  };

  // 購入日変更時に有効期限を再計算
  const handlePurchaseDateChange = (date) => {
    let validityDays = 180;
    
    if (currentTicket.ticket_type === 'limited' && currentTicket.offer_id) {
      const offer = limitedOffers.find(o => o.offer_id === currentTicket.offer_id);
      if (offer) validityDays = offer.validity_days || 180;
    } else if (currentTicket.ticket_type === 'regular' && currentTicket.plan_id) {
      const plan = ticketPlans.find(p => p.plan_id === currentTicket.plan_id);
      if (plan) validityDays = plan.validity_days || 180;
    }
    
    const expiryDate = new Date(date);
    expiryDate.setDate(expiryDate.getDate() + validityDays);
    
    setCurrentTicket(prev => ({
      ...prev,
      purchase_date: date,
      expiry_date: expiryDate.toISOString().split('T')[0],
    }));
  };

  // 支払い追加
  const addPayment = () => {
    setCurrentTicket(prev => ({
      ...prev,
      payments: [...prev.payments, { amount: '', method: 'cash', date: new Date().toISOString().split('T')[0] }]
    }));
  };

  // 支払い削除
  const removePayment = (index) => {
    setCurrentTicket(prev => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== index)
    }));
  };

  // 支払い更新
  const updatePayment = (index, field, value) => {
    setCurrentTicket(prev => ({
      ...prev,
      payments: prev.payments.map((p, i) => i === index ? { ...p, [field]: value } : p)
    }));
  };

  // 支払い合計
  const getTotalPaid = (payments) => {
    return payments.reduce((sum, p) => sum + (parseInt(p.amount) || 0), 0);
  };

  // 残り金額
  const getRemainingAmount = (ticket) => {
    const purchase = parseInt(ticket.purchase_price) || 0;
    const paid = getTotalPaid(ticket.payments);
    return purchase - paid;
  };

  // 回数券をリストに追加
  const addTicketToList = () => {
    if (currentTicket.ticket_type === 'limited' && !currentTicket.offer_id) {
      setMessage({ type: 'error', text: '福袋を選択してください' });
      return;
    }
    if (currentTicket.ticket_type === 'regular' && !currentTicket.plan_id) {
      setMessage({ type: 'error', text: '回数券プランを選択してください' });
      return;
    }

    const ticketName = currentTicket.ticket_type === 'limited'
      ? limitedOffers.find(o => o.offer_id === currentTicket.offer_id)?.name
      : ticketPlans.find(p => p.plan_id === currentTicket.plan_id)?.name;

    setTickets(prev => [...prev, {
      ...currentTicket,
      id: Date.now(),
      name: ticketName,
    }]);

    // 回数券フォームをリセット
    setCurrentTicket({
      ticket_type: 'limited',
      offer_id: '',
      plan_id: '',
      purchase_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      sessions_remaining: '',
      purchase_price: '',
      payments: [{ amount: '', method: 'cash', date: new Date().toISOString().split('T')[0] }],
    });
    setMessage({ type: 'success', text: `${ticketName} を追加しました` });
  };

  // 回数券をリストから削除
  const removeTicket = (id) => {
    setTickets(prev => prev.filter(t => t.id !== id));
  };

  // 完全リセット
  const resetForm = () => {
    setCustomerData({
      last_name: '',
      first_name: '',
      last_name_kana: '',
      first_name_kana: '',
      phone_number: '',
      email: '',
      birth_date: '',
      gender: 'not_specified',
      visit_count: 0,
      is_existing: true,
      notes: '',
    });
    setTickets([]);
    setCurrentTicket({
      ticket_type: 'limited',
      offer_id: '',
      plan_id: '',
      purchase_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      sessions_remaining: '',
      purchase_price: '',
      payments: [{ amount: '', method: 'cash', date: new Date().toISOString().split('T')[0] }],
    });
    setMessage({ type: '', text: '' });
  };

  // 登録処理
  const handleSubmit = async () => {
    if (!customerData.last_name || !customerData.first_name) {
      setMessage({ type: 'error', text: '姓名は必須です' });
      return;
    }
    if (!customerData.last_name_kana || !customerData.first_name_kana) {
      setMessage({ type: 'error', text: '姓名（カナ）は必須です' });
      return;
    }
    if (!customerData.phone_number) {
      setMessage({ type: 'error', text: '電話番号は必須です' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/initial-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerData,
          tickets: tickets.map(t => ({
            type: t.ticket_type,
            offer_id: t.ticket_type === 'limited' ? t.offer_id : null,
            plan_id: t.ticket_type === 'regular' ? t.plan_id : null,
            purchase_date: t.purchase_date,
            expiry_date: t.expiry_date,
            sessions_remaining: parseInt(t.sessions_remaining),
            purchase_price: parseInt(t.purchase_price),
            payments: t.payments.filter(p => p.amount).map(p => ({
              amount: parseInt(p.amount),
              method: p.method,
              date: p.date,
            })),
          })),
        })
      });

      const result = await response.json();

      if (result.success) {
        setRegisteredList(prev => [{
          id: Date.now(),
          customer_name: `${customerData.last_name} ${customerData.first_name}`,
          tickets: tickets.map(t => ({
            name: t.name,
            purchase_price: t.purchase_price,
            paid: getTotalPaid(t.payments),
            remaining: getRemainingAmount(t),
          })),
        }, ...prev]);

        setMessage({ type: 'success', text: `${customerData.last_name} ${customerData.first_name}さんを登録しました` });
        resetForm();
      } else {
        setMessage({ type: 'error', text: result.error || '登録に失敗しました' });
      }
    } catch (error) {
      console.error('登録エラー:', error);
      setMessage({ type: 'error', text: '登録中にエラーが発生しました' });
    } finally {
      setIsLoading(false);
    }
  };

  // カテゴリ判定（新規/会員）
  const getCategoryInfo = (item, type) => {
    if (type === 'limited') {
      const name = item.name || '';
      if (name.includes('新規')) return { label: '新規', className: 'new-customer' };
      if (name.includes('会員')) return { label: '会員', className: 'existing' };
      return { label: 'その他', className: 'other' };
    } else {
      const category = item.service_category || '';
      if (category === '新規') return { label: '新規', className: 'new-customer' };
      if (category === '会員') return { label: '会員', className: 'existing' };
      return { label: category || 'その他', className: 'other' };
    }
  };

  // 時間判定（60分/90分）
  const getDurationInfo = (item) => {
    const name = item.name || '';
    if (name.includes('90分')) return { label: '90分', className: 'long' };
    if (name.includes('60分')) return { label: '60分', className: 'medium' };
    return { label: '', className: '' };
  };

  // 性別フィルタ（福袋用）- gender_restriction または base_gender_restriction を使用
  const filterOffersByGender = (offers) => {
    return offers.filter(offer => {
      const gender = offer.gender_restriction || offer.base_gender_restriction || 'all';
      if (gender === 'all') return true;
      if (!customerData.gender || customerData.gender === 'not_specified') return true;
      return gender === customerData.gender;
    });
  };

  // 性別フィルタ（通常回数券用）
  const filterPlansByGender = (plans) => {
    return plans.filter(plan => {
      const planGender = plan.gender_restriction || 'all';
      if (planGender === 'all') return true;
      if (!customerData.gender || customerData.gender === 'not_specified') return true;
      return planGender === customerData.gender;
    });
  };

  return (
    <div className="initial-data-import">
      <style jsx>{`
        .initial-data-import {
          padding: 1rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .section {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .form-label .required {
          color: #ef4444;
          margin-left: 0.25rem;
        }

        .form-input, .form-select, .form-textarea {
          padding: 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9375rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-textarea {
          resize: vertical;
          min-height: 60px;
        }

        .ticket-type-toggle {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .toggle-btn {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          font-size: 0.9375rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-btn.active {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .toggle-btn:hover:not(.active) {
          border-color: #9ca3af;
        }

        .payments-section {
          margin-top: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 8px;
        }

        .payments-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.75rem;
        }

        .payment-row {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .payment-row input, .payment-row select {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .payment-row input[type="number"] {
          width: 120px;
        }

        .payment-row input[type="date"] {
          width: 140px;
        }

        .payment-row select {
          width: 100px;
        }

        .remove-btn {
          padding: 0.25rem;
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
        }

        .add-payment-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 0.75rem;
          background: #f3f4f6;
          border: 1px dashed #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
          color: #6b7280;
          cursor: pointer;
          margin-top: 0.5rem;
        }

        .add-payment-btn:hover {
          background: #e5e7eb;
        }

        .amount-display {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: #f0f9ff;
          border-radius: 8px;
          margin-top: 1rem;
        }

        .amount-item {
          flex: 1;
          text-align: center;
        }

        .amount-label {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }

        .amount-value {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .amount-value.remaining {
          color: #dc2626;
        }

        .amount-value.remaining.zero {
          color: #059669;
        }

        .add-ticket-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          margin-top: 1rem;
        }

        .add-ticket-btn:hover {
          background: #2563eb;
        }

        .ticket-list {
          margin-top: 1rem;
        }

        .ticket-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }

        .ticket-info {
          flex: 1;
        }

        .ticket-name {
          font-weight: 600;
          color: #1f2937;
        }

        .ticket-details {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        .ticket-amount {
          text-align: right;
          margin-right: 1rem;
        }

        .ticket-price {
          font-weight: 600;
          color: #1f2937;
        }

        .ticket-remaining {
          font-size: 0.875rem;
          color: #dc2626;
        }

        .ticket-remaining.zero {
          color: #059669;
        }

        .delete-ticket-btn {
          padding: 0.5rem;
          background: #fee2e2;
          border: none;
          border-radius: 4px;
          color: #dc2626;
          cursor: pointer;
        }

        .delete-ticket-btn:hover {
          background: #fecaca;
        }

        .actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #10b981;
          color: white;
          flex: 1;
        }

        .btn-primary:hover:not(:disabled) {
          background: #059669;
        }

        .btn-primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .message {
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .message.success {
          background: #d1fae5;
          color: #065f46;
        }

        .message.error {
          background: #fee2e2;
          color: #991b1b;
        }

        .registered-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          padding: 0.5rem 0;
        }

        .registered-count {
          font-size: 0.875rem;
          color: #6b7280;
          margin-left: 0.5rem;
        }

        .registered-list {
          margin-top: 1rem;
        }

        .registered-item {
          padding: 1rem;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }

        .registered-customer-name {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .registered-ticket {
          font-size: 0.875rem;
          color: #6b7280;
          padding-left: 1rem;
          border-left: 2px solid #e5e7eb;
          margin-top: 0.25rem;
        }

        /* 回数券・福袋選択カード - 6個表示 */
        .offer-select-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 330px;
          overflow-y: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 0.5rem;
        }

        .offer-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.625rem 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 48px;
        }

        .offer-card:hover {
          border-color: #93c5fd;
          background: #f0f9ff;
        }

        .offer-card.selected {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .offer-card-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .offer-badge {
          font-size: 0.625rem;
          font-weight: 600;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          white-space: nowrap;
        }

        .offer-badge.new-customer {
          background: #dcfce7;
          color: #166534;
        }

        .offer-badge.existing {
          background: #dbeafe;
          color: #1e40af;
        }

        .offer-badge.other {
          background: #f3f4f6;
          color: #4b5563;
        }

        .offer-name {
          font-weight: 500;
          color: #1f2937;
          font-size: 0.875rem;
        }

        .offer-card-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .offer-time {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          white-space: nowrap;
        }

        .offer-time.medium {
          background: #fef3c7;
          color: #92400e;
        }

        .offer-time.long {
          background: #fed7aa;
          color: #9a3412;
        }

        .offer-price {
          font-weight: 600;
          color: #1f2937;
          min-width: 100px;
          text-align: right;
        }

        .offer-sessions {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .offer-empty {
          padding: 1rem;
          text-align: center;
          color: #6b7280;
        }
      `}</style>

      {/* メッセージ */}
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* 顧客情報 */}
      <div className="section">
        <h3 className="section-title">顧客情報</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">姓<span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={customerData.last_name}
              onChange={(e) => setCustomerData(prev => ({ ...prev, last_name: e.target.value }))}
              placeholder="山田"
            />
          </div>
          <div className="form-group">
            <label className="form-label">名<span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={customerData.first_name}
              onChange={(e) => setCustomerData(prev => ({ ...prev, first_name: e.target.value }))}
              placeholder="花子"
            />
          </div>
          <div className="form-group">
            <label className="form-label">セイ<span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={customerData.last_name_kana}
              onChange={(e) => setCustomerData(prev => ({ ...prev, last_name_kana: e.target.value }))}
              placeholder="ヤマダ"
            />
          </div>
          <div className="form-group">
            <label className="form-label">メイ<span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={customerData.first_name_kana}
              onChange={(e) => setCustomerData(prev => ({ ...prev, first_name_kana: e.target.value }))}
              placeholder="ハナコ"
            />
          </div>
          <div className="form-group">
            <label className="form-label">電話番号<span className="required">*</span></label>
            <input
              type="tel"
              className="form-input"
              value={customerData.phone_number}
              onChange={(e) => setCustomerData(prev => ({ ...prev, phone_number: e.target.value }))}
              placeholder="09012345678"
            />
          </div>
          <div className="form-group">
            <label className="form-label">メールアドレス</label>
            <input
              type="email"
              className="form-input"
              value={customerData.email}
              onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="example@email.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">生年月日</label>
            <input
              type="date"
              className="form-input"
              value={customerData.birth_date}
              onChange={(e) => setCustomerData(prev => ({ ...prev, birth_date: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">性別</label>
            <select
              className="form-select"
              value={customerData.gender}
              onChange={(e) => setCustomerData(prev => ({ ...prev, gender: e.target.value }))}
            >
              <option value="not_specified">未設定</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">来店回数</label>
            <input
              type="number"
              className="form-input"
              value={customerData.visit_count}
              onChange={(e) => setCustomerData(prev => ({ ...prev, visit_count: parseInt(e.target.value) || 0 }))}
              placeholder="0"
              min="0"
            />
          </div>
          <div className="form-group">
            <label className="form-label">既存顧客</label>
            <select
              className="form-select"
              value={customerData.is_existing ? '1' : '0'}
              onChange={(e) => setCustomerData(prev => ({ ...prev, is_existing: e.target.value === '1' }))}
            >
              <option value="1">はい（既存）</option>
              <option value="0">いいえ（新規）</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">備考</label>
            <input
              type="text"
              className="form-input"
              value={customerData.notes}
              onChange={(e) => setCustomerData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="メモなど"
            />
          </div>
        </div>
      </div>

      {/* 追加済み回数券リスト */}
      {tickets.length > 0 && (
        <div className="section">
          <h3 className="section-title">追加済み回数券 ({tickets.length}件)</h3>
          <div className="ticket-list">
            {tickets.map(ticket => (
              <div key={ticket.id} className="ticket-item">
                <div className="ticket-info">
                  <div className="ticket-name">{ticket.name}</div>
                  <div className="ticket-details">
                    残り{ticket.sessions_remaining}回 / 期限: {ticket.expiry_date}
                  </div>
                </div>
                <div className="ticket-amount">
                  <div className="ticket-price">¥{parseInt(ticket.purchase_price).toLocaleString()}</div>
                  <div className={`ticket-remaining ${getRemainingAmount(ticket) === 0 ? 'zero' : ''}`}>
                    残 ¥{getRemainingAmount(ticket).toLocaleString()}
                  </div>
                </div>
                <button className="delete-ticket-btn" onClick={() => removeTicket(ticket.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 回数券追加フォーム */}
      <div className="section">
        <h3 className="section-title">回数券を追加</h3>
        
        {/* 回数券タイプ選択 */}
        <div className="ticket-type-toggle">
          <button
            className={`toggle-btn ${currentTicket.ticket_type === 'limited' ? 'active' : ''}`}
            onClick={() => setCurrentTicket(prev => ({ ...prev, ticket_type: 'limited', plan_id: '' }))}
          >
            福袋・期間限定
          </button>
          <button
            className={`toggle-btn ${currentTicket.ticket_type === 'regular' ? 'active' : ''}`}
            onClick={() => setCurrentTicket(prev => ({ ...prev, ticket_type: 'regular', offer_id: '' }))}
          >
            通常回数券
          </button>
        </div>

        <div className="form-grid">
          {/* 福袋選択 */}
          {currentTicket.ticket_type === 'limited' && (
            <div className="form-group full-width">
              <label className="form-label">福袋を選択</label>
              <div className="offer-select-list">
                {filterOffersByGender(limitedOffers).map(offer => {
                  const categoryInfo = getCategoryInfo(offer, 'limited');
                  const durationInfo = getDurationInfo(offer);
                  
                  return (
                    <div
                      key={offer.offer_id}
                      className={`offer-card ${currentTicket.offer_id === offer.offer_id ? 'selected' : ''}`}
                      onClick={() => handleOfferSelect(offer.offer_id)}
                    >
                      <div className="offer-card-left">
                        <span className={`offer-badge ${categoryInfo.className}`}>
                          {categoryInfo.label}
                        </span>
                        <span className="offer-name">{offer.name}</span>
                      </div>
                      <div className="offer-card-right">
                        {durationInfo.label && (
                          <span className={`offer-time ${durationInfo.className}`}>
                            {durationInfo.label}
                          </span>
                        )}
                        <div className="offer-price">
                          ¥{(offer.special_price || offer.original_price).toLocaleString()}
                          <div className="offer-sessions">{offer.total_sessions}回</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filterOffersByGender(limitedOffers).length === 0 && (
                  <div className="offer-empty">該当する福袋がありません</div>
                )}
              </div>
            </div>
          )}

          {/* 通常回数券選択 */}
          {currentTicket.ticket_type === 'regular' && (
            <div className="form-group full-width">
              <label className="form-label">回数券プランを選択</label>
              <div className="offer-select-list">
                {filterPlansByGender(ticketPlans).map(plan => {
                  const categoryInfo = getCategoryInfo(plan, 'regular');
                  const durationInfo = getDurationInfo(plan);
                  
                  return (
                    <div
                      key={plan.plan_id}
                      className={`offer-card ${currentTicket.plan_id === plan.plan_id ? 'selected' : ''}`}
                      onClick={() => handlePlanSelect(plan.plan_id)}
                    >
                      <div className="offer-card-left">
                        <span className={`offer-badge ${categoryInfo.className}`}>
                          {categoryInfo.label}
                        </span>
                        <span className="offer-name">{plan.name}</span>
                      </div>
                      <div className="offer-card-right">
                        {durationInfo.label && (
                          <span className={`offer-time ${durationInfo.className}`}>
                            {durationInfo.label}
                          </span>
                        )}
                        <div className="offer-price">
                          ¥{plan.price.toLocaleString()}
                          <div className="offer-sessions">{plan.total_sessions}回</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filterPlansByGender(ticketPlans).length === 0 && (
                  <div className="offer-empty">該当する回数券プランがありません</div>
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">購入日</label>
            <input
              type="date"
              className="form-input"
              value={currentTicket.purchase_date}
              onChange={(e) => handlePurchaseDateChange(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">有効期限</label>
            <input
              type="date"
              className="form-input"
              value={currentTicket.expiry_date}
              onChange={(e) => setCurrentTicket(prev => ({ ...prev, expiry_date: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">残り回数</label>
            <input
              type="number"
              className="form-input"
              value={currentTicket.sessions_remaining}
              onChange={(e) => setCurrentTicket(prev => ({ ...prev, sessions_remaining: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">購入金額</label>
            <input
              type="number"
              className="form-input"
              value={currentTicket.purchase_price}
              onChange={(e) => setCurrentTicket(prev => ({ ...prev, purchase_price: e.target.value }))}
            />
          </div>
        </div>

        {/* 支払い履歴 */}
        <div className="payments-section">
          <div className="payments-title">支払い履歴</div>
          {currentTicket.payments.map((payment, index) => (
            <div key={index} className="payment-row">
              <input
                type="number"
                placeholder="金額"
                value={payment.amount}
                onChange={(e) => updatePayment(index, 'amount', e.target.value)}
              />
              <select
                value={payment.method}
                onChange={(e) => updatePayment(index, 'method', e.target.value)}
              >
                <option value="cash">現金</option>
                <option value="card">カード</option>
                <option value="transfer">振込</option>
                <option value="other">その他</option>
              </select>
              <input
                type="date"
                value={payment.date}
                onChange={(e) => updatePayment(index, 'date', e.target.value)}
              />
              {currentTicket.payments.length > 1 && (
                <button className="remove-btn" onClick={() => removePayment(index)}>
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          <button className="add-payment-btn" onClick={addPayment}>
            <Plus size={16} /> 支払いを追加
          </button>
        </div>

        {/* 金額表示 */}
        <div className="amount-display">
          <div className="amount-item">
            <div className="amount-label">購入金額</div>
            <div className="amount-value">¥{(parseInt(currentTicket.purchase_price) || 0).toLocaleString()}</div>
          </div>
          <div className="amount-item">
            <div className="amount-label">支払済み</div>
            <div className="amount-value">¥{getTotalPaid(currentTicket.payments).toLocaleString()}</div>
          </div>
          <div className="amount-item">
            <div className="amount-label">残り金額</div>
            <div className={`amount-value remaining ${getRemainingAmount(currentTicket) === 0 ? 'zero' : ''}`}>
              ¥{getRemainingAmount(currentTicket).toLocaleString()}
            </div>
          </div>
        </div>

        <button className="add-ticket-btn" onClick={addTicketToList}>
          <Plus size={20} /> この回数券を追加
        </button>
      </div>

      {/* アクションボタン */}
      <div className="actions">
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          <Save size={18} />
          {isLoading ? '登録中...' : tickets.length > 0 ? '顧客と回数券を登録' : '顧客のみ登録'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={resetForm}
        >
          <Trash2 size={18} />
          リセット
        </button>
      </div>

      {/* 登録済み一覧 */}
      {registeredList.length > 0 && (
        <div className="section">
          <div 
            className="registered-header"
            onClick={() => setShowRegisteredList(!showRegisteredList)}
          >
            <h3 className="section-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
              登録済み一覧
              <span className="registered-count">({registeredList.length}件)</span>
            </h3>
            {showRegisteredList ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          
          {showRegisteredList && (
            <div className="registered-list">
              {registeredList.map(item => (
                <div key={item.id} className="registered-item">
                  <div className="registered-customer-name">{item.customer_name}</div>
                  {item.tickets.length === 0 ? (
                    <div className="registered-ticket">回数券なし</div>
                  ) : (
                    item.tickets.map((t, i) => (
                      <div key={i} className="registered-ticket">
                        {t.name} - ¥{parseInt(t.purchase_price).toLocaleString()} 
                        (支払済: ¥{t.paid.toLocaleString()} / 残: ¥{t.remaining.toLocaleString()})
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InitialDataImport;