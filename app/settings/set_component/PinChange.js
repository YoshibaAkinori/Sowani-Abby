// app/settings/set_component/PinChange.js
'use client';

import { useState } from 'react';
import { Key, Save } from 'lucide-react';
import './PinAuth.css';

export default function PinChange() {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // バリデーション
    if (!/^\d{4}$/.test(currentPin)) {
      setMessage({ type: 'error', text: '現在のPINを4桁で入力してください' });
      return;
    }

    if (!/^\d{4}$/.test(newPin)) {
      setMessage({ type: 'error', text: '新しいPINを4桁で入力してください' });
      return;
    }

    if (newPin !== confirmPin) {
      setMessage({ type: 'error', text: '新しいPINが一致しません' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/settings/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change',
          pin: currentPin,
          newPin: newPin
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'PINを変更しました' });
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '変更に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pin-change-container">
      <form className="pin-change-form" onSubmit={handleSubmit}>
        <div className="pin-change-field">
          <label>現在のPIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
            placeholder="****"
          />
        </div>

        <div className="pin-change-field">
          <label>新しいPIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            placeholder="****"
          />
        </div>

        <div className="pin-change-field">
          <label>新しいPIN（確認）</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            placeholder="****"
          />
        </div>

        {message.text && (
          <div className={`pin-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <button type="submit" className="pin-change-btn" disabled={saving}>
          <Save size={16} />
          {saving ? '変更中...' : 'PINを変更'}
        </button>
      </form>
    </div>
  );
}