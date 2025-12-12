// app/settings/set_component/PinAuth.js
'use client';

import { useState, useRef, useEffect } from 'react';
import { Lock, X } from 'lucide-react';
import './PinAuth.css';

export default function PinAuth({ onSuccess }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    // 最初の入力にフォーカス
    inputRefs[0].current?.focus();
  }, []);

  const handleChange = (index, value) => {
    // 数字のみ許可
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');

    // 次の入力に移動
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // 4桁入力完了で自動検証
    if (index === 3 && value) {
      const fullPin = newPin.join('');
      if (fullPin.length === 4) {
        verifyPin(fullPin);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    // Backspaceで前の入力に戻る
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').slice(0, 4);
    if (/^\d+$/.test(pasted)) {
      const newPin = pasted.split('').concat(['', '', '', '']).slice(0, 4);
      setPin(newPin);
      if (pasted.length === 4) {
        verifyPin(pasted);
      } else {
        inputRefs[pasted.length]?.current?.focus();
      }
    }
  };

  const verifyPin = async (pinCode) => {
    setVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/settings/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', pin: pinCode })
      });

      const result = await response.json();

      if (result.valid) {
        onSuccess();
      } else {
        setError('PINが正しくありません');
        setPin(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
    } catch (err) {
      setError('認証エラーが発生しました');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="pin-auth-overlay">
      <div className="pin-auth-modal">
        <div className="pin-auth-icon">
          <Lock size={48} />
        </div>
        <h2>設定画面</h2>
        <p>PINコードを入力してください</p>

        <div className="pin-inputs" onPaste={handlePaste}>
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={inputRefs[index]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={verifying}
              autoComplete="off"
            />
          ))}
        </div>

        {error && <div className="pin-error">{error}</div>}

        {verifying && <div className="pin-verifying">確認中...</div>}
      </div>
    </div>
  );
}