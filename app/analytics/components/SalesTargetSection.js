// app/analytics/components/SalesTargetSection.js
"use client";
import React, { useState, useEffect } from 'react';
import { Target, Store, Users, Save, Edit3, TrendingUp, Award } from 'lucide-react';

const SalesTargetSection = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editTargets, setEditTargets] = useState({
    store: '',
    staff: {}
  });
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  useEffect(() => {
    fetchData();
    fetchStaff();
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/monthly-targets?year=${selectedMonth.year}&month=${selectedMonth.month}`
      );
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setEditTargets({
          store: result.data.store.target_amount || '',
          staff: result.data.staff.reduce((acc, s) => {
            acc[s.staff_id] = s.target_amount || '';
            return acc;
          }, {})
        });
      }
    } catch (error) {
      console.error('売上目標取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff');
      const result = await response.json();
      if (result.success) {
        setStaffList(result.data.filter(s => s.is_active));
      }
    } catch (error) {
      console.error('スタッフ取得エラー:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 店舗全体の目標を保存
      await fetch('/api/monthly-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedMonth.year,
          month: selectedMonth.month,
          staff_id: null,
          target_amount: parseInt(editTargets.store) || 0
        })
      });

      // スタッフ別目標を保存
      for (const staff of staffList) {
        const amount = editTargets.staff[staff.staff_id];
        await fetch('/api/monthly-targets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: selectedMonth.year,
            month: selectedMonth.month,
            staff_id: staff.staff_id,
            target_amount: parseInt(amount) || 0
          })
        });
      }

      await fetchData();
      setEditMode(false);
    } catch (error) {
      console.error('保存エラー:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return '¥0';
    return `¥${Math.round(amount).toLocaleString()}`;
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return '#10b981';
    if (progress >= 70) return '#3b82f6';
    if (progress >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = -6; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: `${date.getFullYear()}年${date.getMonth() + 1}月`
      });
    }
    return options;
  };

  if (loading) {
    return (
      <div className="sales-target-section">
        <div className="sales-target-loading">読み込み中...</div>
      </div>
    );
  }

  const storeProgress = data?.store?.progress || 0;

  return (
    <div className="sales-target-section">
      {/* ヘッダー */}
      <div className="sales-target-header">
        <div className="sales-target-header__left">
          <select
            className="sales-target-month-select"
            value={`${selectedMonth.year}-${selectedMonth.month}`}
            onChange={(e) => {
              const [year, month] = e.target.value.split('-');
              setSelectedMonth({ year: parseInt(year), month: parseInt(month) });
            }}
          >
            {getMonthOptions().map(opt => (
              <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sales-target-header__right">
          {editMode ? (
            <>
              <button
                className="sales-target-btn sales-target-btn--cancel"
                onClick={() => setEditMode(false)}
              >
                キャンセル
              </button>
              <button
                className="sales-target-btn sales-target-btn--save"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={16} />
                {saving ? '保存中...' : '保存'}
              </button>
            </>
          ) : (
            <button
              className="sales-target-btn sales-target-btn--edit"
              onClick={() => setEditMode(true)}
            >
              <Edit3 size={16} />
              目標を編集
            </button>
          )}
        </div>
      </div>

      {/* 店舗全体 */}
      <div className="analytics-card sales-target-card sales-target-card--store">
        <div className="sales-target-card__header">
          <div className="sales-target-card__title">
            <Store size={24} />
            <span>店舗全体</span>
          </div>
          {!editMode && data?.store?.target_amount > 0 && (
            <div 
              className="sales-target-card__badge"
              style={{ backgroundColor: getProgressColor(storeProgress) }}
            >
              {storeProgress}%
            </div>
          )}
        </div>

        {editMode ? (
          <div className="sales-target-edit-row">
            <label>目標金額</label>
            <div className="sales-target-input-wrapper">
              <span className="sales-target-currency">¥</span>
              <input
                type="number"
                value={editTargets.store}
                onChange={(e) => setEditTargets(prev => ({ ...prev, store: e.target.value }))}
                placeholder="0"
                className="sales-target-input"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="sales-target-amounts">
              <div className="sales-target-actual">
                <span className="sales-target-label">実績</span>
                <span className="sales-target-value">{formatAmount(data?.store?.actual_amount)}</span>
              </div>
              <div className="sales-target-divider">/</div>
              <div className="sales-target-goal">
                <span className="sales-target-label">目標</span>
                <span className="sales-target-value">
                  {data?.store?.target_amount > 0 ? formatAmount(data?.store?.target_amount) : '未設定'}
                </span>
              </div>
            </div>

            {data?.store?.target_amount > 0 && (
              <div className="sales-target-progress">
                <div className="sales-target-progress__bar">
                  <div 
                    className="sales-target-progress__fill"
                    style={{ 
                      width: `${Math.min(storeProgress, 100)}%`,
                      backgroundColor: getProgressColor(storeProgress)
                    }}
                  />
                </div>
                <div className="sales-target-progress__info">
                  <span>残り {formatAmount(Math.max(0, (data?.store?.target_amount || 0) - (data?.store?.actual_amount || 0)))}</span>
                  <span>{data?.store?.transaction_count || 0}件の取引</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* スタッフ別 */}
      <div className="analytics-card">
        <h3 className="analytics-card__title">
          <Users size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          スタッフ別目標
        </h3>

        <div className="sales-target-staff-grid">
          {staffList.map(staff => {
            const staffData = data?.staff?.find(s => s.staff_id === staff.staff_id);
            const progress = staffData?.progress || 0;
            const actual = staffData?.actual_amount || 0;
            const target = editMode 
              ? parseInt(editTargets.staff[staff.staff_id]) || 0
              : staffData?.target_amount || 0;

            return (
              <div 
                key={staff.staff_id} 
                className="sales-target-staff-card"
                style={{ borderLeftColor: staff.color }}
              >
                <div className="sales-target-staff-header">
                  <span 
                    className="sales-target-staff-color"
                    style={{ backgroundColor: staff.color }}
                  />
                  <span className="sales-target-staff-name">{staff.name}</span>
                  {!editMode && target > 0 && (
                    <span 
                      className="sales-target-staff-badge"
                      style={{ backgroundColor: getProgressColor(progress) }}
                    >
                      {progress}%
                    </span>
                  )}
                </div>

                {editMode ? (
                  <div className="sales-target-staff-edit">
                    <div className="sales-target-input-wrapper sales-target-input-wrapper--small">
                      <span className="sales-target-currency">¥</span>
                      <input
                        type="number"
                        value={editTargets.staff[staff.staff_id] || ''}
                        onChange={(e) => setEditTargets(prev => ({
                          ...prev,
                          staff: { ...prev.staff, [staff.staff_id]: e.target.value }
                        }))}
                        placeholder="0"
                        className="sales-target-input"
                      />
                    </div>
                    <span className="sales-target-staff-current">
                      現在: {formatAmount(actual)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="sales-target-staff-amounts">
                      <span className="sales-target-staff-actual">{formatAmount(actual)}</span>
                      <span className="sales-target-staff-separator">/</span>
                      <span className="sales-target-staff-target">
                        {target > 0 ? formatAmount(target) : '未設定'}
                      </span>
                    </div>

                    {target > 0 && (
                      <div className="sales-target-staff-progress">
                        <div 
                          className="sales-target-staff-progress__fill"
                          style={{ 
                            width: `${Math.min(progress, 100)}%`,
                            backgroundColor: getProgressColor(progress)
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 達成状況サマリー */}
      {!editMode && (
        <div className="analytics-card">
          <h3 className="analytics-card__title">
            <Award size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
            達成状況
          </h3>
          <div className="sales-target-summary">
            <div className="sales-target-summary-item">
              <div className="sales-target-summary-icon" style={{ backgroundColor: '#10b981' }}>
                <TrendingUp size={20} />
              </div>
              <div className="sales-target-summary-content">
                <span className="sales-target-summary-label">目標達成</span>
                <span className="sales-target-summary-value">
                  {data?.staff?.filter(s => s.progress >= 100).length || 0}人
                </span>
              </div>
            </div>
            <div className="sales-target-summary-item">
              <div className="sales-target-summary-icon" style={{ backgroundColor: '#3b82f6' }}>
                <Target size={20} />
              </div>
              <div className="sales-target-summary-content">
                <span className="sales-target-summary-label">70%以上</span>
                <span className="sales-target-summary-value">
                  {data?.staff?.filter(s => s.progress >= 70 && s.progress < 100).length || 0}人
                </span>
              </div>
            </div>
            <div className="sales-target-summary-item">
              <div className="sales-target-summary-icon" style={{ backgroundColor: '#f59e0b' }}>
                <Target size={20} />
              </div>
              <div className="sales-target-summary-content">
                <span className="sales-target-summary-label">50%以上</span>
                <span className="sales-target-summary-value">
                  {data?.staff?.filter(s => s.progress >= 50 && s.progress < 70).length || 0}人
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .sales-target-section {
          padding: 0;
        }

        .sales-target-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          color: #6b7280;
        }

        .sales-target-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .sales-target-month-select {
          padding: 0.75rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          background: white;
          cursor: pointer;
        }

        .sales-target-header__right {
          display: flex;
          gap: 0.75rem;
        }

        .sales-target-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sales-target-btn--edit {
          background: #3b82f6;
          color: white;
        }

        .sales-target-btn--edit:hover {
          background: #2563eb;
        }

        .sales-target-btn--save {
          background: #10b981;
          color: white;
        }

        .sales-target-btn--save:hover {
          background: #059669;
        }

        .sales-target-btn--save:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .sales-target-btn--cancel {
          background: #f3f4f6;
          color: #374151;
        }

        .sales-target-btn--cancel:hover {
          background: #e5e7eb;
        }

        /* 店舗カード */
        .sales-target-card--store {
          background: linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%);
          color: white;
          padding: 2rem;
        }

        .sales-target-card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .sales-target-card__title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .sales-target-card__badge {
          padding: 0.5rem 1rem;
          border-radius: 2rem;
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
        }

        .sales-target-amounts {
          display: flex;
          align-items: baseline;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .sales-target-actual,
        .sales-target-goal {
          display: flex;
          flex-direction: column;
        }

        .sales-target-label {
          font-size: 0.875rem;
          opacity: 0.8;
          margin-bottom: 0.25rem;
        }

        .sales-target-value {
          font-size: 2rem;
          font-weight: 700;
        }

        .sales-target-divider {
          font-size: 1.5rem;
          opacity: 0.5;
        }

        .sales-target-progress {
          margin-top: 1rem;
        }

        .sales-target-progress__bar {
          height: 12px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          overflow: hidden;
        }

        .sales-target-progress__fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.5s ease;
        }

        .sales-target-progress__info {
          display: flex;
          justify-content: space-between;
          margin-top: 0.75rem;
          font-size: 0.875rem;
          opacity: 0.8;
        }

        /* 編集モード */
        .sales-target-edit-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .sales-target-edit-row label {
          font-size: 1rem;
          font-weight: 500;
        }

        .sales-target-input-wrapper {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .sales-target-input-wrapper--small {
          background: #f9fafb;
          border-color: #e5e7eb;
        }

        .sales-target-currency {
          padding: 0 0.75rem;
          font-weight: 600;
          opacity: 0.8;
        }

        .sales-target-input {
          flex: 1;
          padding: 0.75rem;
          border: none;
          background: transparent;
          font-size: 1.25rem;
          font-weight: 700;
          color: inherit;
          width: 150px;
        }

        .sales-target-input-wrapper--small .sales-target-input {
          color: #111827;
          font-size: 1rem;
        }

        .sales-target-input:focus {
          outline: none;
        }

        .sales-target-input::placeholder {
          opacity: 0.5;
        }

        /* スタッフグリッド */
        .sales-target-staff-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .sales-target-staff-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-left: 4px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1.25rem;
        }

        .sales-target-staff-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .sales-target-staff-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .sales-target-staff-name {
          font-weight: 600;
          color: #111827;
          flex: 1;
        }

        .sales-target-staff-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: white;
        }

        .sales-target-staff-amounts {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }

        .sales-target-staff-actual {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        .sales-target-staff-separator {
          color: #9ca3af;
        }

        .sales-target-staff-target {
          font-size: 1rem;
          color: #6b7280;
        }

        .sales-target-staff-progress {
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
          margin-top: 0.75rem;
        }

        .sales-target-staff-progress__fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }

        .sales-target-staff-edit {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .sales-target-staff-current {
          font-size: 0.875rem;
          color: #6b7280;
        }

        /* 達成状況サマリー */
        .sales-target-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .sales-target-summary-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.5rem;
        }

        .sales-target-summary-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          color: white;
        }

        .sales-target-summary-content {
          display: flex;
          flex-direction: column;
        }

        .sales-target-summary-label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .sales-target-summary-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        @media (max-width: 768px) {
          .sales-target-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .sales-target-header__right {
            justify-content: flex-end;
          }

          .sales-target-amounts {
            flex-wrap: wrap;
          }

          .sales-target-value {
            font-size: 1.5rem;
          }

          .sales-target-staff-grid {
            grid-template-columns: 1fr;
          }

          .sales-target-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default SalesTargetSection;