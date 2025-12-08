// app/settings/set_component/PrinterSettings.js
'use client';

import { useState, useEffect } from 'react';
import { Printer, Wifi, Monitor, Save, TestTube, Check, AlertCircle } from 'lucide-react';
import './PrinterSettings.css';

export default function PrinterSettings() {
  const [config, setConfig] = useState({
    printer_type: 'browser',
    printer_ip: '',
    printer_port: 9100,
    shop_name: '',
    shop_message: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 設定読み込み
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/settings/printer');
      const result = await response.json();
      if (result.success) {
        setConfig({
          printer_type: result.data.printer_type || 'browser',
          printer_ip: result.data.printer_ip || '',
          printer_port: result.data.printer_port || 9100,
          shop_name: result.data.shop_name || '',
          shop_message: result.data.shop_message || ''
        });
      }
    } catch (err) {
      console.error('設定読み込みエラー:', err);
    } finally {
      setLoading(false);
    }
  };

  // 設定保存
  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/settings/printer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: '設定を保存しました' });
      } else {
        setMessage({ type: 'error', text: result.error || '保存に失敗しました' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '通信エラーが発生しました' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // 接続テスト
  const handleTestConnection = async () => {
    if (!config.printer_ip) {
      setMessage({ type: 'error', text: 'IPアドレスを入力してください' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    setTesting(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/settings/printer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printer_ip: config.printer_ip,
          printer_port: config.printer_port
        })
      });
      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '接続テストに失敗しました' });
    } finally {
      setTesting(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  // 入力変更
  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: name === 'printer_port' ? Number(value) : value
    }));
  };

  if (loading) {
    return <div className="printer-settings__loading">読み込み中...</div>;
  }

  return (
    <div className="printer-settings">
      <div className="printer-settings__header">
        <Printer size={24} />
        <h2>プリンター設定</h2>
      </div>

      {message.text && (
        <div className={`printer-settings__message printer-settings__message--${message.type}`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="printer-settings__section">
        <h3>接続方式</h3>
        <div className="printer-settings__radio-group">
          <label className={`printer-settings__radio ${config.printer_type === 'browser' ? 'printer-settings__radio--selected' : ''}`}>
            <input
              type="radio"
              name="printer_type"
              value="browser"
              checked={config.printer_type === 'browser'}
              onChange={handleChange}
            />
            <Monitor size={20} />
            <div>
              <div className="printer-settings__radio-title">ブラウザ印刷（USB接続）</div>
              <div className="printer-settings__radio-desc">Windowsプリンターとして登録されたプリンターを使用</div>
            </div>
          </label>

          <label className={`printer-settings__radio ${config.printer_type === 'network' ? 'printer-settings__radio--selected' : ''}`}>
            <input
              type="radio"
              name="printer_type"
              value="network"
              checked={config.printer_type === 'network'}
              onChange={handleChange}
            />
            <Wifi size={20} />
            <div>
              <div className="printer-settings__radio-title">ネットワーク印刷（WiFi/有線LAN）</div>
              <div className="printer-settings__radio-desc">IPアドレスを指定して直接印刷</div>
            </div>
          </label>
        </div>
      </div>

      {config.printer_type === 'network' && (
        <div className="printer-settings__section">
          <h3>ネットワーク設定</h3>
          <div className="printer-settings__form-group">
            <label>プリンターIPアドレス</label>
            <input
              type="text"
              name="printer_ip"
              value={config.printer_ip}
              onChange={handleChange}
              placeholder="192.168.1.100"
              className="printer-settings__input"
            />
          </div>
          <div className="printer-settings__form-group">
            <label>ポート番号</label>
            <input
              type="number"
              name="printer_port"
              value={config.printer_port}
              onChange={handleChange}
              placeholder="9100"
              className="printer-settings__input printer-settings__input--small"
            />
          </div>
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="printer-settings__btn printer-settings__btn--test"
          >
            <TestTube size={16} />
            {testing ? 'テスト中...' : '接続テスト'}
          </button>
        </div>
      )}

      <div className="printer-settings__section">
        <h3>レシート表示設定</h3>
        <div className="printer-settings__form-group">
          <label>店舗名</label>
          <input
            type="text"
            name="shop_name"
            value={config.shop_name}
            onChange={handleChange}
            placeholder="店舗名を入力"
            className="printer-settings__input"
          />
        </div>
        <div className="printer-settings__form-group">
          <label>フッターメッセージ</label>
          <textarea
            name="shop_message"
            value={config.shop_message}
            onChange={handleChange}
            placeholder="ありがとうございました&#10;またのご来店をお待ちしております"
            rows={3}
            className="printer-settings__textarea"
          />
        </div>
      </div>

      <div className="printer-settings__actions">
        <button
          onClick={handleSave}
          disabled={saving}
          className="printer-settings__btn printer-settings__btn--save"
        >
          <Save size={18} />
          {saving ? '保存中...' : '設定を保存'}
        </button>
      </div>
    </div>
  );
}