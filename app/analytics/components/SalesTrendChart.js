// app/analytics/components/SalesTrendChart.js
"use client";
import React from 'react';
import { TrendingUp, DollarSign, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SalesTrendChart = ({ data, period }) => {
  // 月選択（月別表示の時のみ使用）
  const [selectedMonthForTotal, setSelectedMonthForTotal] = React.useState(null);
  
  function formatCurrency(amount) {
    return `¥${Math.round(amount || 0).toLocaleString()}`;
  }

  // データ構造チェック
  const salesData = data?.salesData || data || [];

  if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
    return (
      <div className="sales-trend">
        <p className="no-data-message">データがありません</p>
      </div>
    );
  }

  // 合計値計算
  const totals = salesData.reduce((acc, item) => ({
    transactions: acc.transactions + (Number(item.transaction_count) || 0),
    idealSales: acc.idealSales + (Number(item.ideal_sales) || 0),
    actualSales: acc.actualSales + (Number(item.actual_sales) || 0),
    customers: acc.customers + (Number(item.unique_customers) || 0)
  }), { transactions: 0, idealSales: 0, actualSales: 0, customers: 0 });

  // 利用可能な月のリストを取得（月別表示用）
  const availableMonths = React.useMemo(() => {
    const months = new Set();
    salesData.forEach(row => {
      if (!row.period) return;
      const parts = row.period.split('-');
      if (parts.length >= 2) {
        months.add(`${parts[0]}-${parts[1]}`);
      }
    });
    const sorted = Array.from(months).sort().reverse();
    if (!selectedMonthForTotal && sorted.length > 0) {
      setSelectedMonthForTotal(sorted[0]);
    }
    return sorted;
  }, [salesData]);

  // フィルタリングされたデータ
  const filteredSalesData = React.useMemo(() => {
    if (period === 'monthly') return salesData; // 月別は全データ
    // 日別: 選択された月のデータのみ
    if (!selectedMonthForTotal) return salesData;
    return salesData.filter(row => {
      if (!row.period) return false;
      const parts = row.period.split('-');
      if (parts.length >= 2) {
        return `${parts[0]}-${parts[1]}` === selectedMonthForTotal;
      }
      return false;
    });
  }, [salesData, selectedMonthForTotal, period]);

  // 選択期間の合計
  const selectedTotals = React.useMemo(() => {
    return filteredSalesData.reduce((acc, item) => ({
      transactions: acc.transactions + (Number(item.transaction_count) || 0),
      idealSales: acc.idealSales + (Number(item.ideal_sales) || 0),
      actualSales: acc.actualSales + (Number(item.actual_sales) || 0),
      customers: acc.customers + (Number(item.unique_customers) || 0)
    }), { transactions: 0, idealSales: 0, actualSales: 0, customers: 0 });
  }, [filteredSalesData]);

  // グラフ用データ整形
  let chartData = [];
  let lines = [];
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (period === 'daily') {
    // 日別: 横軸=日(1-31)、凡例=月
    const dailyData = {};
    const months = new Set();

    filteredSalesData.forEach(row => {
      if (!row.period) return;
      const parts = row.period.split('-');
      if (parts.length !== 3) return;
      
      const monthKey = `${parts[0]}-${parts[1]}`;
      const day = parseInt(parts[2]);
      
      months.add(monthKey);
      
      if (!dailyData[day]) {
        dailyData[day] = { label: `${day}日` };
      }
      dailyData[day][monthKey] = Number(row.ideal_sales) || 0;
      dailyData[day][`transactions_${monthKey}`] = Number(row.transaction_count) || 0;
      dailyData[day][`customers_${monthKey}`] = Number(row.unique_customers) || 0;
    });

    for (let i = 1; i <= 31; i++) {
      chartData.push(dailyData[i] || { label: `${i}日` });
    }

    Array.from(months).sort().forEach((month, index) => {
      const [year, mon] = month.split('-');
      lines.push({ key: month, label: `${year}年${parseInt(mon)}月`, color: colors[index % colors.length] });
    });

  } else {
    // 月別: 横軸=月(1-12)、凡例=年
    const monthlyData = {};
    const years = new Set();

    salesData.forEach(row => {
      if (!row.period || typeof row.period !== 'string') return;
      const parts = row.period.split('-');
      if (parts.length < 2) return;
      
      const [year, month] = parts;
      years.add(year);
      const monthNum = parseInt(month);
      
      if (!monthlyData[monthNum]) {
        monthlyData[monthNum] = { label: `${monthNum}月` };
      }
      monthlyData[monthNum][year] = Number(row.ideal_sales) || 0;
      monthlyData[monthNum][`transactions_${year}`] = Number(row.transaction_count) || 0;
      monthlyData[monthNum][`customers_${year}`] = Number(row.unique_customers) || 0;
    });

    for (let i = 1; i <= 12; i++) {
      chartData.push(monthlyData[i] || { label: `${i}月` });
    }

    Array.from(years).sort().forEach((year, index) => {
      lines.push({ key: year, label: `${year}年`, color: colors[index % colors.length] });
    });
  }

  // 取引数・顧客数グラフ用の線定義
  const transactionColors = ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6', '#ec4899'];
  const customerColors = ['#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#64748b'];

  let transactionLines = [];
  let customerLines = [];

  if (period === 'daily') {
    // 日別: 凡例=月
    transactionLines = lines.map((line, i) => ({ key: `transactions_${line.key}`, label: line.label, color: transactionColors[i % transactionColors.length] }));
    customerLines = lines.map((line, i) => ({ key: `customers_${line.key}`, label: line.label, color: customerColors[i % customerColors.length] }));
  } else {
    // 月別: 凡例=年
    const years = lines.map(l => l.key);
    transactionLines = years.map((year, i) => ({ key: `transactions_${year}`, label: `${year}年`, color: transactionColors[i % transactionColors.length] }));
    customerLines = years.map((year, i) => ({ key: `customers_${year}`, label: `${year}年`, color: customerColors[i % customerColors.length] }));
  }

  // ツールチップ
  const SalesTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'white', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#111827' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '4px 0', color: entry.color, fontSize: '14px' }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const TransactionTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'white', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#111827' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '4px 0', color: entry.color, fontSize: '14px' }}>
              {entry.name}: {entry.value}件
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomerTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'white', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#111827' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '4px 0', color: entry.color, fontSize: '14px' }}>
              {entry.name}: {entry.value}人
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // 表示する期間のラベル
  const periodLabel = period === 'daily' ? '日別' : '月別';
  const displayTotals = period === 'daily' ? selectedTotals : totals;

  return (
    <div className="sales-trend">
      {/* サマリーメトリクス */}
      <div className="analytics-metrics">
        <div className="analytics-metric">
          <span className="analytics-metric__label">
            <DollarSign size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
            {periodLabel}理想売上
          </span>
          <span className="analytics-metric__value">{formatCurrency(displayTotals.idealSales)}</span>
        </div>

        <div className="analytics-metric">
          <span className="analytics-metric__label">{periodLabel}現状売上</span>
          <span className="analytics-metric__value">{formatCurrency(displayTotals.actualSales)}</span>
        </div>

        <div className="analytics-metric">
          <span className="analytics-metric__label">差額</span>
          <span className="analytics-metric__value" style={{ 
            color: (displayTotals.idealSales - displayTotals.actualSales) > 0 ? '#ef4444' : '#10b981' 
          }}>
            {formatCurrency(displayTotals.idealSales - displayTotals.actualSales)}
          </span>
        </div>

        <div className="analytics-metric">
          <span className="analytics-metric__label">{periodLabel}取引数</span>
          <span className="analytics-metric__value">
            {displayTotals.transactions.toLocaleString()}
            <span className="analytics-metric__unit">件</span>
          </span>
        </div>

        <div className="analytics-metric">
          <span className="analytics-metric__label">
            <Users size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
            ユニーク顧客数
          </span>
          <span className="analytics-metric__value">
            {displayTotals.customers}
            <span className="analytics-metric__unit">人</span>
          </span>
        </div>
      </div>

      {/* 月選択（日別表示の時のみ） */}
      {period === 'daily' && availableMonths.length > 0 && (
        <div className="analytics-card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: '#6b7280' }}>表示月:</label>
            <select
              value={selectedMonthForTotal || ''}
              onChange={(e) => setSelectedMonthForTotal(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
                backgroundColor: 'white'
              }}
            >
              {availableMonths.map(month => {
                const [year, mon] = month.split('-');
                return (
                  <option key={month} value={month}>
                    {year}年{parseInt(mon)}月
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      {/* 売上推移グラフ */}
      <div className="analytics-card">
        <h3 className="analytics-card__title">
          <TrendingUp size={20} style={{ display: 'inline', marginRight: '0.25rem' }} />
          売上金額推移
        </h3>
        <div style={{ width: '100%', height: '400px', marginTop: '1rem' }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#e5e7eb" />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#e5e7eb" tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`} />
              <Tooltip content={<SalesTooltip />} />
              <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} iconType="line" />
              {lines.map((line) => (
                <Line key={line.key} type="monotone" dataKey={line.key} name={line.label} stroke={line.color} strokeWidth={2} dot={{ fill: line.color, r: 4 }} activeDot={{ r: 6 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* 取引数推移グラフ */}
      <div className="analytics-card">
        <h3 className="analytics-card__title">
          <TrendingUp size={20} style={{ display: 'inline', marginRight: '0.25rem' }} />
          取引数推移
        </h3>
        <div style={{ width: '100%', height: '350px' }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#e5e7eb" />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#e5e7eb" tickFormatter={(value) => `${value}件`} />
              <Tooltip content={<TransactionTooltip />} />
              <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} iconType="line" />
              {transactionLines.map((line) => (
                <Line key={line.key} type="monotone" dataKey={line.key} name={line.label} stroke={line.color} strokeWidth={2} dot={{ fill: line.color, r: 4 }} activeDot={{ r: 6 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 顧客数推移グラフ */}
      <div className="analytics-card">
        <h3 className="analytics-card__title">
          <Users size={20} style={{ display: 'inline', marginRight: '0.25rem' }} />
          ユニーク顧客推移
        </h3>
        <div style={{ width: '100%', height: '350px' }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#e5e7eb" />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#e5e7eb" tickFormatter={(value) => `${value}人`} />
              <Tooltip content={<CustomerTooltip />} />
              <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} iconType="line" />
              {customerLines.map((line) => (
                <Line key={line.key} type="monotone" dataKey={line.key} name={line.label} stroke={line.color} strokeWidth={2} dot={{ fill: line.color, r: 4 }} activeDot={{ r: 6 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* データテーブル */}
      <div className="analytics-card">
        <h3 className="analytics-card__title">
          <TrendingUp size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          {periodLabel}売上データ
        </h3>
        {filteredSalesData.length > 0 ? (
          <div className="sales-trend-table">
            <div className="sales-trend-row sales-trend-row--header">
              <div className="sales-trend-cell sales-trend-cell--period">期間</div>
              <div className="sales-trend-cell sales-trend-cell--number">取引数</div>
              <div className="sales-trend-cell sales-trend-cell--number">理想売上</div>
              <div className="sales-trend-cell sales-trend-cell--number">現状売上</div>
              <div className="sales-trend-cell sales-trend-cell--number">現金</div>
              <div className="sales-trend-cell sales-trend-cell--number">カード</div>
              <div className="sales-trend-cell sales-trend-cell--number">顧客数</div>
            </div>
            
            {filteredSalesData.map((row, index) => (
              <div key={index} className="sales-trend-row">
                <div className="sales-trend-cell sales-trend-cell--period">
                  <strong>{row.period}</strong>
                </div>
                <div className="sales-trend-cell sales-trend-cell--number">{row.transaction_count}件</div>
                <div className="sales-trend-cell sales-trend-cell--number">{formatCurrency(row.ideal_sales)}</div>
                <div className="sales-trend-cell sales-trend-cell--number">{formatCurrency(row.actual_sales)}</div>
                <div className="sales-trend-cell sales-trend-cell--number">{formatCurrency(row.cash_sales)}</div>
                <div className="sales-trend-cell sales-trend-cell--number">{formatCurrency(row.card_sales)}</div>
                <div className="sales-trend-cell sales-trend-cell--number">{row.unique_customers}人</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-data-message">データがありません</p>
        )}
      </div>

      <style jsx>{`
        .sales-trend-table {
          display: flex;
          flex-direction: column;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        
        .sales-trend-row {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr 1fr 1fr 0.8fr 0.8fr 0.7fr;
          border-bottom: 1px solid #f3f4f6;
          transition: background 0.15s;
        }
        
        .sales-trend-row:last-child {
          border-bottom: none;
        }
        
        .sales-trend-row:not(.sales-trend-row--header):hover {
          background: #f9fafb;
        }
        
        .sales-trend-row--header {
          background: #f9fafb;
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        
        .sales-trend-cell {
          padding: 0.875rem 1rem;
          display: flex;
          align-items: center;
          font-size: 0.9375rem;
          color: #1f2937;
          border-right: 1px solid #f3f4f6;
        }
        
        .sales-trend-cell:last-child {
          border-right: none;
        }
        
        .sales-trend-row--header .sales-trend-cell {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }
        
        .sales-trend-cell--period {
          justify-content: flex-start;
        }
        
        .sales-trend-cell--number {
          justify-content: flex-end;
          font-variant-numeric: tabular-nums;
        }
        
        .no-data-message {
          color: #6b7280;
          text-align: center;
          padding: 2rem;
          margin: 0;
        }

        @media (max-width: 1200px) {
          .sales-trend-row {
            grid-template-columns: 1fr 0.7fr 0.9fr 0.9fr 0.7fr 0.7fr 0.6fr;
          }

          .sales-trend-cell {
            padding: 0.75rem 0.5rem;
            font-size: 0.875rem;
          }
        }

        @media (max-width: 768px) {
          .sales-trend-table {
            overflow-x: auto;
          }

          .sales-trend-row {
            min-width: 700px;
          }
        }
      `}</style>
    </div>
  );
};

export default SalesTrendChart;