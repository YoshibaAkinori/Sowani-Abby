// app/components/TicketGroupList.js
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, CreditCard, Gift } from 'lucide-react';
import './TicketGroupList.css';

export default function TicketGroupList({ tickets }) {
  const [expandedGroups, setExpandedGroups] = useState({});

  // プラン名でグループ化
  const groupedTickets = tickets.reduce((acc, ticket) => {
    const planName = ticket.plan_name;
    if (!acc[planName]) {
      acc[planName] = [];
    }
    acc[planName].push(ticket);
    return acc;
  }, {});

  // 各グループ内でソート（有効なもの優先、購入日新しい順）
  Object.keys(groupedTickets).forEach(planName => {
    groupedTickets[planName].sort((a, b) => {
      // 有効（残り > 0）を優先
      const aActive = a.sessions_remaining > 0 ? 1 : 0;
      const bActive = b.sessions_remaining > 0 ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      // 購入日の新しい順
      return new Date(b.purchase_date) - new Date(a.purchase_date);
    });
  });

  // グループを有効な回数券があるものを上に
  const sortedGroupNames = Object.keys(groupedTickets).sort((a, b) => {
    const aHasActive = groupedTickets[a].some(t => t.sessions_remaining > 0);
    const bHasActive = groupedTickets[b].some(t => t.sessions_remaining > 0);
    if (aHasActive !== bHasActive) return bHasActive ? 1 : -1;
    // 最新の購入日順
    const aLatest = new Date(groupedTickets[a][0].purchase_date);
    const bLatest = new Date(groupedTickets[b][0].purchase_date);
    return bLatest - aLatest;
  });

  const toggleGroup = (planName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [planName]: !prev[planName]
    }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP');
  };

  if (tickets.length === 0) {
    return (
      <div className="ticket-group-empty">
        <CreditCard size={48} />
        <p>保有している回数券はありません</p>
      </div>
    );
  }

  return (
    <div className="ticket-group-list">
      {sortedGroupNames.map(planName => {
        const groupTickets = groupedTickets[planName];
        const activeTickets = groupTickets.filter(t => t.sessions_remaining > 0);
        const pastTickets = groupTickets.filter(t => t.sessions_remaining === 0);
        const currentTicket = activeTickets[0] || pastTickets[0];
        const isExpanded = expandedGroups[planName];
        const hasActiveTicket = activeTickets.length > 0;
        const isLimited = currentTicket?.is_limited;

        return (
          <div key={planName} className={`ticket-group ${isLimited ? 'ticket-group--limited' : ''}`}>
            {/* 現在の回数券（最新の有効なもの） */}
            <div className={`ticket-group__current ${hasActiveTicket ? 'ticket-group__current--active' : 'ticket-group__current--inactive'} ${isLimited ? 'ticket-group__current--limited' : ''}`}>
              <div className="ticket-group__header">
                <div className="ticket-group__title">
                  {isLimited && <Gift size={18} className="ticket-group__limited-icon" />}
                  <h3>{planName}</h3>
                  {isLimited && (
                    <span className="ticket-group__badge ticket-group__badge--limited">
                      期間限定
                    </span>
                  )}
                  <span className={`ticket-group__badge ${hasActiveTicket ? 'ticket-group__badge--active' : 'ticket-group__badge--used'}`}>
                    {hasActiveTicket ? '有効' : '使用済'}
                  </span>
                </div>
                <div className="ticket-group__remaining">
                  残り <strong>{currentTicket.sessions_remaining}</strong> / {currentTicket.total_sessions} 回
                </div>
              </div>

              <div className="ticket-group__details">
                <span>購入日: {formatDate(currentTicket.purchase_date)}</span>
                <span>期限: {formatDate(currentTicket.expiry_date)}</span>
                <span>¥{currentTicket.purchase_price?.toLocaleString()}</span>
                {currentTicket.remaining_payment > 0 ? (
                  <span className="ticket-group__unpaid">
                    残金: ¥{currentTicket.remaining_payment.toLocaleString()}
                  </span>
                ) : (
                  <span className="ticket-group__paid">支払済</span>
                )}
              </div>
            </div>

            {/* 過去の回数券（折りたたみ） */}
            {pastTickets.length > 0 && (
              <div className="ticket-group__past">
                <button 
                  className="ticket-group__toggle"
                  onClick={() => toggleGroup(planName)}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  過去の回数券（{pastTickets.length}件）
                </button>

                {isExpanded && (
                  <div className="ticket-group__past-list">
                    {pastTickets.map(ticket => (
                      <div key={ticket.customer_ticket_id} className="ticket-group__past-item">
                        <div className="ticket-group__past-info">
                          <span className="ticket-group__past-status">
                            {ticket.status === 'used_up' ? '使用済' : '期限切れ'}
                          </span>
                          {ticket.is_limited && (
                            <span className="ticket-group__past-limited">期間限定</span>
                          )}
                          <span>購入: {formatDate(ticket.purchase_date)}</span>
                          <span>期限: {formatDate(ticket.expiry_date)}</span>
                          <span>¥{ticket.purchase_price?.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 有効な回数券が複数ある場合 */}
            {activeTickets.length > 1 && (
              <div className="ticket-group__others">
                <div className="ticket-group__others-label">
                  他にも有効な回数券があります（{activeTickets.length - 1}件）
                </div>
                {activeTickets.slice(1).map(ticket => (
                  <div key={ticket.customer_ticket_id} className="ticket-group__other-item">
                    <div className="ticket-group__other-remaining">
                      {ticket.is_limited && <Gift size={14} style={{ marginRight: '0.25rem', color: '#810af0' }} />}
                      残り {ticket.sessions_remaining} / {ticket.total_sessions} 回
                      {ticket.is_limited && <span style={{ color: '#810af0', marginLeft: '0.5rem', fontSize: '0.75rem' }}>期間限定</span>}
                    </div>
                    <div className="ticket-group__other-details">
                      <span>購入: {formatDate(ticket.purchase_date)}</span>
                      <span>期限: {formatDate(ticket.expiry_date)}</span>
                      {ticket.remaining_payment > 0 && (
                        <span className="ticket-group__unpaid">
                          残金: ¥{ticket.remaining_payment.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}