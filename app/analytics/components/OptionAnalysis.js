// app/analytics/components/OptionAnalysis.js
"use client";
import React from 'react';
import { Package, TrendingUp, Tag, Award } from 'lucide-react';

const OptionAnalysis = ({ data, period }) => {
  function formatCurrency(amount) {
    return `¥${Math.round(amount || 0).toLocaleString()}`;
  }

  if (!data || !Array.isArray(data)) {
    return (
      <div className="option-analysis">
        <p className="no-data-message">データがありません</p>
      </div>
    );
  }

  // 期間ごとにグループ化してランキング
  const groupedByPeriod = data.reduce((acc, row) => {
    if (!acc[row.period]) {
      acc[row.period] = {};
    }
    const optionKey = row.option_name;
    if (!acc[row.period][optionKey]) {
      acc[row.period][optionKey] = {
        option_name: row.option_name,
        option_category: row.option_category,
        usage_count: 0,
        total_quantity: 0,
        total_revenue: 0,
        free_count: 0,
        paid_count: 0
      };
    }
    acc[row.period][optionKey].usage_count += row.usage_count;
    acc[row.period][optionKey].total_quantity += row.total_quantity;
    acc[row.period][optionKey].total_revenue += row.total_revenue;
    acc[row.period][optionKey].free_count += row.free_count;
    acc[row.period][optionKey].paid_count += row.paid_count;
    return acc;
  }, {});

  // 各期間内でランキング
  const rankedPeriods = Object.entries(groupedByPeriod).map(([period, options]) => {
    const sortedOptions = Object.values(options).sort((a, b) => b.total_revenue - a.total_revenue);
    return { period, rankings: sortedOptions };
  }).sort((a, b) => b.period.localeCompare(a.period));

  // 全期間通してのトップオプション
  const allOptionStats = data.reduce((acc, row) => {
    const existing = acc.find(o => o.option_name === row.option_name);
    if (existing) {
      existing.usage_count += row.usage_count;
      existing.total_quantity += row.total_quantity;
      existing.total_revenue += row.total_revenue;
      existing.free_count += row.free_count;
      existing.paid_count += row.paid_count;
    } else {
      acc.push({
        option_name: row.option_name,
        option_category: row.option_category,
        usage_count: row.usage_count,
        total_quantity: row.total_quantity,
        total_revenue: row.total_revenue,
        free_count: row.free_count,
        paid_count: row.paid_count
      });
    }
    return acc;
  }, []).sort((a, b) => b.total_revenue - a.total_revenue);

  const topOption = allOptionStats[0];

  return (
    <div className="option-analysis">
      {/* トップオプション */}
      {topOption && (
        <div className="top-option-card">
          <div className="top-option-header">
            <Award size={32} />
            <h3>全期間人気No.1オプション</h3>
          </div>
          <div className="top-option-name">{topOption.option_name}</div>
          <div className="top-option-category">{topOption.option_category}</div>
          <div className="top-option-stats">
            <div className="stat-item">
              <div className="stat-label">総売上</div>
              <div className="stat-value">{formatCurrency(topOption.total_revenue)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">使用回数</div>
              <div className="stat-value">{topOption.usage_count}回</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">総数量</div>
              <div className="stat-value">{topOption.total_quantity}個</div>
            </div>
          </div>
        </div>
      )}

      {/* 期間別ランキング */}
      <div className="analytics-card">
        <h3 className="analytics-card__title">
          <Package size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          {period === 'yearly' ? '年別' : '月別'}オプションランキング
        </h3>

        {rankedPeriods.map(({ period: periodName, rankings }) => (
          <div key={periodName} className="period-section">
            <h4 className="period-title">{periodName}</h4>
            <div className="option-table">
              {/* ヘッダー */}
              <div className="option-row option-row--header">
                <div className="option-cell option-cell--rank">順位</div>
                <div className="option-cell option-cell--name">オプション名</div>
                <div className="option-cell option-cell--category">カテゴリ</div>
                <div className="option-cell option-cell--number">使用回数</div>
                <div className="option-cell option-cell--number">売上</div>
                <div className="option-cell option-cell--number">無料</div>
                <div className="option-cell option-cell--number">有料</div>
              </div>

              {/* データ行 */}
              {rankings.map((option, index) => (
                <div key={index} className="option-row">
                  <div className="option-cell option-cell--rank">
                    <div className={`rank-badge rank-${index + 1}`}>
                      {index + 1}
                    </div>
                  </div>
                  <div className="option-cell option-cell--name">
                    <strong>{option.option_name}</strong>
                    {index === 0 && <span className="medal">🥇</span>}
                    {index === 1 && <span className="medal">🥈</span>}
                    {index === 2 && <span className="medal">🥉</span>}
                  </div>
                  <div className="option-cell option-cell--category">{option.option_category}</div>
                  <div className="option-cell option-cell--number">{option.usage_count}回</div>
                  <div className="option-cell option-cell--number">{formatCurrency(option.total_revenue)}</div>
                  <div className="option-cell option-cell--number">
                    {option.free_count > 0 ? `${option.free_count}回` : '-'}
                  </div>
                  <div className="option-cell option-cell--number">
                    {option.paid_count > 0 ? `${option.paid_count}回` : '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .option-analysis {
          padding: 0;
        }

        /* トップオプションカード */
        .top-option-card {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 1rem;
          padding: 2rem;
          margin-bottom: 2rem;
          color: white;
        }

        .top-option-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .top-option-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .top-option-name {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .top-option-category {
          font-size: 1rem;
          opacity: 0.9;
          margin-bottom: 1.5rem;
        }

        .top-option-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .stat-item {
          background: rgba(255, 255, 255, 0.15);
          padding: 1rem;
          border-radius: 0.5rem;
          backdrop-filter: blur(10px);
        }

        .stat-label {
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        /* 期間セクション */
        .period-section {
          margin-bottom: 2rem;
        }

        .period-section:last-child {
          margin-bottom: 0;
        }

        .period-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 1rem 0;
          padding: 0.75rem 1rem;
          background: #f9fafb;
          border-left: 4px solid #10b981;
          border-radius: 0.25rem;
        }

        /* オプションテーブル */
        .option-table {
          display: flex;
          flex-direction: column;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .option-row {
          display: grid;
          grid-template-columns: 70px 2fr 1.2fr 1fr 0.8fr 1.2fr 0.8fr 0.8fr;
          border-bottom: 1px solid #f3f4f6;
          transition: background 0.15s;
        }

        .option-row:last-child {
          border-bottom: none;
        }

        .option-row:not(.option-row--header):hover {
          background: #f9fafb;
        }

        .option-row--header {
          background: #f9fafb;
          font-weight: 600;
        }

        .option-cell {
          padding: 0.875rem 1rem;
          display: flex;
          align-items: center;
          font-size: 0.9375rem;
          color: #1f2937;
          border-right: 1px solid #f3f4f6;
        }

        .option-cell:last-child {
          border-right: none;
        }

        .option-row--header .option-cell {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .option-cell--rank {
          justify-content: center;
        }

        .option-cell--name {
          justify-content: flex-start;
          gap: 0.5rem;
        }

        .option-cell--category {
          justify-content: flex-start;
        }

        .option-cell--number {
          justify-content: flex-end;
          font-variant-numeric: tabular-nums;
        }

        .rank-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: #e5e7eb;
          color: #374151;
          border-radius: 50%;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .rank-1 {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: white;
          box-shadow: 0 2px 6px rgba(251, 191, 36, 0.3);
        }

        .rank-2 {
          background: linear-gradient(135deg, #94a3b8, #64748b);
          color: white;
        }

        .rank-3 {
          background: linear-gradient(135deg, #cd7f32, #b8692f);
          color: white;
        }

        .medal {
          font-size: 1.25rem;
        }

        .no-data-message {
          color: #6b7280;
          text-align: center;
          padding: 2rem;
          margin: 0;
        }

        @media (max-width: 1200px) {
          .option-row {
            grid-template-columns: 60px 1.5fr 1fr 0.8fr 0.7fr 1fr 0.7fr 0.7fr;
          }

          .option-cell {
            padding: 0.75rem 0.5rem;
            font-size: 0.875rem;
          }

          .top-option-stats {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .option-table {
            overflow-x: auto;
          }

          .option-row {
            min-width: 1000px;
          }
        }
      `}</style>
    </div>
  );
};

export default OptionAnalysis;