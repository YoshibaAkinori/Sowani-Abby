// app/api/receipt/print/route.js
import { NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';
import net from 'net';

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

// レシートデータ取得
async function getReceiptData(paymentId) {
  const pool = await getConnection();
  
  // 親支払い情報取得
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

  // オプション情報取得
  const [options] = await pool.execute(`
    SELECT * FROM payment_options WHERE payment_id = ?
  `, [paymentId]);

  // 子支払い取得
  const [childPayments] = await pool.execute(`
    SELECT p.*
    FROM payments p
    WHERE p.related_payment_id = ?
  `, [paymentId]);

  // 孫支払い取得
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

  // チケット情報を取得（残り回数・残金も含める）
  const allPayments = [payment, ...childPayments, ...grandchildPayments];
  const ticketIds = [...new Set(allPayments.filter(p => p.ticket_id).map(p => p.ticket_id))];
  let ticketInfoMap = new Map();

  if (ticketIds.length > 0) {
    const placeholders = ticketIds.map(() => '?').join(',');
    const [ticketInfo] = await pool.execute(`
      SELECT 
        ct.customer_ticket_id,
        ct.sessions_remaining,
        ct.purchase_price,
        tp.name as plan_name,
        tp.total_sessions,
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
        purchase_price: info.purchase_price,
        total_paid: info.total_paid,
        remaining_balance: (info.purchase_price || 0) - (info.total_paid || 0)
      });
    });
  }

  // データ整理
  const ticketPurchases = [];
  const ticketUses = [];
  let totalAmount = payment.total_amount || 0;

  // 親が回数券購入の場合
  const isParentTicketPurchase = payment.payment_type === 'ticket' &&
    payment.service_name &&
    payment.service_name.includes('回数券購入');

  // 親が回数券使用の場合
  const isParentTicketUse = payment.payment_type === 'ticket' && 
    payment.ticket_id && 
    !isParentTicketPurchase;

  // 親が回数券購入の場合
  if (isParentTicketPurchase && payment.ticket_id) {
    const ticketInfo = ticketInfoMap.get(payment.ticket_id);
    if (ticketInfo) {
      ticketPurchases.push({
        plan_name: ticketInfo.plan_name,
        service_name: ticketInfo.service_name,
        total_sessions: ticketInfo.total_sessions,
        sessions_remaining: ticketInfo.sessions_remaining,
        purchase_price: ticketInfo.purchase_price,
        remaining_balance: ticketInfo.remaining_balance,
        amount: payment.total_amount
      });
    }
  }

  // 親が回数券使用の場合
  if (isParentTicketUse && payment.ticket_id) {
    const ticketInfo = ticketInfoMap.get(payment.ticket_id);
    if (ticketInfo) {
      // 子に残金支払いがあるか確認
      const remainingPaymentChild = childPayments.find(
        child => child.ticket_id === payment.ticket_id && 
                 child.payment_amount > 0 &&
                 !child.notes?.includes('回数券購入時の初回使用')
      );
      
      ticketUses.push({
        plan_name: ticketInfo.plan_name,
        service_name: ticketInfo.service_name,
        total_sessions: ticketInfo.total_sessions,
        sessions_remaining: ticketInfo.sessions_remaining,
        purchase_price: ticketInfo.purchase_price,
        remaining_balance: ticketInfo.remaining_balance,
        // 残金支払いは子から取得
        remaining_payment: remainingPaymentChild?.payment_amount || payment.payment_amount || 0
      });
    }
  }

  // 子支払いの処理
  for (const child of childPayments) {
    // 回数券購入
    if (child.service_name && child.service_name.includes('回数券購入')) {
      const ticketInfo = ticketInfoMap.get(child.ticket_id);
      ticketPurchases.push({
        plan_name: ticketInfo?.plan_name || child.service_name,
        service_name: ticketInfo?.service_name || '',
        total_sessions: ticketInfo?.total_sessions || 0,
        sessions_remaining: ticketInfo?.sessions_remaining || 0,
        purchase_price: ticketInfo?.purchase_price || 0,
        remaining_balance: ticketInfo?.remaining_balance || 0,
        amount: child.total_amount,
        payment_method: child.payment_method,
        cash_amount: child.cash_amount,
        card_amount: child.card_amount
      });
      totalAmount += child.total_amount || 0;
    }
    // 回数券使用（初回使用以外）
    // 親が回数券使用の場合、同じticket_idの子はスキップ（重複防止）
    else if (child.payment_type === 'ticket' && child.ticket_id) {
      const isImmediateUse = child.notes && child.notes.includes('回数券購入時の初回使用');
      const isParentSameTicket = isParentTicketUse && child.ticket_id === payment.ticket_id;
      
      if (!isImmediateUse && !isParentSameTicket) {
        const ticketInfo = ticketInfoMap.get(child.ticket_id);
        ticketUses.push({
          plan_name: ticketInfo?.plan_name || '',
          service_name: ticketInfo?.service_name || '',
          total_sessions: ticketInfo?.total_sessions || 0,
          sessions_remaining: ticketInfo?.sessions_remaining || 0,
          purchase_price: ticketInfo?.purchase_price || 0,
          remaining_balance: ticketInfo?.remaining_balance || 0,
          remaining_payment: child.payment_amount || 0
        });
        if (child.payment_amount > 0) {
          totalAmount += child.payment_amount;
        }
      }
    }
  }

  // 孫支払いの処理
  for (const grandchild of grandchildPayments) {
    if (grandchild.service_name && grandchild.service_name.includes('回数券購入')) {
      const ticketInfo = ticketInfoMap.get(grandchild.ticket_id);
      ticketPurchases.push({
        plan_name: ticketInfo?.plan_name || grandchild.service_name,
        service_name: ticketInfo?.service_name || '',
        total_sessions: ticketInfo?.total_sessions || 0,
        sessions_remaining: ticketInfo?.sessions_remaining || 0,
        purchase_price: ticketInfo?.purchase_price || 0,
        remaining_balance: ticketInfo?.remaining_balance || 0,
        amount: grandchild.total_amount,
        payment_method: grandchild.payment_method,
        cash_amount: grandchild.cash_amount,
        card_amount: grandchild.card_amount
      });
      totalAmount += grandchild.total_amount || 0;
    }
  }

  // 合計金額の集計（現金・カード別）
  let totalCash = payment.cash_amount || 0;
  let totalCard = payment.card_amount || 0;

  for (const child of childPayments) {
    totalCash += child.cash_amount || 0;
    totalCard += child.card_amount || 0;
  }
  for (const grandchild of grandchildPayments) {
    totalCash += grandchild.cash_amount || 0;
    totalCard += grandchild.card_amount || 0;
  }

  // 支払方法の判定
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
    grandchildPayments
  };
}

// ESC/POSコマンド生成（ネットワーク印刷用）
function generateEscPosCommands(data) {
  const { payment, options, ticketPurchases, ticketUses } = data;
  let commands = '';

  // 初期化
  commands += COMMANDS.INIT;

  // ヘッダー（店名）
  commands += COMMANDS.CENTER;
  commands += COMMANDS.DOUBLE_SIZE;
  commands += COMMANDS.BOLD_ON;
  commands += 'Sowani ABBY\n';
  commands += COMMANDS.NORMAL_SIZE;
  commands += COMMANDS.BOLD_OFF;
  commands += '\n';

  // 日時
  commands += COMMANDS.CENTER;
  const date = new Date(payment.payment_date);
  commands += date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }) + '\n';
  commands += '\n';

  // 区切り線
  commands += '--------------------------------\n';

  // 顧客名
  commands += COMMANDS.LEFT;
  commands += `お客様: ${payment.last_name} ${payment.first_name} 様\n`;
  commands += `担当: ${payment.staff_name || '-'}\n`;
  commands += '--------------------------------\n';

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
    commands += '--------------------------------\n';
    commands += '【回数券使用】\n';
    for (const t of ticketUses) {
      commands += `${t.plan_name}\n`;
      if (t.remaining_payment > 0) {
        commands += formatLine('  残金支払', t.remaining_payment);
      }
      commands += `  残り ${t.sessions_remaining}/${t.total_sessions} 回`;
      commands += t.remaining_balance > 0 ? ` / 残金 ¥${t.remaining_balance.toLocaleString()}\n` : ' / 支払完了\n';
    }
  }

  // 回数券購入
  if (ticketPurchases && ticketPurchases.length > 0) {
    commands += '--------------------------------\n';
    commands += '【回数券購入】\n';
    for (const t of ticketPurchases) {
      commands += `${t.plan_name}\n`;
      commands += formatLine('  金額', t.amount);
      commands += `  残り ${t.sessions_remaining}/${t.total_sessions} 回`;
      commands += t.remaining_balance > 0 ? ` / 残金 ¥${t.remaining_balance.toLocaleString()}\n` : ' / 支払完了\n';
    }
  }

  commands += '--------------------------------\n';

  // 合計
  commands += COMMANDS.BOLD_ON;
  commands += COMMANDS.DOUBLE_HEIGHT;
  commands += formatLine('合計', payment.total_amount);
  commands += COMMANDS.NORMAL_SIZE;
  commands += COMMANDS.BOLD_OFF;

  // 支払方法
  commands += '--------------------------------\n';
  if (payment.payment_method === 'cash') {
    commands += formatLine('現金', payment.cash_amount);
  } else if (payment.payment_method === 'card') {
    commands += formatLine('カード', payment.card_amount);
  } else if (payment.payment_method === 'mixed') {
    commands += formatLine('現金', payment.cash_amount);
    commands += formatLine('カード', payment.card_amount);
  }

  // フッター
  commands += '\n';
  commands += COMMANDS.CENTER;
  commands += 'ありがとうございました\n';
  commands += 'またのご来店をお待ちしております\n';
  commands += '\n';

  // 紙送りとカット
  commands += COMMANDS.FEED;
  commands += COMMANDS.PARTIAL_CUT;

  return commands;
}

// 行フォーマット（左寄せ項目名、右寄せ金額）
function formatLine(label, amount) {
  const amountStr = `¥${Number(amount).toLocaleString()}`;
  const totalWidth = 32;
  const spaces = totalWidth - label.length - amountStr.length;
  return label + ' '.repeat(Math.max(1, spaces)) + amountStr + '\n';
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

    client.on('close', () => {
      resolve({ success: true });
    });

    client.on('error', (err) => {
      reject(err);
    });

    client.on('timeout', () => {
      client.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}

// HTML生成（ブラウザ印刷用）
function generateReceiptHtml(data) {
  const { payment, options, ticketPurchases, ticketUses } = data;
  const date = new Date(payment.payment_date);

  // オプションHTML
  let optionsHtml = '';
  if (options && options.length > 0) {
    optionsHtml = options.map(opt => {
      const price = opt.is_free ? 0 : opt.price;
      const suffix = opt.is_free ? '<span class="free">(無料)</span>' : '';
      return `
        <tr>
          <td class="item-name">${opt.option_name}${suffix}</td>
          <td class="item-price">¥${price.toLocaleString()}</td>
        </tr>
      `;
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
            ${t.remaining_payment > 0 ? `<span style="color:#dc2626">残金支払 ¥${t.remaining_payment.toLocaleString()}</span>` : ''}
          </div>
          <div class="ticket-detail">
            残り ${t.sessions_remaining}/${t.total_sessions} 回
            ${t.remaining_balance > 0 ? ` ／ 残金 ¥${t.remaining_balance.toLocaleString()}` : ' ／ 支払完了'}
          </div>
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
          <div class="ticket-item">
            <span>${t.plan_name || t.service_name}</span>
            <span>¥${(t.amount || 0).toLocaleString()}</span>
          </div>
          <div class="ticket-detail">
            残り ${t.sessions_remaining}/${t.total_sessions} 回
            ${t.remaining_balance > 0 ? ` ／ 残金 ¥${t.remaining_balance.toLocaleString()}` : ' ／ 支払完了'}
          </div>
        `).join('')}
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>レシート</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'MS Gothic', 'Hiragino Kaku Gothic ProN', monospace;
      font-size: 12px;
      width: 80mm;
      padding: 5mm;
      background: white;
    }
    .header {
      text-align: center;
      margin-bottom: 10px;
    }
    .shop-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .date {
      font-size: 11px;
      color: #333;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    .customer-info {
      margin-bottom: 5px;
    }
    .service-name {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
    }
    .items-table td {
      padding: 2px 0;
    }
    .item-name {
      text-align: left;
    }
    .item-price {
      text-align: right;
      white-space: nowrap;
    }
    .free {
      font-size: 10px;
      color: #666;
    }
    .discount {
      color: #c00;
    }
    .total-section {
      margin-top: 5px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-size: 16px;
      padding: 5px 0;
    }
    .payment-method {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
    }
    .section {
      margin-top: 10px;
    }
    .section-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .ticket-item {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
    }
    .ticket-detail {
      font-size: 10px;
      color: #666;
      margin-left: 10px;
      margin-bottom: 5px;
    }
    .footer {
      text-align: center;
      margin-top: 15px;
      font-size: 11px;
    }
    @media print {
      body {
        width: 80mm;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="shop-name">Sowani ABBY</div>
    <div class="date">${date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })}</div>
  </div>

  <div class="divider"></div>

  <div class="customer-info">
    <div>お客様: ${payment.last_name} ${payment.first_name} 様</div>
    <div>担当: ${payment.staff_name || '-'}</div>
  </div>

  <div class="divider"></div>

  <div class="service-name">${payment.service_name || '施術'}</div>

  <table class="items-table">
    ${payment.service_subtotal > 0 ? `
    <tr>
      <td class="item-name">小計</td>
      <td class="item-price">¥${payment.service_subtotal.toLocaleString()}</td>
    </tr>
    ` : ''}
    ${optionsHtml}
    ${payment.discount_amount > 0 ? `
    <tr class="discount">
      <td class="item-name">割引</td>
      <td class="item-price">-¥${payment.discount_amount.toLocaleString()}</td>
    </tr>
    ` : ''}
  </table>

  ${ticketUseHtml}
  ${ticketPurchaseHtml}

  <div class="divider"></div>

  <div class="total-section">
    <div class="total-row">
      <span>合計</span>
      <span>¥${payment.total_amount.toLocaleString()}</span>
    </div>
  </div>

  <div class="divider"></div>

  <div class="payment-methods">
    ${payment.payment_method === 'cash' ? `
    <div class="payment-method">
      <span>現金</span>
      <span>¥${payment.cash_amount.toLocaleString()}</span>
    </div>
    ` : ''}
    ${payment.payment_method === 'card' ? `
    <div class="payment-method">
      <span>カード</span>
      <span>¥${payment.card_amount.toLocaleString()}</span>
    </div>
    ` : ''}
    ${payment.payment_method === 'mixed' ? `
    <div class="payment-method">
      <span>現金</span>
      <span>¥${payment.cash_amount.toLocaleString()}</span>
    </div>
    <div class="payment-method">
      <span>カード</span>
      <span>¥${payment.card_amount.toLocaleString()}</span>
    </div>
    ` : ''}
  </div>

  <div class="footer">
    <p>ありがとうございました</p>
    <p>またのご来店をお待ちしております</p>
  </div>
</body>
</html>
  `;
}

// POST: レシート印刷
export async function POST(request) {
  try {
    const body = await request.json();
    const { payment_id, print_type } = body;

    if (!payment_id) {
      return NextResponse.json(
        { success: false, error: 'payment_id is required' },
        { status: 400 }
      );
    }

    // レシートデータ取得
    const receiptData = await getReceiptData(payment_id);
    if (!receiptData) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // 環境変数から設定取得
    const printerType = process.env.PRINTER_TYPE || 'browser';
    const printerIp = process.env.PRINTER_IP;
    const printerPort = parseInt(process.env.PRINTER_PORT || '9100');

    // ネットワーク印刷
    if ((print_type === 'network' || printerType === 'network') && printerIp) {
      try {
        const commands = generateEscPosCommands(receiptData);
        await printToNetwork(commands, printerIp, printerPort);
        return NextResponse.json({
          success: true,
          message: 'レシートを印刷しました',
          type: 'network'
        });
      } catch (err) {
        console.error('Network print error:', err);
        // ネットワーク印刷失敗時はHTMLを返す
        const html = generateReceiptHtml(receiptData);
        return NextResponse.json({
          success: true,
          type: 'browser',
          html,
          fallback: true,
          error: err.message
        });
      }
    }

    // ブラウザ印刷用HTML返却
    const html = generateReceiptHtml(receiptData);
    return NextResponse.json({
      success: true,
      type: 'browser',
      html
    });

  } catch (error) {
    console.error('Receipt print error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET: レシートデータ取得（表示用）
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('payment_id');

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'payment_id is required' },
        { status: 400 }
      );
    }

    const receiptData = await getReceiptData(paymentId);
    if (!receiptData) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: receiptData
    });

  } catch (error) {
    console.error('Receipt get error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}