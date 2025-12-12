// app/api/settings/pin/route.js
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'config', 'pin.json');
const DEFAULT_PIN = '0000';

// 設定ディレクトリ作成
async function ensureConfigDir() {
  const configDir = path.dirname(CONFIG_PATH);
  try {
    await fs.access(configDir);
  } catch {
    await fs.mkdir(configDir, { recursive: true });
  }
}

// PIN読み込み
async function loadPin() {
  try {
    await ensureConfigDir();
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(data);
    return config.pin || DEFAULT_PIN;
  } catch {
    return DEFAULT_PIN;
  }
}

// PIN保存
async function savePin(pin) {
  await ensureConfigDir();
  await fs.writeFile(CONFIG_PATH, JSON.stringify({ pin }, null, 2), 'utf-8');
}

// POST: PIN検証
export async function POST(request) {
  try {
    const { action, pin, newPin } = await request.json();

    if (action === 'verify') {
      // PIN検証
      const storedPin = await loadPin();
      const isValid = pin === storedPin;
      return NextResponse.json({ success: true, valid: isValid });
    }

    if (action === 'change') {
      // PIN変更
      const storedPin = await loadPin();
      
      if (pin !== storedPin) {
        return NextResponse.json({ success: false, error: '現在のPINが正しくありません' });
      }

      if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        return NextResponse.json({ success: false, error: 'PINは4桁の数字で入力してください' });
      }

      await savePin(newPin);
      return NextResponse.json({ success: true, message: 'PINを変更しました' });
    }

    return NextResponse.json({ success: false, error: '不正なアクションです' }, { status: 400 });

  } catch (error) {
    console.error('PIN API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}