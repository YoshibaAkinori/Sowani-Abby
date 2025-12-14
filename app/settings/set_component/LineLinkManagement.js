// app/settings/set_component/LineLinkManagement.js
'use client';

import { useState, useEffect } from 'react';
import { Link2, UserPlus, Search, Check, X, RefreshCw, MessageCircle, UserCheck, Clock } from 'lucide-react';
import './LineLinkManagement.css';

export default function LineLinkManagement() {
  const [pendingLinks, setPendingLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPending, setSelectedPending] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 連携待ち一覧取得
  const fetchPendingLinks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/line/pending');
      const result = await response.json();
      if (result.success) {
        setPendingLinks(result.data);
      }
    } catch (err) {
      console.error('取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingLinks();
  }, []);

  // 顧客検索
  const searchCustomers = async () => {
    if (!customerSearch.trim()) return;
    
    setSearching(true);
    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(customerSearch)}`);
      const result = await response.json();
      if (result.success) {
        // LINE未連携の顧客のみ表示
        const unlinked = result.data.filter(c => !c.line_user_id);
        setSearchResults(unlinked);
      }
    } catch (err) {
      console.error('検索エラー:', err);
    } finally {
      setSearching(false);
    }
  };

  // 連携実行
  const linkCustomer = async (customerId, customerName) => {
    if (!selectedPending) return;
    
    setLinking(true);
    try {
      const response = await fetch('/api/line/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pendingId: selectedPending.id,
          customerId: customerId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage({ type: 'success', text: `${customerName} さんとLINE連携しました` });
        setSelectedPending(null);
        setCustomerSearch('');
        setSearchResults([]);
        fetchPendingLinks();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '連携に失敗しました' });
    } finally {
      setLinking(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // 連携待ちを削除
  const deletePending = async (id) => {
    if (!confirm('この連携待ちを削除しますか？')) return;
    
    try {
      const response = await fetch(`/api/line/pending?id=${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchPendingLinks();
      }
    } catch (err) {
      console.error('削除エラー:', err);
    }
  };

  // 日時フォーマット
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="line-link-container">
      {/* ヘッダー */}
      <div className="line-link-header">
        <div className="header-left">
          <h3><Link2 size={20} /> LINE連携待ち</h3>
          <span className="pending-count">{pendingLinks.length}件</span>
        </div>
        <button className="refresh-btn" onClick={fetchPendingLinks} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          更新
        </button>
      </div>

      {/* 使い方ガイド */}
      <div className="usage-guide">
        <h4>📱 LINE連携の手順</h4>
        <ol>
          <li>お客様にLINE公式アカウントを友だち追加してもらう</li>
          <li>LINEで「連携」などメッセージを送ってもらう</li>
          <li>下の一覧に表示されたら、顧客を検索して紐付け</li>
        </ol>
      </div>

      {/* メッセージ */}
      {message.text && (
        <div className={`message-banner ${message.type}`}>
          {message.type === 'success' ? <Check size={16} /> : <X size={16} />}
          {message.text}
        </div>
      )}

      {/* 連携待ち一覧 */}
      {loading ? (
        <div className="loading-state">読み込み中...</div>
      ) : pendingLinks.length === 0 ? (
        <div className="empty-state">
          <UserPlus size={48} />
          <p>連携待ちのLINEユーザーはいません</p>
          <span>友だち追加やメッセージ受信があると、ここに表示されます</span>
        </div>
      ) : (
        <div className="pending-list">
          {pendingLinks.map(item => (
            <div 
              key={item.id} 
              className={`pending-item ${selectedPending?.id === item.id ? 'selected' : ''}`}
            >
              <div className="pending-main" onClick={() => setSelectedPending(
                selectedPending?.id === item.id ? null : item
              )}>
                <div className="pending-avatar">
                  {item.profile_image_url ? (
                    <img src={item.profile_image_url} alt="" />
                  ) : (
                    <div className="avatar-placeholder">
                      {item.display_name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <div className="pending-info">
                  <div className="pending-name">{item.display_name || '名前なし'}</div>
                  <div className="pending-meta">
                    {item.event_type === 'follow' ? (
                      <span className="event-badge follow"><UserCheck size={12} /> 友だち追加</span>
                    ) : (
                      <span className="event-badge message"><MessageCircle size={12} /> メッセージ</span>
                    )}
                    <span className="pending-time"><Clock size={12} /> {formatDateTime(item.received_at)}</span>
                  </div>
                  {item.message_text && (
                    <div className="pending-message">「{item.message_text}」</div>
                  )}
                </div>
                <button 
                  className="delete-btn"
                  onClick={(e) => { e.stopPropagation(); deletePending(item.id); }}
                  title="削除"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 選択時: 顧客検索エリア */}
              {selectedPending?.id === item.id && (
                <div className="link-panel">
                  <div className="search-area">
                    <input
                      type="text"
                      placeholder="顧客名または電話番号で検索..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchCustomers()}
                    />
                    <button onClick={searchCustomers} disabled={searching}>
                      <Search size={16} />
                      {searching ? '検索中...' : '検索'}
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="search-results">
                      {searchResults.map(customer => (
                        <div key={customer.customer_id} className="customer-result">
                          <div className="customer-info">
                            <span className="customer-name">
                              {customer.last_name} {customer.first_name}
                            </span>
                            <span className="customer-phone">{customer.phone_number}</span>
                          </div>
                          <button 
                            className="link-btn"
                            onClick={() => linkCustomer(
                              customer.customer_id, 
                              `${customer.last_name} ${customer.first_name}`
                            )}
                            disabled={linking}
                          >
                            <Link2 size={14} />
                            {linking ? '連携中...' : '連携'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {customerSearch && searchResults.length === 0 && !searching && (
                    <div className="no-results">
                      該当する顧客が見つかりません（LINE未連携の顧客のみ表示）
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}