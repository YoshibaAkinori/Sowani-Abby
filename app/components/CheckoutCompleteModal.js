// app/components/CheckoutCompleteModal.js
'use client';

import { useState, useRef, useEffect } from 'react';
import { Printer, X, MessageCircle, Check, AlertCircle } from 'lucide-react';
import { printReceipt } from './Receipt';
import html2canvas from 'html2canvas';
import './CheckoutCompleteModal.css';

export default function CheckoutCompleteModal({ paymentId, customerId, lineConnected = false, onClose }) {
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null); // 'success' | 'error' | null
  const [statusMessage, setStatusMessage] = useState('');
  const receiptRef = useRef(null);
  const [receiptData, setReceiptData] = useState(null);

  // レシートデータ取得（LINE送信用）
  useEffect(() => {
    if (paymentId && lineConnected) {
      fetchReceiptData();
    }
  }, [paymentId, lineConnected]);

  const fetchReceiptData = async () => {
    try {
      const res = await fetch(`/api/receipt/print?payment_id=${paymentId}`);
      const result = await res.json();
      if (result.success) {
        setReceiptData(result.data);
      }
    } catch (err) {
      console.error('レシートデータ取得エラー:', err);
    }
  };

  const handlePrintReceipt = async () => {
    if (paymentId) {
      try {
        await printReceipt(paymentId);
      } catch (err) {
        console.error('レシート印刷エラー:', err);
      }
    }
    onClose();
  };

  const handleLineSend = async () => {
    if (!paymentId || !lineConnected) return;

    setSending(true);
    setSendStatus(null);

    try {
      // レシートHTML取得
      const htmlRes = await fetch('/api/receipt/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId })
      });
      const htmlResult = await htmlRes.json();

      if (!htmlResult.success || !htmlResult.html) {
        throw new Error('レシートデータの取得に失敗しました');
      }

      // 隠しiframeでレシートをレンダリング
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '400px';
      iframe.style.height = '800px';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(htmlResult.html);
      doc.close();

      // レンダリング完了を待つ
      await new Promise(resolve => setTimeout(resolve, 500));

      // html2canvasで画像化
      const receiptElement = doc.body;
      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      // iframe削除
      document.body.removeChild(iframe);

      // Base64に変換
      const imageBase64 = canvas.toDataURL('image/png');

      // API送信
      const sendRes = await fetch('/api/receipt/line-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: paymentId,
          customer_id: customerId,
          image_base64: imageBase64
        })
      });

      const sendResult = await sendRes.json();

      if (sendResult.success) {
        setSendStatus('success');
        setStatusMessage('LINEに送信しました');
      } else {
        throw new Error(sendResult.error || 'LINE送信に失敗しました');
      }

    } catch (err) {
      console.error('LINE送信エラー:', err);
      setSendStatus('error');
      setStatusMessage(err.message || 'LINE送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="checkout-complete-modal">
      <div className="checkout-complete-modal__overlay" onClick={handleClose} />
      <div className="checkout-complete-modal__content">
        <div className="checkout-complete-modal__title">
          お会計完了
        </div>

        {/* ステータスメッセージ */}
        {sendStatus && (
          <div className={`checkout-complete-modal__status checkout-complete-modal__status--${sendStatus}`}>
            {sendStatus === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            {statusMessage}
          </div>
        )}

        <div className="checkout-complete-modal__buttons">
          {/* LINE送信ボタン */}
          {lineConnected ? (
            <button
              className={`checkout-complete-modal__btn checkout-complete-modal__btn--line ${sendStatus === 'success' ? 'sent' : ''}`}
              onClick={handleLineSend}
              disabled={sending || sendStatus === 'success'}
            >
              {sendStatus === 'success' ? (
                <>
                  <Check size={24} />
                  <span>送信済み</span>
                </>
              ) : (
                <>
                  <MessageCircle size={24} />
                  <span>{sending ? '送信中...' : 'LINE送信'}</span>
                </>
              )}
            </button>
          ) : (
            <button
              className="checkout-complete-modal__btn checkout-complete-modal__btn--line-disabled"
              disabled
              title="LINE未連携"
            >
              <MessageCircle size={24} />
              <span>LINE未連携</span>
            </button>
          )}

          {/* レシート発行ボタン */}
          <button
            className="checkout-complete-modal__btn checkout-complete-modal__btn--print"
            onClick={handlePrintReceipt}
          >
            <Printer size={24} />
            <span>レシート発行</span>
          </button>

          {/* 閉じるボタン */}
          <button
            className="checkout-complete-modal__btn checkout-complete-modal__btn--close"
            onClick={handleClose}
          >
            <X size={24} />
            <span>閉じる</span>
          </button>
        </div>
      </div>
    </div>
  );
}