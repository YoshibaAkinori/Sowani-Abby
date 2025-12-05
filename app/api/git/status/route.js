import { exec } from 'child_process';
import { NextResponse } from 'next/server';
import path from 'path';

// プロジェクトのルートディレクトリを取得
const getProjectRoot = () => {
  return process.cwd();
};

// コマンドを実行するPromiseラッパー
const execPromise = (command, cwd) => {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve(stdout.trim());
      }
    });
  });
};

export async function GET() {
  const projectRoot = getProjectRoot();

  try {
    // ローカルの最新コミット情報を取得
    const localCommit = await execPromise('git rev-parse HEAD', projectRoot);
    const localDate = await execPromise('git log -1 --format=%ci', projectRoot);
    const localMessage = await execPromise('git log -1 --format=%s', projectRoot);

    // リモートの情報を取得（fetchしてから）
    try {
      await execPromise('git fetch origin', projectRoot);
    } catch (fetchError) {
      // fetchに失敗してもローカル情報は返す
      console.error('git fetch failed:', fetchError);
    }

    // リモートの最新コミット情報を取得
    let remoteCommit = '';
    let remoteDate = '';
    let remoteMessage = '';
    let hasUpdate = false;

    try {
      remoteCommit = await execPromise('git rev-parse origin/main', projectRoot);
      remoteDate = await execPromise('git log -1 origin/main --format=%ci', projectRoot);
      remoteMessage = await execPromise('git log -1 origin/main --format=%s', projectRoot);
    } catch (remoteError) {
      // mainブランチがない場合はmasterを試す
      try {
        remoteCommit = await execPromise('git rev-parse origin/master', projectRoot);
        remoteDate = await execPromise('git log -1 origin/master --format=%ci', projectRoot);
        remoteMessage = await execPromise('git log -1 origin/master --format=%s', projectRoot);
      } catch (masterError) {
        console.error('Could not get remote info:', masterError);
      }
    }

    // リモートがローカルより新しい場合のみ更新ありと判定
    if (localCommit !== remoteCommit && remoteDate && localDate) {
      const localTime = new Date(localDate).getTime();
      const remoteTime = new Date(remoteDate).getTime();
      hasUpdate = remoteTime > localTime;
    }

    // 未コミットの変更があるかチェック
    let hasUncommittedChanges = false;
    try {
      const status = await execPromise('git status --porcelain', projectRoot);
      hasUncommittedChanges = status.length > 0;
    } catch (statusError) {
      console.error('git status failed:', statusError);
    }

    // 現在のブランチ名を取得
    let currentBranch = '';
    try {
      currentBranch = await execPromise('git branch --show-current', projectRoot);
    } catch (branchError) {
      console.error('git branch failed:', branchError);
    }

    return NextResponse.json({
      success: true,
      data: {
        localCommit,
        localDate: formatDate(localDate),
        localMessage,
        remoteCommit,
        remoteDate: formatDate(remoteDate),
        remoteMessage,
        hasUpdate,
        hasUncommittedChanges,
        currentBranch
      }
    });

  } catch (error) {
    console.error('Git status error:', error);
    return NextResponse.json({
      success: false,
      error: 'Gitの状態を取得できませんでした。Gitリポジトリであることを確認してください。',
      details: error.stderr || error.message
    }, { status: 500 });
  }
}

// 日付をフォーマット
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}