// app/api/settings/printer/route.js
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// 設定ファイルのパス
const CONFIG_PATH = path.join(process.cwd(), 'config', 'printer.json');

// デフォルト設定
const DEFAULT_CONFIG = {
  printer_type: 'browser', // 'browser' | 'network'
  printer_ip: '',
  printer_port: 9100,
  auto_print: true, // 会計完了時に自動印刷
  shop_name: 'Sowani ABBY',
  shop_message: 'ありがとうございました\nまたのご来店をお待ちしております'
};

// 設定ディレクトリ作成
async function ensureConfigDir() {
  const configDir = path.dirname(CONFIG_PATH);
  try {
    await fs.access(configDir);
  } catch {
    await fs.mkdir(configDir, { recursive: true });
  }
}

// 設定読み込み
async function loadConfig() {
  try {
    await ensureConfigDir();
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch (error) {
    // ファイルがなければデフォルト設定を返す
    return DEFAULT_CONFIG;
  }
}

// 設定保存
async function saveConfig(config) {
  await ensureConfigDir();
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

// GET: 設定取得
export async function GET() {
  try {
    const config = await loadConfig();
    return NextResponse.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Printer config load error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: 設定保存
export async function POST(request) {
  try {
    const body = await request.json();
    const currentConfig = await loadConfig();

    // 更新する設定をマージ
    const newConfig = {
      ...currentConfig,
      ...body
    };

    // バリデーション
    if (newConfig.printer_type === 'network') {
      if (!newConfig.printer_ip) {
        return NextResponse.json(
          { success: false, error: 'ネットワーク印刷にはIPアドレスが必要です' },
          { status: 400 }
        );
      }
      // IP形式チェック
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(newConfig.printer_ip)) {
        return NextResponse.json(
          { success: false, error: 'IPアドレスの形式が正しくありません' },
          { status: 400 }
        );
      }
    }

    // ポート番号チェック
    if (newConfig.printer_port < 1 || newConfig.printer_port > 65535) {
      return NextResponse.json(
        { success: false, error: 'ポート番号は1〜65535の範囲で指定してください' },
        { status: 400 }
      );
    }

    await saveConfig(newConfig);

    return NextResponse.json({
      success: true,
      message: 'プリンター設定を保存しました',
      data: newConfig
    });
  } catch (error) {
    console.error('Printer config save error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT: 接続テスト
export async function PUT(request) {
  try {
    const body = await request.json();
    const { printer_ip, printer_port = 9100 } = body;

    if (!printer_ip) {
      return NextResponse.json(
        { success: false, error: 'IPアドレスを指定してください' },
        { status: 400 }
      );
    }

    // TCP接続テスト
    const net = await import('net');
    
    const testConnection = () => {
      return new Promise((resolve, reject) => {
        const client = new net.Socket();
        client.setTimeout(3000);

        client.connect(printer_port, printer_ip, () => {
          client.destroy();
          resolve({ success: true });
        });

        client.on('error', (err) => {
          client.destroy();
          reject(err);
        });

        client.on('timeout', () => {
          client.destroy();
          reject(new Error('接続タイムアウト'));
        });
      });
    };

    await testConnection();

    return NextResponse.json({
      success: true,
      message: `プリンター (${printer_ip}:${printer_port}) に接続できました`
    });

  } catch (error) {
    console.error('Printer connection test error:', error);
    return NextResponse.json({
      success: false,
      error: `接続失敗: ${error.message}`
    }, { status: 400 });
  }
}