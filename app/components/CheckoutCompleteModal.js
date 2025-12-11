// app/components/CheckoutCompleteModal.js
'use client';

import { Printer, X } from 'lucide-react';
import { printReceipt } from './Receipt';
import './CheckoutCompleteModal.css';

export default function CheckoutCompleteModal({ paymentId, onClose }) {
  
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
        <div className="checkout-complete-modal__buttons">
          <button
            className="checkout-complete-modal__btn checkout-complete-modal__btn--print"
            onClick={handlePrintReceipt}
          >
            <Printer size={24} />
            <span>レシート発行</span>
          </button>
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