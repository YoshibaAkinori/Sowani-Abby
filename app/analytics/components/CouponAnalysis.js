// app/analytics/components/CouponAnalysis.js
"use client";
import React from 'react';
import { Tag, TrendingUp } from 'lucide-react';

const CouponAnalysis = ({ data, period }) => {
  const { usageByCoupon = [], usageByPeriod = [] } = data || {};
  const [selectedPeriod, setSelectedPeriod] = React.useState(null);

  function formatCurrency(amount) {
    return `¥${Math.round(amount || 0).toLocaleString()}`;
  }

  if (!data) {
    return (
      <div className="coupon-analysis">
        <p className="no-data-message">データがありません</p>
      </div>
    );
  }

  // 全期間の合計を計算
  const totals = usageByCoupon.reduce((acc, coupon) => ({
    usage_count: acc.usage_count + (Number(coupon.usage_count) || 0),
    total_amount: acc.total_amount + (Number(coupon.total_amount) || 0)
  }), { usage_count: 0, total_amount: 0 });

  // 期間のリストを取得
  const allPeriods = React.useMemo(() => {
    const periods = new Set();
    usageByPeriod.forEach(row => {
      if (row.period) periods.add(row.period);
    });
    const sorted = Array.from(periods).sort().reverse();
    
    if (!selectedPeriod && sorted.length > 0) {
      setSelectedPeriod(sorted[0]);
    }
    return sorted;
  }, [usageByPeriod, selectedPeriod]);

  // 選択された期間のデータをフィルタリング
  const periodData = React.useMemo(() => {
    if (!selectedPeriod) return [];
    return usageByPeriod
      .filter(row => row.period === selectedPeriod)
      .sort((a, b) => (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0));
  }, [usageByPeriod, selectedPeriod]);

  // 選択期間の合計
  const periodTotals = periodData.reduce((acc, coupon) => ({
    usage_count: acc.usage_count + (Number(coupon.usage_count) || 0),
    total_amount: acc.total_amount + (Number(coupon.total_amount) || 0)
  }), { usage_count: 0, total_amount: 0 });

  return (
    <div className="coupon-analysis">
      {/* 全期間クーポン使用状況 */}
      <div className="analytics-card">
        <h3 className="analytics-card__title">
          <Tag size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          クーポン使用状況（全期間）
        </h3>
        
        {usageByCoupon && usageByCoupon.length > 0 ? (
          <div className="coupon-table">
            {/* ヘッダー */}
            <div className="coupon-row coupon-row--header">
              <div className="coupon-cell coupon-cell--name">クーポン名</div>
              <div className="coupon-cell coupon-cell--number">使用回数</div>
              <div className="coupon-cell coupon-cell--number">合計金額</div>
            </div>
            
            {/* データ行 */}
            {usageByCoupon.map((coupon, index) => (
              <div key={index} className="coupon-row">
                <div className="coupon-cell coupon-cell--name">{coupon.coupon_name}</div>
                <div className="coupon-cell coupon-cell--number">{coupon.usage_count || 0}回</div>
                <div className="coupon-cell coupon-cell--number">{formatCurrency(coupon.total_amount || 0)}</div>
              </div>
            ))}

            {/* 合計行 */}
            <div className="coupon-row coupon-row--total">
              <div className="coupon-cell coupon-cell--name">
                <strong>合計</strong>
              </div>
              <div className="coupon-cell coupon-cell--number">
                <strong>{totals.usage_count}回</strong>
              </div>
              <div className="coupon-cell coupon-cell--number">
                <strong>{formatCurrency(totals.total_amount)}</strong>
              </div>
            </div>
          </div>
        ) : (
          <p className="no-data-message">データがありません</p>
        )}
      </div>

      {/* 月別クーポン使用状況 */}
      {allPeriods.length > 0 && (
        <div className="analytics-card">
          <h3 className="analytics-card__title">
            <TrendingUp size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
            {period === 'yearly' ? '年別' : '月別'}クーポン使用状況
          </h3>

          {/* 期間タブ */}
          <div className="period-tabs">
            {allPeriods.map(p => {
              const isSelected = p === selectedPeriod;
              const displayText = period === 'yearly'
                ? `${p}年`
                : (() => {
                    const [year, month] = p.split('-');
                    return `${year}年${parseInt(month)}月`;
                  })();
              
              return (
                <button
                  key={p}
                  className={`period-tab ${isSelected ? 'period-tab--active' : ''}`}
                  onClick={() => setSelectedPeriod(p)}
                >
                  {displayText}
                </button>
              );
            })}
          </div>

          {/* 選択期間のデータ */}
          {periodData.length > 0 ? (
            <div className="coupon-table">
              {/* ヘッダー */}
              <div className="coupon-row coupon-row--header">
                <div className="coupon-cell coupon-cell--name">クーポン名</div>
                <div className="coupon-cell coupon-cell--number">使用回数</div>
                <div className="coupon-cell coupon-cell--number">合計金額</div>
              </div>
              
              {/* データ行 */}
              {periodData.map((coupon, index) => (
                <div key={index} className="coupon-row">
                  <div className="coupon-cell coupon-cell--name">{coupon.coupon_name}</div>
                  <div className="coupon-cell coupon-cell--number">{coupon.usage_count || 0}回</div>
                  <div className="coupon-cell coupon-cell--number">{formatCurrency(coupon.total_amount || 0)}</div>
                </div>
              ))}

              {/* 合計行 */}
              <div className="coupon-row coupon-row--total">
                <div className="coupon-cell coupon-cell--name">
                  <strong>合計</strong>
                </div>
                <div className="coupon-cell coupon-cell--number">
                  <strong>{periodTotals.usage_count}回</strong>
                </div>
                <div className="coupon-cell coupon-cell--number">
                  <strong>{formatCurrency(periodTotals.total_amount)}</strong>
                </div>
              </div>
            </div>
          ) : (
            <p className="no-data-message">この期間のデータはありません</p>
          )}
        </div>
      )}

      <style jsx>{`
        .coupon-analysis {
          padding: 0;
        }

        /* 期間タブ */
        .period-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .period-tab {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          background: white;
          color: #6b7280;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.15s;
        }

        .period-tab:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .period-tab--active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        .period-tab--active:hover {
          background: #5a67d8;
          border-color: #5a67d8;
        }

        /* クーポンテーブル */
        .coupon-table {
          display: flex;
          flex-direction: column;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .coupon-row {
          display: grid;
          grid-template-columns: 2.5fr 1fr 1.2fr;
          border-bottom: 1px solid #f3f4f6;
          transition: background 0.15s;
        }

        .coupon-row:last-child {
          border-bottom: none;
        }

        .coupon-row:not(.coupon-row--header):not(.coupon-row--total):hover {
          background: #f9fafb;
        }

        .coupon-row--header {
          background: #f9fafb;
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .coupon-row--total {
          background: #f0fdf4;
          border-top: 2px solid #10b981;
        }

        .coupon-cell {
          padding: 0.875rem 1rem;
          display: flex;
          align-items: center;
          font-size: 0.9375rem;
          color: #1f2937;
          border-right: 1px solid #f3f4f6;
        }

        .coupon-cell:last-child {
          border-right: none;
        }

        .coupon-row--header .coupon-cell {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .coupon-cell--name {
          justify-content: flex-start;
        }

        .coupon-cell--number {
          justify-content: flex-end;
          font-variant-numeric: tabular-nums;
        }

        .no-data-message {
          color: #6b7280;
          text-align: center;
          padding: 2rem;
          margin: 0;
        }

        @media (max-width: 768px) {
          .coupon-table {
            overflow-x: auto;
          }

          .coupon-row {
            min-width: 400px;
          }

          .coupon-cell {
            padding: 0.75rem 0.5rem;
            font-size: 0.875rem;
          }

          .period-tabs {
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 0.5rem;
          }

          .period-tab {
            white-space: nowrap;
          }
        }
      `}</style>
    </div>
  );
};

export default CouponAnalysis;