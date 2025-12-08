// app/components/Receipt.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { Printer, X, RotateCcw } from 'lucide-react';
import './Receipt.css';

export default function Receipt({ paymentId, onClose, autoPrint = false }) {
    const [receiptData, setReceiptData] = useState(null);
    const [receiptHtml, setReceiptHtml] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [printing, setPrinting] = useState(false);
    const receiptRef = useRef(null);
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
            // データとHTMLの両方を取得
            const [dataRes, htmlRes] = await Promise.all([
                fetch(`/api/receipt/print?payment_id=${paymentId}`),
                fetch('/api/receipt/print', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payment_id: paymentId })
                })
            ]);

            const dataResult = await dataRes.json();
            const htmlResult = await htmlRes.json();

            if (dataResult.success) {
                setReceiptData(dataResult.data);
            }
            if (htmlResult.success && htmlResult.html) {
                setReceiptHtml(htmlResult.html);
            }
            if (!dataResult.success) {
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
            // まずネットワーク印刷を試みる
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
        // 印刷用iframeを作成
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

        // 印刷実行
        setTimeout(() => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            if (onClose) {
                setTimeout(onClose, 1000);
            }
        }, 250);
    };

    // 日付フォーマット
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="receipt-modal">
                <div className="receipt-modal__overlay" onClick={onClose} />
                <div className="receipt-modal__content">
                    <div className="receipt-loading">読み込み中...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="receipt-modal">
                <div className="receipt-modal__overlay" onClick={onClose} />
                <div className="receipt-modal__content">
                    <div className="receipt-error">
                        <p>{error}</p>
                        <button onClick={fetchReceiptData} className="receipt-btn receipt-btn--retry">
                            <RotateCcw size={16} />
                            再読み込み
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!receiptData) return null;

    const { payment, options, ticketPurchases, ticketUses } = receiptData;

    return (
        <div className="receipt-modal">
            <div className="receipt-modal__overlay" onClick={onClose} />
            <div className="receipt-modal__content">
                <div className="receipt-modal__header">
                    <h3>レシート</h3>
                    <button className="receipt-modal__close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="receipt-modal__body">
                    {receiptHtml ? (
                        <iframe
                            srcDoc={receiptHtml}
                            style={{
                                width: '100%',
                                height: '500px',
                                border: 'none',
                                background: 'white'
                            }}
                            title="レシートプレビュー"
                        />
                    ) : (
                        <div className="receipt" ref={receiptRef}>
                            {/* ヘッダー */}
                            <div className="receipt__header">
                                <div className="receipt__shop-name">美骨小顔サロン ABBY</div>
                                <div className="receipt__date">{formatDate(payment.payment_date)}</div>
                            </div>

                            <div className="receipt__divider" />

                            {/* 顧客情報 */}
                            <div className="receipt__customer">
                                <div>お客様: {payment.last_name} {payment.first_name} 様</div>
                                <div>担当: {payment.staff_name || '-'}</div>
                            </div>

                            <div className="receipt__divider" />

                            {/* 施術内容 */}
                            <div className="receipt__service">
                                <div className="receipt__service-name">{payment.service_name || '施術'}</div>

                                {payment.service_subtotal > 0 && (
                                    <div className="receipt__line">
                                        <span>小計</span>
                                        <span>¥{payment.service_subtotal.toLocaleString()}</span>
                                    </div>
                                )}

                                {/* オプション */}
                                {options && options.length > 0 && options.map((opt, idx) => (
                                    <div key={idx} className="receipt__line">
                                        <span>
                                            {opt.option_name}
                                            {opt.is_free && <span className="receipt__free">(無料)</span>}
                                        </span>
                                        <span>¥{(opt.is_free ? 0 : opt.price).toLocaleString()}</span>
                                    </div>
                                ))}

                                {/* 割引 */}
                                {payment.discount_amount > 0 && (
                                    <div className="receipt__line receipt__line--discount">
                                        <span>割引</span>
                                        <span>-¥{payment.discount_amount.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* ★★★ 回数券使用（合計の前に移動） ★★★ */}
                            {ticketUses && ticketUses.length > 0 && (
                                <>
                                    <div className="receipt__divider" />
                                    <div className="receipt__tickets">
                                        <div className="receipt__section-title">【回数券使用】</div>
                                        {ticketUses.map((t, idx) => (
                                            <div key={idx}>
                                                <div className="receipt__ticket-item">
                                                    <span>{t.plan_name || t.service_name}</span>
                                                </div>
                                                <div className="receipt__ticket-detail">
                                                    残り {t.sessions_remaining}/{t.total_sessions} 回
                                                    {t.expiry_date && ` ／ 期限 ${new Date(t.expiry_date).toLocaleDateString('ja-JP')}`}
                                                    {t.remaining_balance > 0 ? ` ／ 残金 ¥${t.remaining_balance.toLocaleString()}` : ' ／ 支払完了'}
                                                </div>
                                                {t.remaining_payment > 0 && (
                                                    <div style={{ textAlign: 'right', fontSize: '0.75rem', marginTop: '2px' }}>
                                                        残金支払 ¥{t.remaining_payment.toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* ★★★ 回数券購入（合計の前に移動） ★★★ */}
                            {ticketPurchases && ticketPurchases.length > 0 && (
                                <>
                                    <div className="receipt__divider" />
                                    <div className="receipt__tickets">
                                        <div className="receipt__section-title">【回数券購入】</div>
                                        {ticketPurchases.map((t, idx) => (
                                            <div key={idx}>
                                                <div className="receipt__ticket-item">
                                                    <span>{t.plan_name || t.service_name}</span>
                                                    <span>¥{(t.amount || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="receipt__ticket-detail">
                                                    残り {t.sessions_remaining}/{t.total_sessions} 回
                                                    {t.expiry_date && ` ／ 期限 ${new Date(t.expiry_date).toLocaleDateString('ja-JP')}`}
                                                    {t.remaining_balance > 0 ? ` ／ 残金 ¥${t.remaining_balance.toLocaleString()}` : ' ／ 支払完了'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="receipt__divider" />

                            {/* 合計 */}
                            <div className="receipt__total">
                                <span>合計</span>
                                <span>¥{payment.total_amount.toLocaleString()}</span>
                            </div>

                            <div className="receipt__divider" />

                            {/* 支払方法 */}
                            <div className="receipt__payment">
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