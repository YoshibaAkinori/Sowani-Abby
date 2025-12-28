"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const InitialDataImport = () => {
  // マスターデータ
  const [limitedOffers, setLimitedOffers] = useState([]);
  const [ticketPlans, setTicketPlans] = useState([]);
  
  // 入力フォーム
  const [formData, setFormData] = useState({
    // 顧客情報
    last_name: '',
    first_name: '',
    last_name_kana: '',
    first_name_kana: '',
    phone_number: '',
    email: '',
    birth_date: '',
    notes: '',
    // 回数券タイプ選択
    ticket_type: 'limited', // 'limited' or 'regular'
    // 福袋（期間限定）
    offer_id: '',
    // 通常回数券
    plan_id: '',
    // 共通
    purchase_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    sessions_remaining: '',
    purchase_price: '',
    paid_amount: '',
    payment_method: 'cash',
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
      const purchaseDate = formData.purchase_date || new Date().toISOString().split('T')[0];
      const expiryDate = new Date(purchaseDate);
      expiryDate.setDate(expiryDate.getDate() + (offer.validity_days || 180));
      
      setFormData(prev => ({
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
      const purchaseDate = formData.purchase_date || new Date().toISOString().split('T')[0];
      const expiryDate = new Date(purchaseDate);
      expiryDate.setDate(expiryDate.getDate() + (plan.validity_days || 180));
      
      setFormData(prev => ({
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
    
    if (formData.ticket_type === 'limited' && formData.offer_id) {
      const offer = limitedOffers.find(o => o.offer_id === formData.offer_id);
      if (offer) validityDays = offer.validity_days || 180;
    } else if (formData.ticket_type === 'regular' && formData.plan_id) {
      const plan = ticketPlans.find(p => p.plan_id === formData.plan_id);
      if (plan) validityDays = plan.validity_days || 180;
    }
    
    const expiryDate = new Date(date);
    expiryDate.setDate(expiryDate.getDate() + validityDays);
    
    setFormData(prev => ({
      ...prev,
      purchase_date: date,
      expiry_date: expiryDate.toISOString().split('T')[0],
    }));
  };

  // 残り金額計算
  const getRemainingAmount = () => {
    const purchase = parseInt(formData.purchase_price) || 0;
    const paid = parseInt(formData.paid_amount) || 0;
    return purchase - paid;
  };

  // フォームリセット（顧客情報のみ）
  const resetCustomerForm = () => {
    setFormData(prev => ({
      ...prev,
      last_name: '',
      first_name: '',
      last_name_kana: '',
      first_name_kana: '',
      phone_number: '',
      email: '',
      birth_date: '',
      notes: '',
      // 回数券情報はそのまま（連続入力しやすいように）
    }));
  };

  // 完全リセット
  const resetForm = () => {
    setFormData({
      last_name: '',
      first_name: '',
      last_name_kana: '',
      first_name_kana: '',
      phone_number: '',
      email: '',
      birth_date: '',
      notes: '',
      ticket_type: 'limited',
      offer_id: '',
      plan_id: '',
      purchase_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      sessions_remaining: '',
      purchase_price: '',
      paid_amount: '',
      payment_method: 'cash',
    });
  };

  // 登録処理
  const handleSubmit = async () => {
    // バリデーション
    if (!formData.last_name || !formData.first_name) {
      setMessage({ type: 'error', text: '姓名は必須です' });
      return;
    }
    if (!formData.last_name_kana || !formData.first_name_kana) {
      setMessage({ type: 'error', text: '姓名（カナ）は必須です' });
      return;
    }
    if (!formData.phone_number) {
      setMessage({ type: 'error', text: '電話番号は必須です' });
      return;
    }
    if (formData.ticket_type === 'limited' && !formData.offer_id) {
      setMessage({ type: 'error', text: '福袋を選択してください' });
      return;
    }
    if (formData.ticket_type === 'regular' && !formData.plan_id) {
      setMessage({ type: 'error', text: '回数券プランを選択してください' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/initial-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            last_name: formData.last_name,
            first_name: formData.first_name,
            last_name_kana: formData.last_name_kana,
            first_name_kana: formData.first_name_kana,
            phone_number: formData.phone_number,
            email: formData.email || '',
            birth_date: formData.birth_date || null,
            notes: formData.notes || null,
          },
          ticket: {
            type: formData.ticket_type,
            offer_id: formData.ticket_type === 'limited' ? formData.offer_id : null,
            plan_id: formData.ticket_type === 'regular' ? formData.plan_id : null,
            purchase_date: formData.purchase_date,
            expiry_date: formData.expiry_date,
            sessions_remaining: parseInt(formData.sessions_remaining),
            purchase_price: parseInt(formData.purchase_price),
            paid_amount: parseInt(formData.paid_amount) || 0,
            payment_method: formData.payment_method,
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        // 登録済みリストに追加
        const ticketName = formData.ticket_type === 'limited'
          ? limitedOffers.find(o => o.offer_id === formData.offer_id)?.name
          : ticketPlans.find(p => p.plan_id === formData.plan_id)?.name;

        setRegisteredList(prev => [{
          id: Date.now(),
          customer_name: `${formData.last_name} ${formData.first_name}`,
          ticket_name: ticketName,
          purchase_price: formData.purchase_price,
          paid_amount: formData.paid_amount,
          remaining: getRemainingAmount(),
        }, ...prev]);

        setMessage({ type: 'success', text: `${formData.last_name} ${formData.first_name}さんを登録しました` });
        resetCustomerForm();
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

  return (
    <div className="initial-data-import">
      <style jsx>{`
        .initial-data-import {
          padding: 1rem;
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
          min-height: 80px;
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

        .amount-display {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
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

        .actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
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
          display: grid;
          grid-template-columns: 1fr 1.5fr 1fr 1fr 1fr;
          gap: 1rem;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 6px;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .registered-item-header {
          font-weight: 600;
          color: #374151;
          background: #e5e7eb;
        }

        .registered-item-value {
          color: #1f2937;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr 1fr;
          }

          .registered-item {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      {/* メッセージ表示 */}
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
              value={formData.last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              placeholder="山田"
            />
          </div>
          <div className="form-group">
            <label className="form-label">名<span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={formData.first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              placeholder="花子"
            />
          </div>
          <div className="form-group">
            <label className="form-label">姓（カナ）<span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={formData.last_name_kana}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name_kana: e.target.value }))}
              placeholder="ヤマダ"
            />
          </div>
          <div className="form-group">
            <label className="form-label">名（カナ）<span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={formData.first_name_kana}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name_kana: e.target.value }))}
              placeholder="ハナコ"
            />
          </div>
          <div className="form-group">
            <label className="form-label">電話番号<span className="required">*</span></label>
            <input
              type="tel"
              className="form-input"
              value={formData.phone_number}
              onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
              placeholder="09012345678"
            />
          </div>
          <div className="form-group">
            <label className="form-label">メールアドレス</label>
            <input
              type="email"
              className="form-input"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="example@email.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">生年月日</label>
            <input
              type="date"
              className="form-input"
              value={formData.birth_date}
              onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
            />
          </div>
          <div className="form-group full-width">
            <label className="form-label">備考</label>
            <textarea
              className="form-textarea"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="メモなど"
            />
          </div>
        </div>
      </div>

      {/* 回数券情報 */}
      <div className="section">
        <h3 className="section-title">回数券情報</h3>
        
        {/* 回数券タイプ選択 */}
        <div className="ticket-type-toggle">
          <button
            className={`toggle-btn ${formData.ticket_type === 'limited' ? 'active' : ''}`}
            onClick={() => setFormData(prev => ({ ...prev, ticket_type: 'limited', plan_id: '' }))}
          >
            福袋・期間限定
          </button>
          <button
            className={`toggle-btn ${formData.ticket_type === 'regular' ? 'active' : ''}`}
            onClick={() => setFormData(prev => ({ ...prev, ticket_type: 'regular', offer_id: '' }))}
          >
            通常回数券
          </button>
        </div>

        <div className="form-grid">
          {/* 福袋選択 */}
          {formData.ticket_type === 'limited' && (
            <div className="form-group full-width">
              <label className="form-label">福袋を選択<span className="required">*</span></label>
              <select
                className="form-select"
                value={formData.offer_id}
                onChange={(e) => handleOfferSelect(e.target.value)}
              >
                <option value="">選択してください</option>
                {limitedOffers.map(offer => (
                  <option key={offer.offer_id} value={offer.offer_id}>
                    {offer.name} - ¥{(offer.special_price || offer.original_price).toLocaleString()} ({offer.total_sessions}回)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 通常回数券選択 */}
          {formData.ticket_type === 'regular' && (
            <div className="form-group full-width">
              <label className="form-label">回数券プランを選択<span className="required">*</span></label>
              <select
                className="form-select"
                value={formData.plan_id}
                onChange={(e) => handlePlanSelect(e.target.value)}
              >
                <option value="">選択してください</option>
                {ticketPlans.map(plan => (
                  <option key={plan.plan_id} value={plan.plan_id}>
                    {plan.name} - ¥{plan.price.toLocaleString()} ({plan.total_sessions}回)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">購入日</label>
            <input
              type="date"
              className="form-input"
              value={formData.purchase_date}
              onChange={(e) => handlePurchaseDateChange(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">有効期限</label>
            <input
              type="date"
              className="form-input"
              value={formData.expiry_date}
              onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">残り回数</label>
            <input
              type="number"
              className="form-input"
              value={formData.sessions_remaining}
              onChange={(e) => setFormData(prev => ({ ...prev, sessions_remaining: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">購入金額</label>
            <input
              type="number"
              className="form-input"
              value={formData.purchase_price}
              onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">支払済み金額</label>
            <input
              type="number"
              className="form-input"
              value={formData.paid_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, paid_amount: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div className="form-group">
            <label className="form-label">支払方法</label>
            <select
              className="form-select"
              value={formData.payment_method}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
            >
              <option value="cash">現金</option>
              <option value="card">カード</option>
              <option value="transfer">振込</option>
              <option value="other">その他</option>
            </select>
          </div>
        </div>

        {/* 金額表示 */}
        <div className="amount-display">
          <div className="amount-item">
            <div className="amount-label">購入金額</div>
            <div className="amount-value">¥{(parseInt(formData.purchase_price) || 0).toLocaleString()}</div>
          </div>
          <div className="amount-item">
            <div className="amount-label">支払済み</div>
            <div className="amount-value">¥{(parseInt(formData.paid_amount) || 0).toLocaleString()}</div>
          </div>
          <div className="amount-item">
            <div className="amount-label">残り金額</div>
            <div className={`amount-value remaining ${getRemainingAmount() === 0 ? 'zero' : ''}`}>
              ¥{getRemainingAmount().toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="actions">
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          <Save size={18} />
          {isLoading ? '登録中...' : '登録'}
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
              <div className="registered-item registered-item-header">
                <div>顧客名</div>
                <div>回数券</div>
                <div>購入金額</div>
                <div>支払済み</div>
                <div>残り金額</div>
              </div>
              {registeredList.map(item => (
                <div key={item.id} className="registered-item">
                  <div className="registered-item-value">{item.customer_name}</div>
                  <div className="registered-item-value">{item.ticket_name}</div>
                  <div className="registered-item-value">¥{parseInt(item.purchase_price).toLocaleString()}</div>
                  <div className="registered-item-value">¥{parseInt(item.paid_amount || 0).toLocaleString()}</div>
                  <div className="registered-item-value">¥{parseInt(item.remaining).toLocaleString()}</div>
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