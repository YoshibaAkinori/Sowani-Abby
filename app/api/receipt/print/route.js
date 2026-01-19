// app/api/receipt/print/route.js - 統合様式版
import { NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';
import net from 'net';
import { promises as fs } from 'fs';
import path from 'path';

// ESC/POSコマンド定義
const ESC = '\x1b';
const GS = '\x1d';
const COMMANDS = {
    INIT: ESC + '@',
    CENTER: ESC + 'a' + '\x01',
    LEFT: ESC + 'a' + '\x00',
    RIGHT: ESC + 'a' + '\x02',
    BOLD_ON: ESC + 'E' + '\x01',
    BOLD_OFF: ESC + 'E' + '\x00',
    DOUBLE_HEIGHT: GS + '!' + '\x10',
    DOUBLE_WIDTH: GS + '!' + '\x20',
    DOUBLE_SIZE: GS + '!' + '\x30',
    NORMAL_SIZE: GS + '!' + '\x00',
    CUT: GS + 'V' + '\x00',
    PARTIAL_CUT: GS + 'V' + '\x01',
    FEED: ESC + 'd' + '\x03',
};

async function loadPrinterConfig() {
    const CONFIG_PATH = path.join(process.cwd(), 'config', 'printer.json');
    const DEFAULT_CONFIG = {
        printer_type: 'browser',
        printer_ip: '',
        printer_port: 9100,
        shop_name: '美骨小顔サロン ABBY',
        shop_message: 'ありがとうございました\nまたのご来店をお待ちしております'
    };

    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf-8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch (error) {
        return DEFAULT_CONFIG;
    }
}

// レシートデータ取得
async function getReceiptData(paymentId) {
    const pool = await getConnection();

    const [payments] = await pool.execute(`
    SELECT 
      p.*,
      c.last_name, c.first_name,
      st.name as staff_name
    FROM payments p
    LEFT JOIN customers c ON p.customer_id = c.customer_id
    LEFT JOIN staff st ON p.staff_id = st.staff_id
    WHERE p.payment_id = ?
  `, [paymentId]);

    if (payments.length === 0) {
        return null;
    }

    const payment = payments[0];

    const [options] = await pool.execute(`
    SELECT * FROM payment_options WHERE payment_id = ?
  `, [paymentId]);

    const [childPayments] = await pool.execute(`
    SELECT p.*
    FROM payments p
    WHERE p.related_payment_id = ?
  `, [paymentId]);

    const childIds = childPayments.map(c => c.payment_id);
    let grandchildPayments = [];
    if (childIds.length > 0) {
        const placeholders = childIds.map(() => '?').join(',');
        const [grandchildren] = await pool.execute(`
      SELECT p.*
      FROM payments p
      WHERE p.related_payment_id IN (${placeholders})
    `, childIds);
        grandchildPayments = grandchildren;
    }

    // チケット基本情報を取得
    const allPayments = [payment, ...childPayments, ...grandchildPayments];
    const ticketIds = [...new Set(allPayments.filter(p => p.ticket_id).map(p => p.ticket_id))];
    let ticketInfoMap = new Map();

    if (ticketIds.length > 0) {
        const placeholders = ticketIds.map(() => '?').join(',');
        const [ticketInfo] = await pool.execute(`
      SELECT 
        ct.customer_ticket_id,
        ct.purchase_price,
        ct.sessions_remaining,
        ct.expiry_date,
        tp.name as plan_name,
        tp.total_sessions,
        tp.price as full_price,
        s.name as service_name,
        COALESCE((
          SELECT SUM(amount_paid) 
          FROM ticket_payments 
          WHERE customer_ticket_id = ct.customer_ticket_id
        ), 0) as total_paid
      FROM customer_tickets ct
      JOIN ticket_plans tp ON ct.plan_id = tp.plan_id
      LEFT JOIN services s ON tp.service_id = s.service_id
      WHERE ct.customer_ticket_id IN (${placeholders})
    `, ticketIds);

        ticketInfo.forEach(info => {
            ticketInfoMap.set(info.customer_ticket_id, {
                plan_name: info.plan_name,
                total_sessions: info.total_sessions,
                service_name: info.service_name,
                sessions_remaining: info.sessions_remaining,
                expiry_date: info.expiry_date,
                purchase_price: info.purchase_price,
                full_price: info.full_price,
                total_paid: info.total_paid
            });
        });
    }

    // ★ 期間限定回数券の情報を取得
    const limitedOfferIds = [...new Set(allPayments.filter(p => p.limited_offer_id).map(p => p.limited_offer_id))];
    let limitedInfoMap = new Map();

    if (limitedOfferIds.length > 0) {
        const placeholders = limitedOfferIds.map(() => '?').join(',');
        // まずlimited_offersから名前を取得
        const [offerInfo] = await pool.execute(`
          SELECT 
            lo.offer_id,
            lo.name as offer_name,
            lo.total_sessions,
            lo.special_price
          FROM limited_offers lo
          WHERE lo.offer_id IN (${placeholders})
        `, limitedOfferIds);

        // 各オファーの購入情報を取得（顧客ごと）
        for (const offer of offerInfo) {
            // この支払いの顧客の購入情報を取得
            const [purchaseInfo] = await pool.execute(`
              SELECT 
                ltp.purchase_id,
                ltp.sessions_remaining,
                ltp.expiry_date,
                ltp.purchase_price,
                COALESCE((
                  SELECT SUM(amount_paid) 
                  FROM ticket_payments 
                  WHERE customer_ticket_id = ltp.purchase_id
                    AND ticket_type = 'limited'
                ), 0) as total_paid
              FROM limited_ticket_purchases ltp
              WHERE ltp.offer_id = ? AND ltp.customer_id = ?
              ORDER BY ltp.purchase_date DESC
              LIMIT 1
            `, [offer.offer_id, payment.customer_id]);

            if (purchaseInfo.length > 0) {
                const p = purchaseInfo[0];
                limitedInfoMap.set(offer.offer_id, {
                    offer_name: offer.offer_name,
                    total_sessions: offer.total_sessions,
                    sessions_remaining: p.sessions_remaining,
                    expiry_date: p.expiry_date,
                    purchase_price: p.purchase_price,
                    total_paid: p.total_paid,
                    remaining_balance: Math.max(0, p.purchase_price - p.total_paid)
                });
            } else {
                limitedInfoMap.set(offer.offer_id, {
                    offer_name: offer.offer_name,
                    total_sessions: offer.total_sessions,
                    sessions_remaining: null,
                    expiry_date: null,
                    purchase_price: offer.special_price,
                    total_paid: 0,
                    remaining_balance: 0
                });
            }
        }
    }

    // フラグ判定
    const toBoolean = (val) => val === 1 || val === true;

    const isParentTicketPurchase = toBoolean(payment.is_ticket_purchase);
    const isParentRemainingPayment = toBoolean(payment.is_remaining_payment);
    const isParentTicketUse = payment.ticket_id && !isParentTicketPurchase && !isParentRemainingPayment;

    // 子に残金支払いがあるかチェック
    const childRemainingPayment = childPayments.find(child => toBoolean(child.is_remaining_payment));
    const isTicketUseWithRemainingPayment = isParentTicketUse && childRemainingPayment;

    // データ整理
    const ticketPurchases = [];
    const ticketUses = [];
    let totalAmount = payment.total_amount || 0;

    // ★★★ 回数券購入の場合 ★★★
    if (isParentTicketPurchase && payment.ticket_id) {
        const ticketInfo = ticketInfoMap.get(payment.ticket_id);
        if (ticketInfo) {
            ticketPurchases.push({
                plan_name: ticketInfo.plan_name,
                service_name: ticketInfo.service_name,
                total_sessions: ticketInfo.total_sessions,
                sessions_remaining: payment.ticket_sessions_at_payment ?? ticketInfo.sessions_remaining,
                purchase_price: ticketInfo.purchase_price,
                remaining_balance: payment.ticket_balance_at_payment ?? 0,
                amount: payment.total_amount,
                expiry_date: ticketInfo.expiry_date
            });
        }
    }

    // ★★★ 回数券使用の場合（残金支払いがあっても統一様式） ★★★
    if (isParentTicketUse && payment.ticket_id) {
        const ticketInfo = ticketInfoMap.get(payment.ticket_id);
        if (ticketInfo) {
            // 残金支払い額を取得
            const remainingPaymentAmount = childRemainingPayment?.payment_amount || payment.payment_amount || 0;

            ticketUses.push({
                plan_name: ticketInfo.plan_name,
                service_name: ticketInfo.service_name,
                total_sessions: ticketInfo.total_sessions,
                sessions_remaining: payment.ticket_sessions_at_payment ?? ticketInfo.sessions_remaining,
                purchase_price: ticketInfo.purchase_price,
                remaining_balance: payment.ticket_balance_at_payment ?? 0,
                remaining_payment: remainingPaymentAmount,
                expiry_date: ticketInfo.expiry_date
            });

            // 残金支払いがある場合は合計に追加
            if (remainingPaymentAmount > 0) {
                totalAmount += remainingPaymentAmount;
            }
        }
    }

    // ★★★ 期間限定回数券使用の場合 ★★★
    const isParentLimitedUse = (payment.payment_type === 'limited_offer' || payment.payment_type === 'limited') 
        && payment.limited_offer_id && payment.total_amount === 0;
    
    if (isParentLimitedUse && payment.limited_offer_id) {
        const limitedInfo = limitedInfoMap.get(payment.limited_offer_id);
        if (limitedInfo) {
            ticketUses.push({
                plan_name: limitedInfo.offer_name,
                service_name: limitedInfo.offer_name,
                total_sessions: limitedInfo.total_sessions,
                sessions_remaining: limitedInfo.sessions_remaining,
                purchase_price: limitedInfo.purchase_price,
                remaining_balance: limitedInfo.remaining_balance,
                remaining_payment: 0,
                expiry_date: limitedInfo.expiry_date,
                is_limited: true  // 期間限定フラグ
            });
        }
    }

    // 子支払いの処理（回数券購入）
    for (const child of childPayments) {
        if (toBoolean(child.is_ticket_purchase)) {
            const ticketInfo = ticketInfoMap.get(child.ticket_id);
            ticketPurchases.push({
                plan_name: ticketInfo?.plan_name || child.service_name,
                service_name: ticketInfo?.service_name || '',
                total_sessions: ticketInfo?.total_sessions || 0,
                sessions_remaining: child.ticket_sessions_at_payment ?? ticketInfo?.sessions_remaining ?? 0,
                purchase_price: ticketInfo?.purchase_price || 0,
                remaining_balance: child.ticket_balance_at_payment ?? 0,
                amount: child.total_amount,
                expiry_date: ticketInfo?.expiry_date
            });
            totalAmount += child.total_amount || 0;
        }
        // 回数券使用（親と同じticket_idでない場合のみ追加）
        else if (child.payment_type === 'ticket' && child.ticket_id && child.ticket_id !== payment.ticket_id) {
            const ticketInfo = ticketInfoMap.get(child.ticket_id);
            if (ticketInfo && !toBoolean(child.is_remaining_payment)) {
                ticketUses.push({
                    plan_name: ticketInfo.plan_name,
                    service_name: ticketInfo.service_name,
                    total_sessions: ticketInfo.total_sessions,
                    sessions_remaining: child.ticket_sessions_at_payment ?? ticketInfo.sessions_remaining,
                    purchase_price: ticketInfo.purchase_price,
                    remaining_balance: child.ticket_balance_at_payment ?? 0,
                    remaining_payment: child.payment_amount || 0,
                    expiry_date: ticketInfo?.expiry_date
                });
            }
        }
    }

    // 孫支払いの処理
    for (const grandchild of grandchildPayments) {
        if (toBoolean(grandchild.is_ticket_purchase)) {
            const ticketInfo = ticketInfoMap.get(grandchild.ticket_id);
            ticketPurchases.push({
                plan_name: ticketInfo?.plan_name || grandchild.service_name,
                service_name: ticketInfo?.service_name || '',
                total_sessions: ticketInfo?.total_sessions || 0,
                sessions_remaining: grandchild.ticket_sessions_at_payment ?? ticketInfo?.sessions_remaining ?? 0,
                purchase_price: ticketInfo?.purchase_price || 0,
                remaining_balance: grandchild.ticket_balance_at_payment ?? 0,
                amount: grandchild.total_amount,
                expiry_date: ticketInfo?.expiry_date
            });
            totalAmount += grandchild.total_amount || 0;
        }
    }

    // 合計金額の集計（現金・カード別）
    let totalCash = payment.cash_amount || 0;
    let totalCard = payment.card_amount || 0;

    for (const child of childPayments) {
        // 回数券購入は親に含まれるため加算しない
        if (!toBoolean(child.is_ticket_purchase)) {
            totalCash += child.cash_amount || 0;
            totalCard += child.card_amount || 0;
        }
    }
    for (const grandchild of grandchildPayments) {
        if (!toBoolean(grandchild.is_ticket_purchase)) {
            totalCash += grandchild.cash_amount || 0;
            totalCard += grandchild.card_amount || 0;
        }
    }

    let paymentMethod = 'cash';
    if (totalCash > 0 && totalCard > 0) {
        paymentMethod = 'mixed';
    } else if (totalCard > 0) {
        paymentMethod = 'card';
    }

    return {
        payment: {
            ...payment,
            total_amount: totalAmount,
            cash_amount: totalCash,
            card_amount: totalCard,
            payment_method: paymentMethod
        },
        options,
        ticketPurchases,
        ticketUses,
        childPayments,
        grandchildPayments,
        isParentTicketPurchase,
        ticketInfoMap
    };
}
// 文字の表示幅を計算（全角=2、半角=1）
function getDisplayWidth(str) {
    let width = 0;
    for (const char of str) {
        width += char.charCodeAt(0) > 255 ? 2 : 1;
    }
    return width;
}

// 行フォーマット（全角対応・金額右寄せ）
function formatLine(label, amount) {
    const amountStr = `¥${Number(amount).toLocaleString()}`;
    const totalWidth = 48;  // 32→48に変更
    const labelWidth = getDisplayWidth(label);
    const amountWidth = getDisplayWidth(amountStr);
    const spaces = totalWidth - labelWidth - amountWidth;
    return label + ' '.repeat(Math.max(1, spaces)) + amountStr + '\n';
}


// 有効期限フォーマット
function formatExpiry(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// ESC/POSコマンド生成（統一様式）
function generateEscPosCommands(data, printerConfig = {}) {
    const { payment, options, ticketPurchases, ticketUses } = data;
    let commands = '';

    const shopName = printerConfig.shop_name || '美骨小顔サロン ABBY';
    const shopMessage = printerConfig.shop_message || 'ありがとうございました\nまたのご来店をお待ちしております';

    commands += COMMANDS.INIT;
    commands += COMMANDS.CENTER;
    commands += COMMANDS.BOLD_ON;
    commands += COMMANDS.DOUBLE_WIDTH;
    commands += shopName + '\n';
    commands += COMMANDS.BOLD_OFF;
    commands += COMMANDS.NORMAL_SIZE;
    commands += '\n';

    const date = new Date(payment.payment_date);
    commands += COMMANDS.CENTER;
    commands += date.toLocaleString('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }) + '\n\n';

   commands += '------------------------------------------------\n';
    commands += `お客様: ${payment.last_name} ${payment.first_name} 様\n`;
    commands += `担当: ${payment.staff_name || '-'}\n`;
    commands += '------------------------------------------------\n';

    // 施術内容
    commands += COMMANDS.BOLD_ON;
    commands += `${payment.service_name || '施術'}\n`;
    commands += COMMANDS.BOLD_OFF;

    if (payment.service_subtotal > 0) {
        commands += formatLine('  小計', payment.service_subtotal);
    }

    // オプション
    if (options && options.length > 0) {
        for (const opt of options) {
            const price = opt.is_free ? 0 : opt.price;
            const suffix = opt.is_free ? '(無料)' : '';
            commands += formatLine(`  ${opt.option_name}${suffix}`, price);
        }
    }

    // 割引
    if (payment.discount_amount > 0) {
        commands += formatLine('  割引', -payment.discount_amount);
    }

    // 回数券使用
    if (ticketUses && ticketUses.length > 0) {
       commands += '------------------------------------------------\n';
        commands += '【回数券使用】\n';
        for (const t of ticketUses) {
            commands += `${t.plan_name || t.service_name}\n`;
            commands += `  残り ${t.sessions_remaining}/${t.total_sessions} 回`;
            if (t.expiry_date) {
                commands += ` / 期限 ${formatExpiry(t.expiry_date)}`;
            }
            commands += t.remaining_balance === 0 ? ' / 支払完了\n' : ` / 残金 ¥${t.remaining_balance?.toLocaleString()}\n`;
            if (t.remaining_payment > 0) {
                commands += `                    残金支払 ¥${t.remaining_payment.toLocaleString()}\n`;
            }
        }
    }

    // 回数券購入
    if (ticketPurchases && ticketPurchases.length > 0) {
        commands += '------------------------------------------------\n';
        commands += '【回数券購入】\n';
        for (const t of ticketPurchases) {
            commands += `${t.plan_name || t.service_name}\n`;
            commands += formatLine('  金額', t.amount || 0);
            commands += `  残り ${t.sessions_remaining}/${t.total_sessions} 回`;
            if (t.expiry_date) {
                commands += ` / 期限 ${formatExpiry(t.expiry_date)}`;
            }
            commands += t.remaining_balance === 0 ? ' / 支払完了\n' : ` / 残金 ¥${t.remaining_balance?.toLocaleString()}\n`;
        }
    }

    commands += '------------------------------------------------\n';
    commands += COMMANDS.BOLD_ON;
    commands += COMMANDS.DOUBLE_HEIGHT;
    commands += formatLine('合計', payment.total_amount);
    commands += COMMANDS.NORMAL_SIZE;
    commands += COMMANDS.BOLD_OFF;
    commands += '------------------------------------------------\n';

    // 支払方法
    if (payment.payment_method === 'cash') {
        commands += formatLine('現金', payment.cash_amount);
    } else if (payment.payment_method === 'card') {
        commands += formatLine('カード', payment.card_amount);
    } else {
        commands += formatLine('現金', payment.cash_amount);
        commands += formatLine('カード', payment.card_amount);
    }

    commands += '\n';
    commands += COMMANDS.CENTER;
    const messageLines = shopMessage.split('\n');
    messageLines.forEach(line => {
        commands += line + '\n';
    });
    commands += COMMANDS.FEED;
    commands += COMMANDS.PARTIAL_CUT;

    return commands;
}

// ネットワーク印刷
async function printToNetwork(commands, ip, port = 9100) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        client.setTimeout(5000);

        client.connect(port, ip, () => {
            const iconv = require('iconv-lite');
            const encoded = iconv.encode(commands, 'Shift_JIS');
            client.write(encoded);
            client.end();
        });

        client.on('close', () => resolve({ success: true }));
        client.on('error', (err) => reject(err));
        client.on('timeout', () => { client.destroy(); reject(new Error('Connection timeout')); });
    });
}

