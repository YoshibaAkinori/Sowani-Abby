"use client";
import React, { useState, useEffect } from 'react';
import { Send, Search, Users, Calendar, Ticket, UserX, Cake } from 'lucide-react';
import './LineMarketing.css';

export default function LineMarketing() {
  const [activeTab, setActiveTab] = useState('last_visit');
  const [days, setDays] = useState(30);
  const [targets, setTargets] = useState([]);
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ lineConnected: 0, totalCustomers: 0 });

  // 統計情報を取得
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/marketing');
      const data = await res.json();
      if (data.success) {
        setStats({
          lineConnected: data.lineConnected || 0,
          totalCustomers: data.totalCustomers || 0
        });
      }
    } catch (error) {
      console.error('統計取得エラー:', error);
    }
  };

  // ターゲット検索
  const searchTargets = async () => {
    setLoading(true);
    setTargets([]);
    setSelectedTargets([]);
    try {
      const res = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          criteria: { type: activeTab, days: days }
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTargets(data.data || []);
        // LINE連携済みユーザーのみ選択対象に
        const lineUsers = (data.data || []).filter(u => u.line_user_id);
        setSelectedTargets(lineUsers.map(u => u.line_user_id));
      } else {
        alert('検索エラー: ' + (data.error || '不明なエラー'));
      }
    } catch (error) {
      alert('検索に失敗しました');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 送信実行
  const sendMessage = async () => {
    if (selectedTargets.length === 0) {
      alert('送信対象を選択してください');
      return;
    }
    if (!message.trim()) {
      alert('メッセージを入力してください');
      return;
    }
    if (!confirm(`${selectedTargets.length}人にメッセージを送信しますか？`)) return;
    
    setSending(true);
    try {
      const res = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          targetUserIds: selectedTargets,
          message: message
        }),
      });
      
      const result = await res.json();
      if (result.success) {
        alert(`送信完了！\n成功: ${result.count}件${result.errorCount > 0 ? `\nエラー: ${result.errorCount}件` : ''}`);
        setMessage('');
        setTargets([]);
        setSelectedTargets([]);
      } else {
        alert('送信エラー: ' + (result.error || '不明なエラー'));
      }
    } catch (error) {
      console.error(error);
      alert('送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  // チェックボックスの制御
  const toggleSelect = (lineId) => {
    if (!lineId) return;
    if (selectedTargets.includes(lineId)) {
      setSelectedTargets(selectedTargets.filter(id => id !== lineId));
    } else {
      setSelectedTargets([...selectedTargets, lineId]);
    }
  };

  // 全選択/全解除
  const toggleSelectAll = () => {
    const lineUsers = targets.filter(u => u.line_user_id);
    if (selectedTargets.length === lineUsers.length) {
      setSelectedTargets([]);
    } else {
      setSelectedTargets(lineUsers.map(u => u.line_user_id));
    }
  };

  // 日付フォーマット
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP');
  };

  // タブ設定
  const tabs = [
    { id: 'last_visit', label: 'ご無沙汰客', icon: Calendar, description: '最終来店から一定期間経過' },
    { id: 'ticket_expiry', label: '期限間近', icon: Ticket, description: '回数券の有効期限が近い' },
    { id: 'birthday', label: '誕生月', icon: Cake, description: '今月が誕生日のお客様' },
    { id: 'no_line', label: 'LINE未連携', icon: UserX, description: 'LINE未連携（リスト表示のみ）' },
  ];

  return (
    <div className="line-marketing-container">
      <div className="line-marketing-header">
        <h2><Send size={24} /> LINEマーケティング配信</h2>
        <div className="stats-bar">
          <span><Users size={16} /> LINE連携: {stats.lineConnected}名 / 全顧客: {stats.totalCustomers}名</span>
        </div>
      </div>
      
      {/* 条件設定エリア */}
      <div className="search-condition-card">
        <div className="tabs">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              className={activeTab === tab.id ? 'active' : ''} 
              onClick={() => { setActiveTab(tab.id); setTargets([]); setSelectedTargets([]); }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="condition-input">
          {activeTab === 'last_visit' && (
            <p>最終来店から <input type="number" value={days} onChange={e => setDays(Number(e.target.value))} min="1" /> 日以上経過したお客様</p>
          )}
          {activeTab === 'ticket_expiry' && (
            <p>回数券の有効期限が <input type="number" value={days} onChange={e => setDays(Number(e.target.value))} min="1" /> 日以内のお客様</p>
          )}
          {activeTab === 'birthday' && (
            <p>今月が誕生日のお客様を検索します</p>
          )}
          {activeTab === 'no_line' && (
            <p>LINE未連携のお客様一覧（メッセージ送信不可）</p>
          )}
          <button className="search-btn" onClick={searchTargets} disabled={loading}>
            <Search size={16} />
            {loading ? '検索中...' : '対象を検索'}
          </button>
        </div>
      </div>

      {/* 検索結果 & 送信エリア */}
      {targets.length > 0 && (
        <div className="result-area">
          <div className="result-header">
            <h3>検索結果: {targets.length}名</h3>
            {activeTab !== 'no_line' && (
              <span className="selected-count">
                （LINE送信可能: {targets.filter(u => u.line_user_id).length}名 / 選択中: {selectedTargets.length}名）
              </span>
            )}
          </div>
          
          <div className="user-list">
            <table>
              <thead>
                <tr>
                  {activeTab !== 'no_line' && (
                    <th>
                      <input 
                        type="checkbox" 
                        checked={selectedTargets.length === targets.filter(u => u.line_user_id).length && selectedTargets.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th>名前</th>
                  <th>電話番号</th>
                  {activeTab === 'last_visit' && <th>最終来店日</th>}
                  {activeTab === 'ticket_expiry' && (
                    <>
                      <th>回数券</th>
                      <th>有効期限</th>
                      <th>残り</th>
                    </>
                  )}
                  {activeTab === 'birthday' && <th>誕生日</th>}
                  {activeTab === 'no_line' && <th>メール</th>}
                  {activeTab !== 'no_line' && <th>LINE</th>}
                </tr>
              </thead>
              <tbody>
                {targets.map(user => (
                  <tr key={user.id + (user.expiry_date || '')}>
                    {activeTab !== 'no_line' && (
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedTargets.includes(user.line_user_id)}
                          onChange={() => toggleSelect(user.line_user_id)}
                          disabled={!user.line_user_id}
                        />
                      </td>
                    )}
                    <td>{user.name}</td>
                    <td>{user.phone_number || '-'}</td>
                    {activeTab === 'last_visit' && <td>{formatDate(user.last_visit)}</td>}
                    {activeTab === 'ticket_expiry' && (
                      <>
                        <td>{user.ticket_name}</td>
                        <td className={new Date(user.expiry_date) < new Date(Date.now() + 7*24*60*60*1000) ? 'expiry-warning' : ''}>
                          {formatDate(user.expiry_date)}
                        </td>
                        <td>{user.sessions_remaining}回</td>
                      </>
                    )}
                    {activeTab === 'birthday' && <td>{formatDate(user.birth_date)}</td>}
                    {activeTab === 'no_line' && <td>{user.email || '-'}</td>}
                    {activeTab !== 'no_line' && (
                      <td>
                        {user.line_user_id ? (
                          <span className="line-badge connected">連携済</span>
                        ) : (
                          <span className="line-badge not-connected">未連携</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {activeTab !== 'no_line' && selectedTargets.length > 0 && (
            <div className="message-area">
              <h3>配信メッセージ</h3>
              <textarea 
                rows="5" 
                placeholder={"ここにメッセージを入力\n\n例：\nいつもご利用ありがとうございます！\n今月限定のお得なクーポンをプレゼント🎁"}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
              />
              <div className="message-footer">
                <span className="char-count">{message.length} / 2000文字</span>
                <button 
                  className="send-btn" 
                  onClick={sendMessage} 
                  disabled={sending || !message.trim() || selectedTargets.length === 0}
                >
                  <Send size={18} />
                  {sending ? '送信中...' : `LINE送信 (${selectedTargets.length}名)`}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'no_line' && (
            <div className="info-box">
              <p>※ LINE未連携のお客様には直接メッセージを送信できません。</p>
              <p>　 来店時にLINE友だち追加をご案内ください。</p>
            </div>
          )}
        </div>
      )}

      {targets.length === 0 && !loading && (
        <div className="empty-state">
          <p>条件を選択して「対象を検索」をクリックしてください</p>
        </div>
      )}
    </div>
  );
}