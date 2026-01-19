// app/analytics/components/ServiceAnalysis.js
"use client";
import React from 'react';
import { Briefcase, Award, Users } from 'lucide-react';

const ServiceAnalysis = ({ data, period }) => {
  // 月別タブ用のstate
  const [selectedPeriod, setSelectedPeriod] = React.useState(null);

  function formatCurrency(amount) {
    return `¥${Math.round(amount || 0).toLocaleString()}`;
  }

  const serviceData = data?.serviceData || data || [];
  const genderData = data?.genderData || [];
  const serviceByPeriod = data?.serviceByPeriod || []; // 期間別サービスデータ

  if (!serviceData || !Array.isArray(serviceData) || serviceData.length === 0) {
    return (
      <div className="service-analysis">
        <p className="no-data-message">データがありません</p>
      </div>
    );
  }

  // 全期間通してのトップサービス（購入回数順）
  const sortedByPurchase = [...serviceData].sort((a, b) => (Number(b.purchase_count) || 0) - (Number(a.purchase_count) || 0));
  const topService = sortedByPurchase[0];

  // 期間のリストを取得してソート
  const allPeriods = React.useMemo(() => {
    const periods = new Set();
    serviceByPeriod.forEach(row => {
      if (row.period) periods.add(row.period);
    });
    const sorted = Array.from(periods).sort().reverse();
    
    // 初期値を最新の期間に設定
    if (!selectedPeriod && sorted.length > 0) {
      setSelectedPeriod(sorted[0]);
    }
    
    return sorted;
  }, [serviceByPeriod, selectedPeriod]);

  // 選択された期間のデータのみをフィルタリング（購入回数でソート）
  const periodServiceData = React.useMemo(() => {
    if (!selectedPeriod) return [];
    
    return serviceByPeriod
      .filter(row => row.period === selectedPeriod)
      .sort((a, b) => (Number(b.purchase_count) || 0) - (Number(a.purchase_count) || 0));
  }, [serviceByPeriod, selectedPeriod]);

  // 性別別データを整形(利用回数の表用)
  const genderTableData = [];
  if (genderData.length > 0) {
    const serviceMap = {};
    
    genderData.forEach(row => {
      if (!serviceMap[row.service_name]) {
        serviceMap[row.service_name] = {
          service_name: row.service_name,
          category: row.category,
          female_count: 0,
          male_count: 0,
          total_count: 0
        };
      }
      if (row.gender === 'female') {
        serviceMap[row.service_name].female_count = Number(row.usage_count) || 0;
      } else if (row.gender === 'male') {
        serviceMap[row.service_name].male_count = Number(row.usage_count) || 0;
      }
    });

    // 合計回数を計算してソート
    Object.values(serviceMap).forEach(service => {
      service.total_count = service.female_count + service.male_count;
      genderTableData.push(service);
    });
    
    genderTableData.sort((a, b) => b.total_count - a.total_count);
  }

  // 性別合計(サマリーの actual_sales と同じ計算方法)
  const genderTotals = genderData.reduce((acc, item) => {
    if (item.gender === 'female') {
      acc.female += Number(item.total_revenue) || 0;
      acc.femaleCount += Number(item.usage_count) || 0;
    } else if (item.gender === 'male') {
      acc.male += Number(item.total_revenue) || 0;
      acc.maleCount += Number(item.usage_count) || 0;
    }
    return acc;
  }, { female: 0, male: 0, femaleCount: 0, maleCount: 0 });

  const totalGenderSales = genderTotals.female + genderTotals.male;

  return (
    <div className="service-analysis">
      {/* トップサービス */}
      {topService && (
        <div className="top-service-card">
          <div className="top-service-header">
            <Award size={32} />
            <h3>全期間人気No.1サービス</h3>
          </div>
          <div className="top-service-name">{topService.service_name}</div>
          <div className="top-service-category">{topService.category}</div>
          <div className="top-service-stats">
            <div className="stat-item">
              <div className="stat-label">総売上</div>
              <div className="stat-value">{formatCurrency(topService.total_revenue)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">購入回数</div>
              <div className="stat-value">{topService.purchase_count}回</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">平均単価</div>
              <div className="stat-value">{formatCurrency(topService.avg_price)}</div>
            </div>
          </div>
        </div>
      )}

      {/* サービス別売上ランキング(全体) */}
      <div className="analytics-card">
        <h3 className="analytics-card__title">
          <Briefcase size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          サービス別購入ランキング(全期間)
        </h3>
        
        <div className="service-table">
          {/* ヘッダー */}
          <div className="service-row service-row--header">
            <div className="service-cell service-cell--rank">順位</div>
            <div className="service-cell service-cell--name">サービス名</div>
            <div className="service-cell service-cell--category">カテゴリ</div>
            <div className="service-cell service-cell--number">購入回数</div>
            <div className="service-cell service-cell--number">売上</div>
            <div className="service-cell service-cell--number">平均単価</div>
          </div>
          
          {/* データ行 - 購入回数でソート */}
          {[...serviceData].sort((a, b) => (Number(b.purchase_count) || 0) - (Number(a.purchase_count) || 0)).slice(0, 10).map((service, index) => (
            <div key={index} className="service-row">
              <div className="service-cell service-cell--rank">
                <div className={`rank-badge rank-${index + 1}`}>
                  {index + 1}
                </div>
              </div>
              <div className="service-cell service-cell--name">
                <strong>{service.service_name}</strong>
                {index === 0 && <span className="medal">🥇</span>}
                {index === 1 && <span className="medal">🥈</span>}
                {index === 2 && <span className="medal">🥉</span>}
              </div>
              <div className="service-cell service-cell--category">{service.category}</div>
              <div className="service-cell service-cell--number">{service.purchase_count}回</div>
              <div className="service-cell service-cell--number">{formatCurrency(service.total_revenue)}</div>
              <div className="service-cell service-cell--number">
                {formatCurrency(service.avg_price)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 期間別サービスランキング */}
      {allPeriods.length > 0 && (
        <div className="analytics-card">
          <h3 className="analytics-card__title">
            <Briefcase size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
            {period === 'yearly' ? '年別' : '月別'}サービス購入ランキング
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
          
          {/* 選択された期間のランキング表 */}
          <div className="service-table" style={{ marginTop: '1rem' }}>
            {/* ヘッダー */}
            <div className="service-row service-row--header">
              <div className="service-cell service-cell--rank">順位</div>
              <div className="service-cell service-cell--name">サービス名</div>
              <div className="service-cell service-cell--category">カテゴリ</div>
              <div className="service-cell service-cell--number">購入回数</div>
              <div className="service-cell service-cell--number">売上</div>
              <div className="service-cell service-cell--number">平均単価</div>
            </div>
            
            {/* データ行 */}
            {periodServiceData.map((service, index) => (
              <div key={index} className="service-row">
                <div className="service-cell service-cell--rank">
                  <div className={`rank-badge rank-${index + 1}`}>
                    {index + 1}
                  </div>
                </div>
                <div className="service-cell service-cell--name">
                  <strong>{service.service_name}</strong>
                  {index === 0 && <span className="medal">🥇</span>}
                  {index === 1 && <span className="medal">🥈</span>}
                  {index === 2 && <span className="medal">🥉</span>}
                </div>
                <div className="service-cell service-cell--category">{service.category}</div>
                <div className="service-cell service-cell--number">{service.purchase_count}回</div>
                <div className="service-cell service-cell--number">{formatCurrency(service.total_revenue)}</div>
                <div className="service-cell service-cell--number">
                  {formatCurrency(service.avg_price)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 性別別サービス利用回数表 */}
      {genderTableData.length > 0 && (
        <div className="analytics-card">
          <h3 className="analytics-card__title">
            <Users size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
            性別別サービス利用回数
          </h3>
          
          {/* 性別サマリー */}
          {totalGenderSales > 0 && (
            <div className="gender-summary" style={{ marginBottom: '1.5rem' }}>
              <div className="gender-summary-row">
                <div className="gender-summary-item">
                  <span className="gender-label gender-label--female">👩 女性</span>
                  <span className="gender-value">
                    {genderTotals.femaleCount.toLocaleString()}
                    <span className="gender-unit">回</span>
                  </span>
                  <span className="gender-count">
                    売上: {formatCurrency(genderTotals.female)}
                  </span>
                </div>
                <div className="gender-summary-item">
                  <span className="gender-label gender-label--male">👨 男性</span>
                  <span className="gender-value">
                    {genderTotals.maleCount.toLocaleString()}
                    <span className="gender-unit">回</span>
                  </span>
                  <span className="gender-count">
                    売上: {formatCurrency(genderTotals.male)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 性別別利用回数表 */}
          <div className="service-table">
            {/* ヘッダー */}
            <div className="service-row service-row--header">
              <div className="service-cell service-cell--rank">順位</div>
              <div className="service-cell service-cell--name">サービス名</div>
              <div className="service-cell service-cell--category">カテゴリ</div>
              <div className="service-cell service-cell--number">女性</div>
              <div className="service-cell service-cell--number">男性</div>
              <div className="service-cell service-cell--number">合計</div>
            </div>
            
            {/* データ行 */}
            {genderTableData.map((service, index) => {
              const femalePercent = service.total_count > 0 
                ? ((service.female_count / service.total_count) * 100).toFixed(1) 
                : 0;
              const malePercent = service.total_count > 0 
                ? ((service.male_count / service.total_count) * 100).toFixed(1) 
                : 0;
              
              return (
                <div key={index} className="service-row">
                  <div className="service-cell service-cell--rank">
                    <div className={`rank-badge rank-${index + 1}`}>
                      {index + 1}
                    </div>
                  </div>
                  <div className="service-cell service-cell--name">
                    <strong>{service.service_name}</strong>
                  </div>
                  <div className="service-cell service-cell--category">{service.category}</div>
                  <div className="service-cell service-cell--number">
                    {service.female_count}回
                    <span className="percent-badge" style={{ color: '#ec4899' }}>
                      ({femalePercent}%)
                    </span>
                  </div>
                  <div className="service-cell service-cell--number">
                    {service.male_count}回
                    <span className="percent-badge" style={{ color: '#3b82f6' }}>
                      ({malePercent}%)
                    </span>
                  </div>
                  <div className="service-cell service-cell--number">
                    <strong>{service.total_count}回</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        .service-analysis {
          padding: 0;
        }

        .top-service-card {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          border-radius: 1rem;
          padding: 2rem;
          margin-bottom: 2rem;
          color: white;
        }

        .top-service-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .top-service-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .top-service-name {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .top-service-category {
          font-size: 1rem;
          opacity: 0.9;
          margin-bottom: 1.5rem;
        }

        .top-service-stats {
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
          margin-top: 0.25rem;
        }

        /* 期間タブ */
        .period-tabs {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
          padding: 0.5rem;
          background: #f9fafb;
          border-radius: 0.5rem;
        }

        .period-tab {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          background: white;
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .period-tab:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .period-tab--active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .period-tab--active:hover {
          background: #2563eb;
          border-color: #2563eb;
        }

        .gender-summary {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 8px;
        }
        
        .gender-summary-row {
          display: flex;
          gap: 2rem;
          justify-content: center;
        }
        
        .gender-summary-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        
        .gender-label {
          font-size: 1rem;
          font-weight: 600;
        }
        
        .gender-label--female {
          color: #ec4899;
        }
        
        .gender-label--male {
          color: #3b82f6;
        }
        
        .gender-value {
          font-size: 1.5rem;
          font-weight: 700;
        }
        
        .gender-count {
          font-size: 0.875rem;
          color: #9ca3af;
        }

        .service-table {
          display: flex;
          flex-direction: column;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .service-row {
          display: grid;
          grid-template-columns: 60px 2fr 1fr 1fr 1fr 1fr;
          border-bottom: 1px solid #f3f4f6;
          transition: background 0.15s;
        }

        .service-row:last-child {
          border-bottom: none;
        }

        .service-row:not(.service-row--header):hover {
          background: #f9fafb;
        }

        .service-row--header {
          background: #f9fafb;
          font-weight: 600;
        }

        .service-cell {
          padding: 0.875rem 1rem;
          display: flex;
          align-items: center;
          font-size: 0.9375rem;
          color: #1f2937;
          border-right: 1px solid #f3f4f6;
        }

        .service-cell:last-child {
          border-right: none;
        }

        .service-cell--rank {
          justify-content: center;
        }

        .service-cell--name {
          justify-content: flex-start;
          gap: 0.5rem;
        }

        .service-cell--category {
          justify-content: flex-start;
        }

        .service-cell--number {
          justify-content: flex-end;
          font-variant-numeric: tabular-nums;
        }

        .rank-badge {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
        }

        .rank-1 {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: white;
        }

        .rank-2 {
          background: linear-gradient(135deg, #d1d5db, #9ca3af);
          color: white;
        }

        .rank-3 {
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: white;
        }

        .rank-badge:not(.rank-1):not(.rank-2):not(.rank-3) {
          background: #f3f4f6;
          color: #6b7280;
        }

        .medal {
          font-size: 1.25rem;
        }
        
        .percent-badge {
          font-size: 0.75rem;
          margin-left: 0.25rem;
          font-weight: 400;
        }
        
        .gender-unit {
          font-size: 1rem;
          font-weight: 400;
          margin-left: 0.25rem;
        }

        .no-data-message {
          color: #6b7280;
          text-align: center;
          padding: 2rem;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default ServiceAnalysis;