// HTML生成（統一様式 - 残金支払い専用分岐を削除）
function generateReceiptHtml(data, printerConfig = {}) {
    const { payment, options, ticketPurchases, ticketUses } = data;
    const date = new Date(payment.payment_date);

    const shopName = printerConfig.shop_name || '美骨小顔サロン ABBY';
    const shopMessage = printerConfig.shop_message || 'ありがとうございました\nまたのご来店をお待ちしております';

    const baseStyle = `
    <style>
      @page { size: 80mm auto; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: 'MS Gothic', 'Hiragino Kaku Gothic ProN', monospace; 
        font-size: 12px; 
        width: 80mm; 
        margin: 0 auto; 
        padding: 5mm; 
        color: #333; 
      }
      .header { text-align: center; margin-bottom: 10px; }
      .shop-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
      .date { font-size: 11px; color: #333; }
      .divider { border-top: 1px dashed #000; margin: 8px 0; }
      .customer-info { margin-bottom: 5px; }
      .service-name { font-weight: bold; margin-bottom: 5px; }
      .items-table { width: 100%; border-collapse: collapse; }
      .items-table td { padding: 2px 0; }
      .item-name { text-align: left; }
      .item-price { text-align: right; white-space: nowrap; }
      .free { font-size: 10px; color: #666; }
      .discount { color: #000; }
      .total-section { margin-top: 5px; }
      .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; padding: 5px 0; }
      .payment-method { display: flex; justify-content: space-between; padding: 2px 0; }
      .section { margin-top: 10px; }
      .section-title { font-weight: bold; margin-bottom: 5px; }
      .ticket-item { display: flex; justify-content: space-between; font-size: 11px; }
      .footer { text-align: center; margin-top: 15px; font-size: 11px; }
      .ticket-detail { font-size: 10px; color: #000; margin-left: 10px; margin-bottom: 5px; }
      .ticket-payment-line { text-align: right; font-size: 11px; color: #000; margin-top: 2px; }
      @media print { body { width: 80mm; } }
    </style>
  `;

    // オプションHTML
    let optionsHtml = '';
    if (options && options.length > 0) {
        optionsHtml = options.map(opt => {
            const price = opt.is_free ? 0 : opt.price;
            const suffix = opt.is_free ? '<span class="free">(無料)</span>' : '';
            return `<tr><td class="item-name">${opt.option_name}${suffix}</td><td class="item-price">¥${price.toLocaleString()}</td></tr>`;
        }).join('');
    }

    // 回数券使用HTML
    let ticketUseHtml = '';
    if (ticketUses && ticketUses.length > 0) {
        ticketUseHtml = `
      <div class="section">
        <div class="section-title">【回数券使用】</div>
        ${ticketUses.map(t => `
          <div class="ticket-item">
            <span>${t.plan_name || t.service_name}</span>
          </div>
          ${t.sessions_remaining !== null ? `<div class="ticket-detail">残り ${t.sessions_remaining}/${t.total_sessions} 回${t.expiry_date ? ` ／ 期限 ${formatExpiry(t.expiry_date)}` : ''}${t.remaining_balance === 0 ? ' ／ 支払完了' : (t.remaining_balance > 0 ? ` ／ 残金 ¥${t.remaining_balance?.toLocaleString()}` : '')}</div>` : ''}
          ${t.remaining_payment > 0 ? `<div class="ticket-payment-line">残金支払 ¥${t.remaining_payment.toLocaleString()}</div>` : ''}
        `).join('')}
      </div>
    `;
    }

    // 回数券購入HTML
    let ticketPurchaseHtml = '';
    if (ticketPurchases && ticketPurchases.length > 0) {
        ticketPurchaseHtml = `
      <div class="section">
        <div class="section-title">【回数券購入】</div>
        ${ticketPurchases.map(t => `
          <div class="ticket-item"><span>${t.plan_name || t.service_name}</span><span>¥${(t.amount || 0).toLocaleString()}</span></div>
          ${t.sessions_remaining !== null ? `<div class="ticket-detail">残り ${t.sessions_remaining}/${t.total_sessions} 回${t.expiry_date ? ` ／ 期限 ${formatExpiry(t.expiry_date)}` : ''}${t.remaining_balance === 0 ? ' ／ 支払完了' : (t.remaining_balance > 0 ? ` ／ 残金 ¥${t.remaining_balance?.toLocaleString()}` : '')}</div>` : ''}
        `).join('')}
      </div>
    `;
    }

    // フッターHTML
    const footerHtml = shopMessage.split('\n').map(line => `<p>${line}</p>`).join('');

    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>レシート</title>${baseStyle}</head>
<body>
  <div class="header">
    <div class="shop-name">${shopName}</div>
    <div class="date">${date.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
  </div>
  <div class="divider"></div>
  <div class="customer-info">
    <div>お客様: ${payment.last_name} ${payment.first_name} 様</div>
    <div>担当: ${payment.staff_name || '-'}</div>
  </div>
  <div class="divider"></div>
  ${ticketUses.length === 0 ? `<div class="service-name">${payment.service_name || '施術'}</div>` : ''}
  <table class="items-table">
    ${payment.service_subtotal > 0 && ticketUses.length === 0 ? `<tr><td class="item-name">小計</td><td class="item-price">¥${payment.service_subtotal.toLocaleString()}</td></tr>` : ''}
    ${optionsHtml}
    ${payment.discount_amount > 0 ? `<tr class="discount"><td class="item-name">割引</td><td class="item-price">-¥${payment.discount_amount.toLocaleString()}</td></tr>` : ''}
  </table>
  ${ticketUseHtml}
  ${ticketPurchaseHtml}
  <div class="divider"></div>
  <div class="total-section">
    <div class="total-row"><span>合計</span><span>¥${payment.total_amount.toLocaleString()}</span></div>
  </div>
  <div class="divider"></div>
  <div class="payment-methods">
    ${payment.payment_method === 'cash' ? `<div class="payment-method"><span>現金</span><span>¥${payment.cash_amount.toLocaleString()}</span></div>` : ''}
    ${payment.payment_method === 'card' ? `<div class="payment-method"><span>カード</span><span>¥${payment.card_amount.toLocaleString()}</span></div>` : ''}
    ${payment.payment_method === 'mixed' ? `
      <div class="payment-method"><span>現金</span><span>¥${payment.cash_amount.toLocaleString()}</span></div>
      <div class="payment-method"><span>カード</span><span>¥${payment.card_amount.toLocaleString()}</span></div>
    ` : ''}
  </div>
  <div class="footer">
    ${footerHtml}
  </div>
</body>
</html>`;
}

// POST: レシート印刷
export async function POST(request) {
    try {
        const body = await request.json();
        const { payment_id, print_type } = body;

        if (!payment_id) {
            return NextResponse.json({ success: false, error: 'payment_id is required' }, { status: 400 });
        }

        const receiptData = await getReceiptData(payment_id);
        if (!receiptData) {
            return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
        }

        // 保存された設定を読み込む
        const printerConfig = await loadPrinterConfig();
        const printerType = printerConfig.printer_type;
        const printerIp = printerConfig.printer_ip;
        const printerPort = printerConfig.printer_port;

        // ネットワーク印刷
        if ((print_type === 'network' || printerType === 'network') && printerIp) {
            try {
                const commands = generateEscPosCommands(receiptData, printerConfig);
                await printToNetwork(commands, printerIp, printerPort);
                return NextResponse.json({ success: true, message: 'レシートを印刷しました', type: 'network' });
            } catch (err) {
                console.error('Network print error:', err);
                // ネットワーク印刷失敗時はブラウザ印刷にフォールバック
                const html = generateReceiptHtml(receiptData, printerConfig);
                return NextResponse.json({ success: true, type: 'browser', html, fallback: true, error: err.message });
            }
        }

        // ブラウザ印刷
        const html = generateReceiptHtml(receiptData, printerConfig);
        return NextResponse.json({ success: true, type: 'browser', html });

    } catch (error) {
        console.error('Receipt print error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// GET: レシートデータ取得
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const paymentId = searchParams.get('payment_id');

        if (!paymentId) {
            return NextResponse.json({ success: false, error: 'payment_id is required' }, { status: 400 });
        }

        const receiptData = await getReceiptData(paymentId);
        if (!receiptData) {
            return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: receiptData });

    } catch (error) {
        console.error('Receipt get error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}