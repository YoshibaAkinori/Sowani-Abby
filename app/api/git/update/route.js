import { exec } from 'child_process';
import { NextResponse } from 'next/server';

// プロジェクトのルートディレクトリを取得
const getProjectRoot = () => {
    return process.cwd();
};

// コマンドを実行するPromiseラッパー
const execPromise = (command, cwd) => {
    return new Promise((resolve, reject) => {
        exec(command, { cwd, encoding: 'utf8' }, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stderr, stdout });
            } else {
                resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
            }
        });
    });
};

export async function POST(request) {
    const projectRoot = getProjectRoot();

    try {
        const body = await request.json();
        const { action } = body;

        switch (action) {
            case 'pull': {
                // git pull を実行
                const result = await execPromise('git pull origin main', projectRoot)
                    .catch(async (err) => {
                        // mainがなければmasterを試す
                        return await execPromise('git pull origin master', projectRoot);
                    });

                return NextResponse.json({
                    success: true,
                    action: 'pull',
                    output: result.stdout,
                    message: 'アップデートを適用しました'
                });
            }

            case 'fetch': {
                // git fetch を実行
                const result = await execPromise('git fetch origin', projectRoot);

                return NextResponse.json({
                    success: true,
                    action: 'fetch',
                    output: result.stdout || 'リモート情報を取得しました',
                    message: 'リモート情報を取得しました'
                });
            }

            case 'npm-install': {
                // npm install を実行
                const result = await execPromise('npm install', projectRoot);

                return NextResponse.json({
                    success: true,
                    action: 'npm-install',
                    output: result.stdout,
                    message: '依存関係を更新しました'
                });
            }

            case 'full-update': {
                const results = [];

                // 1. 未コミットの変更をチェック
                try {
                    const statusResult = await execPromise('git status --porcelain', projectRoot);
                    if (statusResult.stdout && statusResult.stdout.length > 0) {
                        return NextResponse.json({
                            success: false,
                            action: 'full-update',
                            results: [{ step: 'check', success: false, output: 'ローカルに未コミットの変更があります' }],
                            message: '本番環境でファイルが変更されています。手動で確認してください。'
                        }, { status: 400 });
                    }
                    results.push({ step: 'check', success: true, output: 'OK' });
                } catch (checkError) {
                    results.push({ step: 'check', success: false, error: checkError.stderr });
                }

                // 2. git fetch
                try {
                    const fetchResult = await execPromise('git fetch origin', projectRoot);
                    results.push({ step: 'fetch', success: true, output: fetchResult.stdout || 'OK' });
                } catch (fetchError) {
                    results.push({ step: 'fetch', success: false, error: fetchError.stderr });
                }

                // 3. git pull
                try {
                    const pullResult = await execPromise('git pull origin main', projectRoot)
                        .catch(async () => {
                            return await execPromise('git pull origin master', projectRoot);
                        });
                    results.push({ step: 'pull', success: true, output: pullResult.stdout });
                } catch (pullError) {
                    results.push({ step: 'pull', success: false, error: pullError.stderr });
                    return NextResponse.json({
                        success: false,
                        action: 'full-update',
                        results,
                        message: 'git pull に失敗しました。'
                    }, { status: 500 });
                }

                // 4. npm install
                try {
                    const npmResult = await execPromise('npm install', projectRoot);
                    results.push({ step: 'npm-install', success: true, output: 'OK' });
                } catch (npmError) {
                    results.push({ step: 'npm-install', success: false, error: npmError.stderr });
                }

                const allSuccess = results.every(r => r.success);

                return NextResponse.json({
                    success: allSuccess,
                    action: 'full-update',
                    results,
                    message: allSuccess
                        ? 'アップデートが完了しました。アプリを再起動してください。'
                        : '一部のステップでエラーが発生しました。'
                });
            }

            default:
                return NextResponse.json({
                    success: false,
                    error: '不明なアクションです'
                }, { status: 400 });
        }

    } catch (error) {
        console.error('Git update error:', error);
        return NextResponse.json({
            success: false,
            error: 'コマンドの実行に失敗しました',
            details: error.stderr || error.message || String(error)
        }, { status: 500 });
    }
}