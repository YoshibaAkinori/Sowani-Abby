// app/settings/set_component/RegisterClosing.js
"use client";
import React, { useState, useEffect } from 'react';
import { Save, Plus, X, DollarSign, TrendingUp, Receipt, Wallet, Archive, Calendar } from 'lucide-react';
import DateScrollPicker from '../../components/DateScrollPicker';
import './RegisterClosing.css';

const RegisterClosing = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // レジ内現金（売上込み・締め前）
  const [cashCount, setCashCount] = useState({
    ten_thousand: '',
    five_thousand: '',
    two_thousand: '',
    one_thousand: '',
    five_hundred: '',
    one_hundred: '',
    fifty: '',
    ten: '',
    five: '',
    one: ''
  });

  // 両替バッグ（補充後）
  const [cashCountAfter, setCashCountAfter] = useState({
    ten_thousand: '',
    five_thousand: '',
    two_thousand: '',
    one_thousand: '',
    five_hundred: '',
    one_hundred: '',
    fifty: '',
    ten: '',
    five: '',
    one: ''
  });

  // 売上状況
  const [salesData, setSalesData] = useState({
    cash_amount: 0,
    card_amount: 0,
    transaction_count: 0,
    fixed_amount: 30000
  });

  // 支払い登録
  const [payments, setPayments] = useState([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '家賃',
    amount: '',
    memo: ''
  });

  // 札の定義
  const bills = [
    { key: 'ten_thousand', label: '1万円', value: 10000, defaultCount: 0 },
    { key: 'five_thousand', label: '5千円', value: 5000, defaultCount: 3 },
    { key: 'two_thousand', label: '2千円', value: 2000, defaultCount: 0 },
    { key: 'one_thousand', label: '千円', value: 1000, defaultCount: 12 },
  ];

  // 硬貨の定義
  const coins = [
    { key: 'five_hundred', label: '500円', value: 500, defaultCount: 3 },
    { key: 'one_hundred', label: '100円', value: 100, defaultCount: 12 },
    { key: 'fifty', label: '50円', value: 50, defaultCount: 5 },
    { key: 'ten', label: '10円', value: 10, defaultCount: 5 },
    { key: 'five', label: '5円', value: 5, defaultCount: 0 },
    { key: 'one', label: '1円', value: 1, defaultCount: 0 }
  ];

  const denominations = [...bills, ...coins];

  // 支払いカテゴリ
  const paymentCategories = ['家賃', '光熱費', '仕入れ', '備品購入', 'その他'];

  // レジ内現金の合計を計算
  const calculateRegisterCash = () => {
    return denominations.reduce((sum, denom) => {
      const count = parseInt(cashCount[denom.key]) || 0;
      return sum + (count * denom.value);
    }, 0);
  };

  // 両替バッグの合計を計算
  const calculateChangeBag = () => {
    return denominations.reduce((sum, denom) => {
      const count = parseInt(cashCountAfter[denom.key]) || 0;
      return sum + (count * denom.value);
    }, 0);
  };

  // 本日の支払い合計
  const calculateTodayPayments = () => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  // 封筒金額（金庫へ入れる売上）= レジ内現金 - 両替バッグ - 支払い
  const calculateEnvelopeAmount = () => {
    return calculateRegisterCash() - calculateChangeBag() - calculateTodayPayments();
  };

  // 理論上の封筒金額（売上データから）= 現金売上 - 支払い
  const calculateExpectedEnvelope = () => {
    return salesData.cash_amount - calculateTodayPayments();
  };

  // 過不足を計算
  const calculateDiscrepancy = () => {
    return calculateEnvelopeAmount() - calculateExpectedEnvelope();
  };

  // 枚数入力変更（レジ内現金）
  const handleCountChange = (key, value) => {
    if (value === '') {
      setCashCount(prev => ({ ...prev, [key]: '' }));
      return;
    }
    const numValue = parseInt(value) || 0;
    setCashCount(prev => ({
      ...prev,
      [key]: numValue >= 0 ? numValue : ''
    }));
  };

  // 枚数入力変更（両替バッグ）
  const handleCountAfterChange = (key, value) => {
    if (value === '') {
      setCashCountAfter(prev => ({ ...prev, [key]: '' }));
      return;
    }
    const numValue = parseInt(value) || 0;
    setCashCountAfter(prev => ({
      ...prev,
      [key]: numValue >= 0 ? numValue : ''
    }));
  };

  // 支払いフォーム入力
  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({
      ...prev,
      [name]: name === 'amount' ? (parseInt(value) || '') : value
    }));
  };

  // 支払い追加
  const handleAddPayment = () => {
    if (!paymentForm.amount || paymentForm.amount <= 0) {
      alert('金額を入力してください');
      return;
    }

    const newPayment = {
      id: Date.now(),
      date: paymentForm.date,
      category: paymentForm.category,
      amount: parseInt(paymentForm.amount),
      memo: paymentForm.memo
    };

    setPayments(prev => [...prev, newPayment]);
    setPaymentForm({
      date: new Date().toISOString().split('T')[0],
      category: '家賃',
      amount: '',
      memo: ''
    });
    setShowPaymentForm(false);
  };

  // 支払い削除
  const handleDeletePayment = (id) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  // データ取得
  const fetchClosingData = async (targetDate) => {
    setIsLoading(true);
    try {
      const salesResponse = await fetch(`/api/register-closing/sales?date=${targetDate}`);
      if (salesResponse.ok) {
        const salesResult = await salesResponse.json();
        setSalesData({
          ...salesResult.data,
          fixed_amount: 30000
        });
      }

      const closingResponse = await fetch(`/api/register-closing?date=${targetDate}`);
      if (closingResponse.ok) {
        const closingResult = await closingResponse.json();

        if (closingResult.data) {
          // レジ内現金のデータを設定
          setCashCount(closingResult.data.register_count || {
            ten_thousand: '', five_thousand: '', two_thousand: '', one_thousand: '',
            five_hundred: '', one_hundred: '', fifty: '', ten: '', five: '', one: ''
          });

          // 両替バッグのデータを設定
          setCashCountAfter(closingResult.data.bag_count || {
            ten_thousand: '', five_thousand: '', two_thousand: '', one_thousand: '',
            five_hundred: '', one_hundred: '', fifty: '', ten: '', five: '', one: ''
          });

          // 支払いデータを設定
          let paymentsData = [];
          if (closingResult.data.payments) {
            if (Array.isArray(closingResult.data.payments)) {
              paymentsData = closingResult.data.payments;
            } else if (typeof closingResult.data.payments === 'string') {
              try {
                paymentsData = JSON.parse(closingResult.data.payments);
              } catch (e) {
                paymentsData = [];
              }
            }
          }
          setPayments(paymentsData);
          setIsSaved(true);
        } else {
          // データがない場合は初期化
          setCashCount({
            ten_thousand: '', five_thousand: '', two_thousand: '', one_thousand: '',
            five_hundred: '', one_hundred: '', fifty: '', ten: '', five: '', one: ''
          });
          setCashCountAfter({
            ten_thousand: '', five_thousand: '', two_thousand: '', one_thousand: '',
            five_hundred: '', one_hundred: '', fifty: '', ten: '', five: '', one: ''
          });
          setPayments([]);
          setIsSaved(false);
        }
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 保存処理
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const registerCash = calculateRegisterCash();
      const changeBag = calculateChangeBag();
      const todayPayments = calculateTodayPayments();
      const envelopeAmount = calculateEnvelopeAmount();
      const expectedEnvelope = calculateExpectedEnvelope();
      const discrepancy = calculateDiscrepancy();

      const response = await fetch('/api/register-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          staff_id: 'staff_001',
          // レジ内現金（枚数）
          register_ten_thousand: parseInt(cashCount.ten_thousand) || 0,
          register_five_thousand: parseInt(cashCount.five_thousand) || 0,
          register_two_thousand: parseInt(cashCount.two_thousand) || 0,
          register_one_thousand: parseInt(cashCount.one_thousand) || 0,
          register_five_hundred: parseInt(cashCount.five_hundred) || 0,
          register_one_hundred: parseInt(cashCount.one_hundred) || 0,
          register_fifty: parseInt(cashCount.fifty) || 0,
          register_ten: parseInt(cashCount.ten) || 0,
          register_five: parseInt(cashCount.five) || 0,
          register_one: parseInt(cashCount.one) || 0,
          register_total: registerCash,
          // 両替バッグ（枚数）
          bag_ten_thousand: parseInt(cashCountAfter.ten_thousand) || 0,
          bag_five_thousand: parseInt(cashCountAfter.five_thousand) || 0,
          bag_two_thousand: parseInt(cashCountAfter.two_thousand) || 0,
          bag_one_thousand: parseInt(cashCountAfter.one_thousand) || 0,
          bag_five_hundred: parseInt(cashCountAfter.five_hundred) || 0,
          bag_one_hundred: parseInt(cashCountAfter.one_hundred) || 0,
          bag_fifty: parseInt(cashCountAfter.fifty) || 0,
          bag_ten: parseInt(cashCountAfter.ten) || 0,
          bag_five: parseInt(cashCountAfter.five) || 0,
          bag_one: parseInt(cashCountAfter.one) || 0,
          bag_total: changeBag,
          // 計算値
          envelope_amount: envelopeAmount,
          expected_envelope: expectedEnvelope,
          discrepancy: discrepancy,
          // 売上
          cash_sales: salesData.cash_amount,
          card_sales: salesData.card_amount,
          total_sales: salesData.cash_amount + salesData.card_amount,
          transaction_count: salesData.transaction_count,
          fixed_amount: salesData.fixed_amount,
          // 支払い
          payments: payments,
          total_payments: todayPayments,
          notes: null
        })
      });

      if (response.ok) {
        setIsSaved(true);
        
        // バックアップを実行（既存のバックアップAPIを使用）
        try {
          const backupResponse = await fetch('/api/backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create' })
          });
          const backupResult = await backupResponse.json();
          if (backupResult.success) {
            alert(`保存しました\n\nバックアップ完了: ${backupResult.data.filename}\nサイズ: ${backupResult.data.sizeFormatted}`);
          } else {
            alert(`保存しました\n\n※バックアップに失敗: ${backupResult.error}`);
          }
        } catch (backupError) {
          console.error('バックアップエラー:', backupError);
          alert('保存しました\n\n※バックアップに失敗しました');
        }
      } else {
        const error = await response.json();
        alert('保存に失敗しました: ' + error.error);
      }
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 日付選択確定
  const handleDateConfirm = (newDate) => {
    setDate(newDate);
  };

  useEffect(() => {
    fetchClosingData(date);
  }, [date]);

  const registerCash = calculateRegisterCash();
  const changeBag = calculateChangeBag();
  const todayPayments = calculateTodayPayments();
  const envelopeAmount = calculateEnvelopeAmount();
  const expectedEnvelope = calculateExpectedEnvelope();
  const discrepancy = calculateDiscrepancy();

  // 日付表示フォーマット
  const formatDateDisplay = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  // 2列表示用のコンポーネント
  const CashInputGrid = ({ counts, onChange, isAfter = false }) => (
    <div className="register-closing__cash-grid">
      <div className="register-closing__cash-column">
        <div className="register-closing__column-header">💴 お札</div>
        {bills.map((denom) => {
          const count = parseInt(counts[denom.key]) || 0;
          const amount = count * denom.value;
          return (
            <div key={denom.key} className="register-closing__cash-row">
              <span className="register-closing__denom-label">{denom.label}</span>
              <input
                type="number"
                min="0"
                value={counts[denom.key]}
                onChange={(e) => onChange(denom.key, e.target.value)}
                placeholder={isAfter ? denom.defaultCount.toString() : "0"}
                className={`register-closing__count-input ${isAfter ? 'register-closing__count-input--after' : ''}`}
              />
              <span className="register-closing__row-amount">¥{amount.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
      <div className="register-closing__cash-column">
        <div className="register-closing__column-header">🪙 硬貨</div>
        {coins.map((denom) => {
          const count = parseInt(counts[denom.key]) || 0;
          const amount = count * denom.value;
          return (
            <div key={denom.key} className="register-closing__cash-row">
              <span className="register-closing__denom-label">{denom.label}</span>
              <input
                type="number"
                min="0"
                value={counts[denom.key]}
                onChange={(e) => onChange(denom.key, e.target.value)}
                placeholder={isAfter ? denom.defaultCount.toString() : "0"}
                className={`register-closing__count-input ${isAfter ? 'register-closing__count-input--after' : ''}`}
              />
              <span className="register-closing__row-amount">¥{amount.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="register-closing">
      {/* ヘッダー */}
      <div className="register-closing__header">
        <div>
          <h2 className="register-closing__title">レジ締め</h2>
          <div className="register-closing__date-wrapper">
            <button
              onClick={() => setShowDatePicker(true)}
              className="register-closing__date-btn"
            >
              <Calendar size={18} />
              {formatDateDisplay(date)}
            </button>
            {isSaved && <span className="register-closing__saved-badge">保存済み</span>}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="register-closing__save-btn"
        >
          <Save size={18} />
          {isLoading ? '保存中...' : '保存'}
        </button>
      </div>

      {/* 日付ピッカー */}
      <DateScrollPicker
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={handleDateConfirm}
        initialDate={date}
      />

      {/* 売上状況 */}
      <div className="register-closing__section">
        <div className="register-closing__section-header register-closing__section-header--sales">
          <TrendingUp size={20} />
          <h3>本日の売上</h3>
        </div>
        <div className="register-closing__sales-grid">
          <div className="register-closing__sales-card">
            <div className="register-closing__sales-label">現金売上</div>
            <div className="register-closing__sales-value">
              ¥{salesData.cash_amount.toLocaleString()}
            </div>
          </div>
          <div className="register-closing__sales-card">
            <div className="register-closing__sales-label">カード売上</div>
            <div className="register-closing__sales-value">
              ¥{salesData.card_amount.toLocaleString()}
            </div>
          </div>
          <div className="register-closing__sales-card">
            <div className="register-closing__sales-label">売上合計</div>
            <div className="register-closing__sales-value register-closing__sales-value--total">
              ¥{(salesData.cash_amount + salesData.card_amount).toLocaleString()}
            </div>
          </div>
          <div className="register-closing__sales-card">
            <div className="register-closing__sales-label">取引件数</div>
            <div className="register-closing__sales-value">
              {salesData.transaction_count}件
            </div>
          </div>
        </div>
      </div>

      {/* ステップ1: レジ内現金 */}
      <div className="register-closing__section">
        <div className="register-closing__section-header">
          <DollarSign size={20} />
          <h3>① レジ内の現金を数える</h3>
        </div>
        
        <CashInputGrid counts={cashCount} onChange={handleCountChange} />
        
        <div className="register-closing__cash-total">
          レジ内現金 合計: <strong>¥{registerCash.toLocaleString()}</strong>
        </div>
      </div>

      {/* ステップ2: 支払い登録 */}
      <div className="register-closing__section">
        <div className="register-closing__section-header register-closing__section-header--payment">
          <div className="register-closing__section-title">
            <Receipt size={20} />
            <h3>② 本日の支払い</h3>
          </div>
          <button
            onClick={() => setShowPaymentForm(!showPaymentForm)}
            className={`register-closing__add-payment-btn ${showPaymentForm ? 'register-closing__add-payment-btn--close' : ''}`}
          >
            {showPaymentForm ? <X size={16} /> : <Plus size={16} />}
            {showPaymentForm ? '閉じる' : '支払い追加'}
          </button>
        </div>

        {showPaymentForm && (
          <div className="register-closing__payment-form">
            <div className="register-closing__form-row">
              <div className="register-closing__form-group">
                <label>日付</label>
                <input
                  type="date"
                  name="date"
                  value={paymentForm.date}
                  onChange={handlePaymentInputChange}
                />
              </div>
              <div className="register-closing__form-group">
                <label>項目</label>
                <select
                  name="category"
                  value={paymentForm.category}
                  onChange={handlePaymentInputChange}
                >
                  {paymentCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="register-closing__form-group">
                <label>金額</label>
                <input
                  type="number"
                  name="amount"
                  value={paymentForm.amount}
                  onChange={handlePaymentInputChange}
                  placeholder="金額を入力"
                />
              </div>
              <div className="register-closing__form-group register-closing__form-group--memo">
                <label>メモ</label>
                <input
                  type="text"
                  name="memo"
                  value={paymentForm.memo}
                  onChange={handlePaymentInputChange}
                  placeholder="メモ（任意）"
                />
              </div>
            </div>
            <button onClick={handleAddPayment} className="register-closing__form-submit">
              追加
            </button>
          </div>
        )}

        {payments.length > 0 ? (
          <>
            <table className="register-closing__table register-closing__table--payments">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>項目</th>
                  <th>金額</th>
                  <th>メモ</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.date}</td>
                    <td>{payment.category}</td>
                    <td>¥{payment.amount.toLocaleString()}</td>
                    <td>{payment.memo || '-'}</td>
                    <td>
                      <button
                        onClick={() => handleDeletePayment(payment.id)}
                        className="register-closing__delete-btn"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="register-closing__payment-summary">
              支払い合計: <strong>¥{todayPayments.toLocaleString()}</strong>
            </div>
          </>
        ) : (
          <div className="register-closing__empty">
            本日の支払いはありません
          </div>
        )}
      </div>

      {/* ステップ3: 封筒金額 */}
      <div className="register-closing__section register-closing__section--envelope">
        <div className="register-closing__section-header">
          <Archive size={20} />
          <h3>③ 封筒に入れる金額（金庫へ）</h3>
        </div>
        
        <div className="register-closing__envelope-calc">
          <div className="register-closing__calc-item">
            <span>レジ内現金</span>
            <span>¥{registerCash.toLocaleString()}</span>
          </div>
          <div className="register-closing__calc-item">
            <span>− 両替バッグ</span>
            <span>¥{changeBag.toLocaleString()}</span>
          </div>
          <div className="register-closing__calc-item">
            <span>− 支払い</span>
            <span>¥{todayPayments.toLocaleString()}</span>
          </div>
          <div className="register-closing__calc-result">
            <span>= 封筒金額</span>
            <span>¥{envelopeAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ステップ4: 両替バッグ */}
      <div className="register-closing__section">
        <div className="register-closing__section-header register-closing__section-header--after">
          <Wallet size={20} />
          <h3>④ 両替バッグを数える（補充後）</h3>
        </div>
        
        <CashInputGrid counts={cashCountAfter} onChange={handleCountAfterChange} isAfter={true} />
        
        <div className="register-closing__cash-total register-closing__cash-total--after">
          両替バッグ 合計: <strong>¥{changeBag.toLocaleString()}</strong>
          <span className="register-closing__fixed-note">（規定 ¥{salesData.fixed_amount.toLocaleString()}）</span>
        </div>

        {changeBag !== salesData.fixed_amount && (
          <div className={`register-closing__bag-warning ${changeBag > salesData.fixed_amount ? 'register-closing__bag-warning--over' : 'register-closing__bag-warning--under'}`}>
            規定額と{Math.abs(changeBag - salesData.fixed_amount).toLocaleString()}円{changeBag > salesData.fixed_amount ? '多い' : '少ない'}です
          </div>
        )}
      </div>

      {/* 過不足チェック */}
      <div className={`register-closing__section register-closing__section--result ${
        discrepancy === 0 ? 'register-closing__section--ok' :
        discrepancy > 0 ? 'register-closing__section--plus' : 'register-closing__section--minus'
      }`}>
        <div className="register-closing__result-content">
          <div className="register-closing__result-label">
            過不足
            <span className="register-closing__result-detail">
              （封筒 ¥{envelopeAmount.toLocaleString()} − 理論 ¥{expectedEnvelope.toLocaleString()}）
            </span>
          </div>
          <div className="register-closing__result-amount">
            {discrepancy > 0 ? '+' : ''}¥{discrepancy.toLocaleString()}
          </div>
        </div>
        {discrepancy === 0 ? (
          <div className="register-closing__result-message">✓ 過不足なし！お疲れ様でした。</div>
        ) : (
          <div className="register-closing__result-message">⚠ 過不足があります。再確認してください。</div>
        )}
      </div>
    </div>
  );
};

export default RegisterClosing;