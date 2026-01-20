// app/components/Receipt.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { Printer, X, RefreshCw } from 'lucide-react';
import './Receipt.css';

export default function Receipt({ paymentId, onClose, autoPrint = false }) {
    const [receiptData, setReceiptData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [printing, setPrinting] = useState(false);
    const printFrameRef = useRef(null);

    // レシートデータ取得
    useEffect(() => {
        if (paymentId) {
            fetchReceiptData();
        }
    }, [paymentId]);

    // 自動印刷
    useEffect(() => {
        if (autoPrint && receiptData && !loading) {
            handlePrint();
        }
    }, [autoPrint, receiptData, loading]);

    const fetchReceiptData = async () => {
        setLoading(true);
        setError('');
        try {
            // GETでデータのみ取得（印刷はトリガーしない）
            const dataRes = await fetch(`/api/receipt/print?payment_id=${paymentId}`);
            const dataResult = await dataRes.json();

            if (dataResult.success) {
                setReceiptData(dataResult.data);
            } else {
                setError(dataResult.error || 'データ取得に失敗しました');
            }
        } catch (err) {
            setError('通信エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    // 印刷処理
    const handlePrint = async () => {
        setPrinting(true);
        try {
            // POSTで印刷を実行
            const response = await fetch('/api/receipt/print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_id: paymentId })
            });
            const result = await response.json();

            if (result.success) {
                if (result.type === 'network' && !result.fallback) {
                    // ネットワーク印刷成功
                    if (onClose) {
                        setTimeout(onClose, 500);
                    }
                } else if (result.type === 'browser' || result.fallback) {
                    // ブラウザ印刷
                    printWithBrowser(result.html);
                }
            } else {
                setError(result.error || '印刷に失敗しました');
            }
        } catch (err) {
            setError('印刷エラーが発生しました');
        } finally {
            setPrinting(false);
        }
    };

    // ブラウザ印刷
    const printWithBrowser = (html) => {
        let printFrame = printFrameRef.current;
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.style.position = 'absolute';
            printFrame.style.top = '-9999px';
            printFrame.style.left = '-9999px';
            printFrame.style.width = '80mm';
            printFrame.style.height = '0';
            document.body.appendChild(printFrame);
            printFrameRef.current = printFrame;
        }

        const frameDoc = printFrame.contentWindow || printFrame.contentDocument;
        const doc = frameDoc.document || frameDoc;

        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            if (onClose) {
                setTimeout(onClose, 1000);
            }
        }, 250);
    };

    if (!paymentId) return null;

    const payment = receiptData?.payment;
    const services = receiptData?.services || [];
    const options = receiptData?.options || [];
    const ticketUses = receiptData?.ticketUses || [];
    const ticketPurchases = receiptData?.ticketPurchases || [];

    return (
        <div className="receipt-modal__overlay" onClick={onClose}>
            <div className="receipt-modal__content" onClick={e => e.stopPropagation()}>
                <div className="receipt-modal__header">
                    <h2>レシート</h2>
                    <button className="receipt-modal__close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="receipt-modal__body">
                    {loading && (
                        <div className="receipt-loading">
                            読み込み中...
                        </div>
                    )}

                    {error && (
                        <div className="receipt-error">
                            <p>{error}</p>
                            <button onClick={fetchReceiptData} className="receipt-btn receipt-btn--retry">
                                <RefreshCw size={16} />
                                再読み込み
                            </button>
                        </div>
                    )}

                    {!loading && !error && receiptData && (
                        <div className="receipt">
                            {/* ヘッダー */}
                            <div className="receipt__header">
                                <h3 className="receipt__shop-name">美骨小顔サロン ABBY</h3>
                                <div className="receipt__date">
                                    {new Date(payment.payment_date).toLocaleString('ja-JP')}
                                </div>
                            </div>

                            {/* 顧客情報 */}
                            <div className="receipt__customer">
                                <span>{payment.last_name} {payment.first_name} 様</span>
                                {payment.staff_name && (
                                    <span className="receipt__staff">担当: {payment.staff_name}</span>
                                )}
                            </div>

                            <div className="receipt__divider"></div>

                            {/* サービス */}
                            {services.map((service, idx) => (
                                <div key={idx} className="receipt__line">
                                    <span>{service.service_name}</span>
                                    <span>¥{service.price.toLocaleString()}</span>
                                </div>
                            ))}

                            {/* オプション */}
                            {options.map((opt, idx) => (
                                <div key={idx} className="receipt__line receipt__line--option">
                                    <span>{opt.option_name}</span>
                                    <span>{opt.is_free ? '(無料)' : `¥${opt.price.toLocaleString()}`}</span>
                                </div>
                            ))}

                            {/* 回数券使用 */}
                            {ticketUses.map((ticket, idx) => (
                                <div key={idx} className="receipt__ticket">
                                    <div className="receipt__line">
                                        <span>回数券使用: {ticket.plan_name}</span>
                                        <span>¥0</span>
                                    </div>
                                    <div className="receipt__ticket-detail">
                                        残り {ticket.sessions_remaining}/{ticket.total_sessions} 回
                                    </div>
                                    {ticket.remaining_payment > 0 && (
                                        <div className="receipt__ticket-payment">
                                            残金支払い: ¥{ticket.remaining_payment.toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* 回数券購入 */}
                            {ticketPurchases.map((ticket, idx) => (
                                <div key={idx} className="receipt__ticket">
                                    <div className="receipt__line">
                                        <span>回数券購入: {ticket.plan_name}</span>
                                        <span>¥{ticket.amount.toLocaleString()}</span>
                                    </div>
                                    <div className="receipt__ticket-detail">
                                        {ticket.total_sessions}回券 / 残り {ticket.sessions_remaining} 回
                                    </div>
                                </div>
                            ))}

                            {/* 割引 */}
                            {payment.discount_amount > 0 && (
                                <div className="receipt__line receipt__line--discount">
                                    <span>割引</span>
                                    <span>-¥{payment.discount_amount.toLocaleString()}</span>
                                </div>
                            )}

                            <div className="receipt__divider"></div>

                            {/* 合計 */}
                            <div className="receipt__total">
                                <span>合計</span>
                                <span>¥{payment.total_amount.toLocaleString()}</span>
                            </div>

                            <div className="receipt__divider"></div>

                            {/* 支払い方法 */}
                            <div className="receipt__payment-methods">
                                {payment.payment_method === 'cash' && (
                                    <div className="receipt__line">
                                        <span>現金</span>
                                        <span>¥{payment.cash_amount.toLocaleString()}</span>
                                    </div>
                                )}
                                {payment.payment_method === 'card' && (
                                    <div className="receipt__line">
                                        <span>カード</span>
                                        <span>¥{payment.card_amount.toLocaleString()}</span>
                                    </div>
                                )}
                                {payment.payment_method === 'mixed' && (
                                    <>
                                        <div className="receipt__line">
                                            <span>現金</span>
                                            <span>¥{payment.cash_amount.toLocaleString()}</span>
                                        </div>
                                        <div className="receipt__line">
                                            <span>カード</span>
                                            <span>¥{payment.card_amount.toLocaleString()}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* フッター */}
                            <div className="receipt__footer">
                                <p>ありがとうございました</p>
                                <p>またのご来店をお待ちしております</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="receipt-modal__footer">
                    <button
                        onClick={handlePrint}
                        disabled={printing}
                        className="receipt-btn receipt-btn--print"
                    >
                        <Printer size={18} />
                        {printing ? '印刷中...' : 'レシートを印刷'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// 直接印刷用（モーダルなしで印刷のみ実行）
export async function printReceipt(paymentId) {
    try {
        const response = await fetch('/api/receipt/print', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_id: paymentId })
        });
        const result = await response.json();

        if (result.success && result.type === 'browser') {
            // ブラウザ印刷
            const printFrame = document.createElement('iframe');
            printFrame.style.position = 'absolute';
            printFrame.style.top = '-9999px';
            printFrame.style.left = '-9999px';
            printFrame.style.width = '80mm';
            document.body.appendChild(printFrame);

            const doc = printFrame.contentWindow.document;
            doc.open();
            doc.write(result.html);
            doc.close();

            setTimeout(() => {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
                setTimeout(() => {
                    document.body.removeChild(printFrame);
                }, 1000);
            }, 250);
        }

        return result;
    } catch (err) {
        console.error('Print error:', err);
        return { success: false, error: err.message };
    }
}