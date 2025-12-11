// app/analytics/page.js
"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, TrendingUp, Package, Settings2, Users, Tag, Clock, Calendar, Ban, Target } from 'lucide-react';
import SummarySection from './components/SummarySection';
import SalesAnalysis from './components/SalesTrendChart';
import ServiceAnalysis from './components/ServiceAnalysis';
import OptionAnalysis from './components/OptionAnalysis';
import StaffAnalysis from './components/StaffAnalysis';
import CustomerAnalysis from './components/CustomerAnalysis';
import CouponAnalysis from './components/CouponAnalysis';
import LimitedOfferAnalysis from './components/LimitedOfferAnalysis';
import CancelAnalysis from './components/CancelAnalysis';
import SalesTargetSection from './components/SalesTargetSection';
import './analytics.css';

const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const [period, setPeriod] = useState('monthly'); // 'daily', 'monthly', 'yearly'
  const [datePreset, setDatePreset] = useState('thisYear');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [tempDateRange, setTempDateRange] = useState({ startYear: '', startMonth: '', endYear: '', endMonth: '' });
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // 期間切り替えが必要なタブ
  const tabsWithPeriodToggle = ['sales', 'service', 'option', 'staff', 'coupon', 'limited'];
  
  // 売上推移タブは日別・月別の2つ
  const isSalesTab = activeTab === 'sales';

  // プリセット期間の計算
  const calculatePresetDates = (preset) => {
    const today = new Date();
    let startDate, endDate;

    switch (preset) {
      case 'thisYear':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      case 'lastYear':
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
        break;
      case 'past3Years':
        startDate = new Date(today.getFullYear() - 2, 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      default:
        return;
    }

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  };

  // プリセット変更時の処理
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset === 'custom') {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      setTempDateRange({
        startYear: startDate.getFullYear().toString(),
        startMonth: (startDate.getMonth() + 1).toString().padStart(2, '0'),
        endYear: endDate.getFullYear().toString(),
        endMonth: (endDate.getMonth() + 1).toString().padStart(2, '0')
      });
      setShowCalendarModal(true);
    } else {
      setShowCalendarModal(false);
      calculatePresetDates(preset);
    }
  };

  // カレンダーモーダルの適用
  const handleApplyCustomDate = () => {
    if (tempDateRange.startYear && tempDateRange.startMonth && tempDateRange.endYear && tempDateRange.endMonth) {
      const startDate = new Date(parseInt(tempDateRange.startYear), parseInt(tempDateRange.startMonth) - 1, 1);
      const endDate = new Date(parseInt(tempDateRange.endYear), parseInt(tempDateRange.endMonth), 0);
      
      setDateRange({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
      setShowCalendarModal(false);
    }
  };

  // カレンダーモーダルのキャンセル
  const handleCancelCustomDate = () => {
    setShowCalendarModal(false);
    if (datePreset === 'custom') {
      setDatePreset('thisYear');
    }
  };

  // タブ切り替え時に期間をリセット
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // 売上推移以外のタブに移動時、dailyだったらmonthlyに戻す
    if (tab !== 'sales' && period === 'daily') {
      setPeriod('monthly');
    }
  };

  // 初期設定（今年）
  useEffect(() => {
    calculatePresetDates('thisYear');
  }, []);

  // データ取得
  useEffect(() => {
    // targetタブは独自でデータ取得するのでスキップ
    if (activeTab === 'target') return;
    
    if (dateRange.startDate && dateRange.endDate) {
      fetchData();
    }
  }, [activeTab, period, dateRange]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let response;
      
      switch (activeTab) {
        case 'summary':
          response = await fetch(`/api/analytics?type=summary&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
          break;
        case 'sales':
          // 売上推移: daily（日次データ）, monthly（月次データ）
          const salesType = period === 'daily' ? 'daily' : 'monthly';
          response = await fetch(`/api/analytics?type=${salesType}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
          break;
        case 'service':
          response = await fetch(`/api/analytics/services?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&period=${period}`);
          break;
        case 'option':
          response = await fetch(`/api/analytics/options?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&period=${period}`);
          break;
        case 'staff':
          response = await fetch(`/api/analytics/staff?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&period=${period}`);
          break;
        case 'customer':
          response = await fetch(`/api/analytics/customers?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
          break;
        case 'coupon':
          response = await fetch(`/api/analytics/coupons?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&period=${period}`);
          break;
        case 'limited':
          response = await fetch(`/api/analytics/limited-offers?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&period=${period}`);
          break;
        case 'cancel':
          response = await fetch(`/api/analytics/cancel-stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
          break;
        default:
          return;
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        console.error('データ取得エラー:', result.error);
        setData(null);
      }
    } catch (error) {
      console.error('API呼び出しエラー:', error);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="analytics">
      {/* ヘッダー */}
      <header className="analytics__header">
        <div className="analytics__header-container">
          <div className="analytics__header-nav">
            <Link href="/" className="analytics__back-link">
              <ArrowLeft className="analytics__back-icon" />
              <span>予約一覧に戻る</span>
            </Link>
          </div>
          <div className="analytics__header-title">
            <BarChart3 className="analytics__header-icon" />
            <h1>ABBY 売上分析</h1>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="analytics__main">
        {/* コントロールパネル（目標タブ以外で表示） */}
        {activeTab !== 'target' && (
          <div className="analytics__controls">
            {/* 期間選択ボタン */}
            <div className="analytics__preset-buttons">
              <button
                className={`analytics__preset-btn ${datePreset === 'thisYear' ? 'analytics__preset-btn--active' : ''}`}
                onClick={() => handlePresetChange('thisYear')}
              >
                今年
              </button>
              <button
                className={`analytics__preset-btn ${datePreset === 'lastYear' ? 'analytics__preset-btn--active' : ''}`}
                onClick={() => handlePresetChange('lastYear')}
              >
                去年
              </button>
              <button
                className={`analytics__preset-btn ${datePreset === 'past3Years' ? 'analytics__preset-btn--active' : ''}`}
                onClick={() => handlePresetChange('past3Years')}
              >
                過去3年
              </button>
              <button
                className={`analytics__preset-btn ${datePreset === 'custom' ? 'analytics__preset-btn--active' : ''}`}
                onClick={() => handlePresetChange('custom')}
              >
                カスタム期間
              </button>
            </div>

            {/* 期間切り替え（タブによって表示/非表示） */}
            {tabsWithPeriodToggle.includes(activeTab) && (
              <div className="analytics__period-toggle">
                {/* 売上推移タブは日別・月別の2つ */}
                {isSalesTab ? (
                  <>
                    <button
                      className={`analytics__period-btn ${period === 'daily' ? 'analytics__period-btn--active' : ''}`}
                      onClick={() => setPeriod('daily')}
                    >
                      日別
                    </button>
                    <button
                      className={`analytics__period-btn ${period === 'monthly' ? 'analytics__period-btn--active' : ''}`}
                      onClick={() => setPeriod('monthly')}
                    >
                      月別
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={`analytics__period-btn ${period === 'monthly' ? 'analytics__period-btn--active' : ''}`}
                      onClick={() => setPeriod('monthly')}
                    >
                      月別
                    </button>
                    <button
                      className={`analytics__period-btn ${period === 'yearly' ? 'analytics__period-btn--active' : ''}`}
                      onClick={() => setPeriod('yearly')}
                    >
                      年別
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* タブナビゲーション */}
        <div className="analytics__tabs">
          <button
            className={`analytics__tab ${activeTab === 'summary' ? 'analytics__tab--active' : ''}`}
            onClick={() => handleTabChange('summary')}
          >
            <BarChart3 size={18} />
            サマリー
          </button>
          <button
            className={`analytics__tab ${activeTab === 'target' ? 'analytics__tab--active' : ''}`}
            onClick={() => handleTabChange('target')}
          >
            <Target size={18} />
            目標
          </button>
          <button
            className={`analytics__tab ${activeTab === 'sales' ? 'analytics__tab--active' : ''}`}
            onClick={() => handleTabChange('sales')}
          >
            <TrendingUp size={18} />
            売上推移
          </button>
          <button
            className={`analytics__tab ${activeTab === 'service' ? 'analytics__tab--active' : ''}`}
            onClick={() => handleTabChange('service')}
          >
            <Package size={18} />
            サービス
          </button>
          <button
            className={`analytics__tab ${activeTab === 'option' ? 'analytics__tab--active' : ''}`}
            onClick={() => handleTabChange('option')}
          >
            <Settings2 size={18} />
            オプション
          </button>
          <button
            className={`analytics__tab ${activeTab === 'staff' ? 'analytics__tab--active' : ''}`}
            onClick={() => handleTabChange('staff')}
          >
            <Users size={18} />
            スタッフ
          </button>
          <button
            className={`analytics__tab ${activeTab === 'customer' ? 'analytics__tab--active' : ''}`}
            onClick={() => handleTabChange('customer')}
          >
            <Users size={18} />
            顧客
          </button>
          <button
            className={`analytics__tab ${activeTab === 'coupon' ? 'analytics__tab--active' : ''}`}
            onClick={() => handleTabChange('coupon')}
          >
            <Tag size={18} />
            クーポン
          </button>
          <button
            className={`analytics__tab ${activeTab === 'limited' ? 'analytics__tab--active' : ''}`}
            onClick={() => handleTabChange('limited')}
          >
            <Clock size={18} />
            期間限定
          </button>
          <button
            className={`analytics__tab ${activeTab === 'cancel' ? 'analytics__tab--active' : ''}`}
            onClick={() => handleTabChange('cancel')}
          >
            <Ban size={18} />
            キャンセル
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="analytics__content">
          {activeTab === 'target' ? (
            <SalesTargetSection />
          ) : isLoading ? (
            <div className="analytics__loading">
              <p>データを読み込み中...</p>
            </div>
          ) : (
            <>
              {activeTab === 'summary' && <SummarySection data={data} />}
              {activeTab === 'sales' && <SalesAnalysis data={data} period={period} />}
              {activeTab === 'service' && <ServiceAnalysis data={data} period={period} />}
              {activeTab === 'option' && <OptionAnalysis data={data} period={period} />}
              {activeTab === 'staff' && <StaffAnalysis data={data} period={period} />}
              {activeTab === 'customer' && <CustomerAnalysis data={data} />}
              {activeTab === 'coupon' && <CouponAnalysis data={data} period={period} />}
              {activeTab === 'limited' && <LimitedOfferAnalysis data={data} period={period} />}
              {activeTab === 'cancel' && <CancelAnalysis data={data} period={period} />}
            </>
          )}
        </div>
      </main>

      {/* カレンダーモーダル */}
      {showCalendarModal && (
        <div className="calendar-modal-overlay" onClick={handleCancelCustomDate}>
          <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="calendar-modal__header">
              <h3>期間を選択</h3>
              <button className="calendar-modal__close" onClick={handleCancelCustomDate}>
                ✕
              </button>
            </div>
            <div className="calendar-modal__content">
              {/* 開始年月 */}
              <div className="calendar-modal__section">
                <label className="calendar-modal__label">開始年月</label>
                <div className="calendar-modal__date-inputs">
                  <select
                    value={tempDateRange.startYear}
                    onChange={(e) => setTempDateRange(prev => ({ ...prev, startYear: e.target.value }))}
                    className="calendar-modal__select"
                  >
                    <option value="">年</option>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}年</option>
                    ))}
                  </select>
                  <select
                    value={tempDateRange.startMonth}
                    onChange={(e) => setTempDateRange(prev => ({ ...prev, startMonth: e.target.value }))}
                    className="calendar-modal__select"
                  >
                    <option value="">月</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month.toString().padStart(2, '0')}>{month}月</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 終了年月 */}
              <div className="calendar-modal__section">
                <label className="calendar-modal__label">終了年月</label>
                <div className="calendar-modal__date-inputs">
                  <select
                    value={tempDateRange.endYear}
                    onChange={(e) => setTempDateRange(prev => ({ ...prev, endYear: e.target.value }))}
                    className="calendar-modal__select"
                  >
                    <option value="">年</option>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}年</option>
                    ))}
                  </select>
                  <select
                    value={tempDateRange.endMonth}
                    onChange={(e) => setTempDateRange(prev => ({ ...prev, endMonth: e.target.value }))}
                    className="calendar-modal__select"
                  >
                    <option value="">月</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month.toString().padStart(2, '0')}>{month}月</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="calendar-modal__footer">
              <button className="calendar-modal__btn calendar-modal__btn--cancel" onClick={handleCancelCustomDate}>
                キャンセル
              </button>
              <button className="calendar-modal__btn calendar-modal__btn--apply" onClick={handleApplyCustomDate}>
                適用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;