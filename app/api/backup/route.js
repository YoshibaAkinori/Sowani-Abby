import { exec } from 'child_process';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// バックアップ保存先ディレクトリ（環境変数 or デフォルト）
const getBackupDir = () => {
  const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
};

// コマンド実行のPromiseラッパー
const execPromise = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr, stdout });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

// GET: バックアップ一覧を取得
export async function GET() {
  try {
    const backupDir = getBackupDir();
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          createdAt: stats.mtime.toISOString(),
          createdAtFormatted: formatDate(stats.mtime)
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return NextResponse.json({
      success: true,
      data: {
        backups: files,
        backupDir: backupDir
      }
    });

  } catch (error) {
    console.error('バックアップ一覧取得エラー:', error);
    return NextResponse.json({
      success: false,
      error: 'バックアップ一覧の取得に失敗しました'
    }, { status: 500 });
  }
}

// POST: バックアップ作成 or 復元
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, filename } = body;

    // Docker環境変数から接続情報を取得
    const dbUser = process.env.DB_USER || 'salon_user';
    const dbPassword = process.env.DB_PASSWORD || 'salon_password';
    const dbName = process.env.DB_NAME || 'salon_db';
    const containerName = 'salon_mysql';

    switch (action) {
      case 'create': {
        // バックアップファイル名を生成
        const timestamp = new Date().toISOString()
          .replace(/[:.]/g, '-')
          .replace('T', '_')
          .slice(0, 19);
        const backupFileName = `backup_${timestamp}.sql`;
        const backupDir = getBackupDir();
        const backupPath = path.join(backupDir, backupFileName);

        // mysqldumpコマンドを実行
        const dumpCommand = `docker exec ${containerName} mysqldump -u ${dbUser} -p${dbPassword} ${dbName}`;
        
        const result = await execPromise(dumpCommand);
        
        // ファイルに書き込み
        fs.writeFileSync(backupPath, result.stdout, 'utf8');
        
        const stats = fs.statSync(backupPath);

        return NextResponse.json({
          success: true,
          message: 'バックアップを作成しました',
          data: {
            filename: backupFileName,
            path: backupPath,
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            createdAt: new Date().toISOString()
          }
        });
      }

      case 'restore': {
        if (!filename) {
          return NextResponse.json({
            success: false,
            error: '復元するファイル名を指定してください'
          }, { status: 400 });
        }

        const backupDir = getBackupDir();
        const backupPath = path.join(backupDir, filename);

        // ファイル存在確認
        if (!fs.existsSync(backupPath)) {
          return NextResponse.json({
            success: false,
            error: '指定されたバックアップファイルが見つかりません'
          }, { status: 404 });
        }

        // SQLファイルを読み込んでリストア
        // Windowsでも動作するようにcatではなくファイル読み込み+パイプを使用
        const sqlContent = fs.readFileSync(backupPath, 'utf8');
        
        // 一時ファイルをコンテナ内にコピーしてリストア
        const tempFileName = `temp_restore_${Date.now()}.sql`;
        const tempHostPath = path.join(backupDir, tempFileName);
        
        // 一時ファイル作成
        fs.writeFileSync(tempHostPath, sqlContent, 'utf8');
        
        try {
          // コンテナにファイルをコピー
          await execPromise(`docker cp "${tempHostPath}" ${containerName}:/tmp/${tempFileName}`);
          
          // リストア実行
          const restoreCommand = `docker exec ${containerName} sh -c "mysql -u ${dbUser} -p${dbPassword} ${dbName} < /tmp/${tempFileName}"`;
          await execPromise(restoreCommand);
          
          // コンテナ内の一時ファイルを削除
          await execPromise(`docker exec ${containerName} rm /tmp/${tempFileName}`);
          
        } finally {
          // ホスト側の一時ファイルを削除
          if (fs.existsSync(tempHostPath)) {
            fs.unlinkSync(tempHostPath);
          }
        }

        return NextResponse.json({
          success: true,
          message: `バックアップ "${filename}" から復元しました`
        });
      }

      case 'delete': {
        if (!filename) {
          return NextResponse.json({
            success: false,
            error: '削除するファイル名を指定してください'
          }, { status: 400 });
        }

        const backupDir = getBackupDir();
        const backupPath = path.join(backupDir, filename);

        if (!fs.existsSync(backupPath)) {
          return NextResponse.json({
            success: false,
            error: '指定されたファイルが見つかりません'
          }, { status: 404 });
        }

        fs.unlinkSync(backupPath);

        return NextResponse.json({
          success: true,
          message: `バックアップ "${filename}" を削除しました`
        });
      }

      default:
        return NextResponse.json({
          success: false,
          error: '不明なアクションです'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('バックアップ処理エラー:', error);
    return NextResponse.json({
      success: false,
      error: error.stderr || error.message || 'バックアップ処理に失敗しました',
      details: error.stdout || ''
    }, { status: 500 });
  }
}

// ファイルサイズをフォーマット
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 日付をフォーマット
function formatDate(date) {
  return new Date(date).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}