"use client";
import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Upload, 
  Download, 
  RefreshCw, 
  GitBranch, 
  Check, 
  AlertCircle,
  Terminal,
  Copy,
  Calendar,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  FileText,
  HardDrive
} from 'lucide-react';
import './Backupmanagement.css';

const BackupManagement = () => {
  // バックアップ関連の状態
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [backupCreating, setBackupCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  
  // アップデート関連の状態
  const [gitStatus, setGitStatus] = useState({
    loading: false,
    loaded: false,
    localCommit: '',
    localDate: '',
    localMessage: '',
    remoteCommit: '',
    remoteDate: '',
    remoteMessage: '',
    hasUpdate: false,
    currentBranch: '',
    error: null
  });

  // 更新実行の状態
  const [updateStatus, setUpdateStatus] = useState({
    running: false,
    completed: false,
    results: [],
    error: null
  });

  const [commandCopied, setCommandCopied] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 初回読み込み
  useEffect(() => {
    fetchBackups();
    checkGitStatus();
  }, []);

  // メッセージ表示
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  // === バックアップ機能 ===

  // バックアップ一覧を取得
  const fetchBackups = async () => {
    setBackupLoading(true);
    try {
      const response = await fetch('/api/backup');
      const data = await response.json();
      
      if (data.success) {
        setBackups(data.data.backups || []);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('バックアップ一覧取得エラー:', err);
    } finally {
      setBackupLoading(false);
    }
  };

  // バックアップを作成
  const handleCreateBackup = async () => {
    setBackupCreating(true);
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' })
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', 'バックアップを作成しました');
        fetchBackups();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showMessage('error', err.message || 'バックアップの作成に失敗しました');
    } finally {
      setBackupCreating(false);
    }
  };

  // バックアップから復元
  const handleRestore = async () => {
    if (!selectedBackup) {
      showMessage('error', '復元するバックアップを選択してください');
      return;
    }

    if (!window.confirm(`"${selectedBackup}" から復元しますか？\n現在のデータは上書きされます。`)) {
      return;
    }

    setRestoring(true);
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', filename: selectedBackup })
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', '復元が完了しました');
        setSelectedBackup(null);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showMessage('error', err.message || '復元に失敗しました');
    } finally {
      setRestoring(false);
    }
  };

  // バックアップを削除
  const handleDeleteBackup = async (filename) => {
    if (!window.confirm(`"${filename}" を削除しますか？`)) {
      return;
    }

    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', filename })
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', 'バックアップを削除しました');
        if (selectedBackup === filename) {
          setSelectedBackup(null);
        }
        fetchBackups();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showMessage('error', err.message || '削除に失敗しました');
    }
  };

  // === Git機能 ===

  // Gitステータス確認
  const checkGitStatus = async () => {
    setGitStatus(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch('/api/git/status');
      const data = await response.json();

      if (data.success) {
        setGitStatus({
          loading: false,
          loaded: true,
          ...data.data,
          error: null
        });
      } else {
        throw new Error(data.error || 'ステータス取得に失敗しました');
      }
    } catch (err) {
      setGitStatus(prev => ({
        ...prev,
        loading: false,
        loaded: true,
        error: err.message || 'Git情報の取得に失敗しました'
      }));
    }
  };

  // ワンクリックアップデート実行
  const executeFullUpdate = async () => {
    setUpdateStatus({
      running: true,
      completed: false,
      results: [],
      error: null
    });

    try {
      const response = await fetch('/api/git/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'full-update' })
      });

      const data = await response.json();

      setUpdateStatus({
        running: false,
        completed: true,
        results: data.results || [],
        error: data.success ? null : data.message
      });

      if (data.success) {
        showMessage('success', 'アップデートが完了しました！アプリを再起動してください。');
        setTimeout(() => checkGitStatus(), 1000);
      } else {
        showMessage('error', data.message || 'アップデートに失敗しました');
      }

    } catch (err) {
      setUpdateStatus({
        running: false,
        completed: true,
        results: [],
        error: err.message || 'アップデートの実行に失敗しました'
      });
      showMessage('error', 'アップデートの実行に失敗しました');
    }
  };

  // 個別コマンド実行
  const executeGitCommand = async (action, label) => {
    setUpdateStatus(prev => ({ ...prev, running: true }));

    try {
      const response = await fetch('/api/git/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', data.message || `${label}が完了しました`);
        if (action === 'fetch' || action === 'pull') {
          setTimeout(() => checkGitStatus(), 500);
        }
      } else {
        showMessage('error', data.error || `${label}に失敗しました`);
      }

    } catch (err) {
      showMessage('error', `${label}の実行に失敗しました`);
    } finally {
      setUpdateStatus(prev => ({ ...prev, running: false }));
    }
  };

  // コマンドコピー
  const copyCommand = (command) => {
    navigator.clipboard.writeText(command);
    setCommandCopied(true);
    setTimeout(() => setCommandCopied(false), 2000);
    showMessage('success', 'コマンドをコピーしました');
  };

  // ハッシュ短縮
  const shortenHash = (hash) => {
    if (!hash) return '---';
    return hash.substring(0, 7);
  };

  return (
    <div className="backup-management">
      {/* メッセージ表示 */}
      {message.text && (
        <div className={`backup-message backup-message--${message.type}`}>
          {message.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
          {message.text}
        </div>
      )}

      {/* バックアップセクション */}
      <section className="backup-section">
        <div className="backup-section__header">
          <Database className="backup-section__icon" />
          <h3 className="backup-section__title">データバックアップ</h3>
        </div>

        <div className="backup-section__content">
          <p className="backup-section__description">
            データベースをSQLファイルとしてバックアップ・復元します。
          </p>

          {/* バックアップ作成 */}
          <div className="backup-card">
            <div className="backup-card__header">
              <Download size={20} />
              <span>バックアップを作成</span>
            </div>
            <div className="backup-card__body">
              <p>現在のデータベースをSQLファイルとしてエクスポートします。</p>
              <button 
                className="backup-btn backup-btn--primary"
                onClick={handleCreateBackup}
                disabled={backupCreating}
              >
                {backupCreating ? (
                  <>
                    <Loader2 size={16} className="spinning" />
                    作成中...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    バックアップを作成
                  </>
                )}
              </button>
            </div>
          </div>

          {/* バックアップ一覧 */}
          <div className="backup-card">
            <div className="backup-card__header">
              <HardDrive size={20} />
              <span>バックアップ一覧</span>
              <button 
                className="backup-refresh-btn"
                onClick={fetchBackups}
                disabled={backupLoading}
                title="更新"
              >
                <RefreshCw size={16} className={backupLoading ? 'spinning' : ''} />
              </button>
            </div>
            <div className="backup-card__body">
              {backupLoading ? (
                <p className="backup-loading">読み込み中...</p>
              ) : backups.length === 0 ? (
                <p className="backup-empty">バックアップがありません</p>
              ) : (
                <div className="backup-list">
                  {backups.map((backup) => (
                    <div 
                      key={backup.name}
                      className={`backup-list__item ${selectedBackup === backup.name ? 'backup-list__item--selected' : ''}`}
                      onClick={() => setSelectedBackup(backup.name)}
                    >
                      <div className="backup-list__item-info">
                        <FileText size={18} />
                        <div className="backup-list__item-details">
                          <span className="backup-list__item-name">{backup.name}</span>
                          <span className="backup-list__item-meta">
                            {backup.createdAtFormatted} ・ {backup.sizeFormatted}
                          </span>
                        </div>
                      </div>
                      <button
                        className="backup-list__item-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBackup(backup.name);
                        }}
                        title="削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 復元 */}
          <div className="backup-card">
            <div className="backup-card__header">
              <Upload size={20} />
              <span>バックアップから復元</span>
            </div>
            <div className="backup-card__body">
              <p>選択したバックアップからデータベースを復元します。</p>
              
              {selectedBackup ? (
                <div className="backup-selected">
                  <FileText size={16} />
                  <span>{selectedBackup}</span>
                </div>
              ) : (
                <p className="backup-hint">上の一覧から復元するバックアップを選択してください</p>
              )}

              <button 
                className="backup-btn backup-btn--secondary"
                onClick={handleRestore}
                disabled={!selectedBackup || restoring}
              >
                {restoring ? (
                  <>
                    <Loader2 size={16} className="spinning" />
                    復元中...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    復元を実行
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* アップデートセクション */}
      <section className="backup-section">
        <div className="backup-section__header">
          <GitBranch className="backup-section__icon" />
          <h3 className="backup-section__title">アプリ更新管理</h3>
        </div>

        <div className="backup-section__content">
          <p className="backup-section__description">
            GitHubリポジトリから最新のアップデートを確認・適用します。
          </p>

          {/* バージョン情報 */}
          <div className="backup-card">
            <div className="backup-card__header">
              <RefreshCw size={20} className={gitStatus.loading ? 'spinning' : ''} />
              <span>バージョン情報</span>
            </div>
            <div className="backup-card__body">
              <button 
                className="backup-btn backup-btn--outline"
                onClick={checkGitStatus}
                disabled={gitStatus.loading}
              >
                <RefreshCw size={16} className={gitStatus.loading ? 'spinning' : ''} />
                {gitStatus.loading ? '確認中...' : 'ステータスを更新'}
              </button>

              {gitStatus.currentBranch && (
                <p className="backup-card__info" style={{ marginTop: '0.75rem' }}>
                  <GitBranch size={14} />
                  ブランチ: {gitStatus.currentBranch}
                </p>
              )}

              {gitStatus.error && (
                <div className="backup-alert backup-alert--warning">
                  <AlertCircle size={16} />
                  {gitStatus.error}
                </div>
              )}

              {gitStatus.loaded && !gitStatus.error && (
                <div className="backup-version-info">
                  <div className="backup-version-row">
                    <span className="backup-version-label">ローカル:</span>
                    <code className="backup-version-hash">{shortenHash(gitStatus.localCommit)}</code>
                    <span className="backup-version-date">{gitStatus.localDate}</span>
                  </div>
                  {gitStatus.localMessage && (
                    <div className="backup-version-message">
                      {gitStatus.localMessage}
                    </div>
                  )}
                  
                  <div className="backup-version-row" style={{ marginTop: '0.75rem' }}>
                    <span className="backup-version-label">リモート:</span>
                    <code className="backup-version-hash">{shortenHash(gitStatus.remoteCommit)}</code>
                    <span className="backup-version-date">{gitStatus.remoteDate}</span>
                  </div>
                  {gitStatus.remoteMessage && (
                    <div className="backup-version-message">
                      {gitStatus.remoteMessage}
                    </div>
                  )}

                  {gitStatus.hasUpdate && (
                    <div className="backup-alert backup-alert--info" style={{ marginTop: '1rem' }}>
                      <RefreshCw size={16} />
                      新しいバージョンが利用可能です！
                    </div>
                  )}
                  
                  {!gitStatus.hasUpdate && gitStatus.localCommit && (
                    <div className="backup-alert backup-alert--success" style={{ marginTop: '1rem' }}>
                      <Check size={16} />
                      最新バージョンです
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* バッチファイルでアップデート */}
          <div className="backup-card backup-card--highlight">
            <div className="backup-card__header">
              <Play size={20} />
              <span>アプリを更新する</span>
            </div>
            <div className="backup-card__body">
              <p>最新版に更新するには、以下のバッチファイルを実行してください：</p>
              
              <div className="backup-command" style={{ marginTop: '1rem' }}>
                <span className="backup-command-label">実行するファイル</span>
                <div className="backup-command-box">
                  <code>docker\update.bat</code>
                  <button 
                    className="backup-command-copy"
                    onClick={() => copyCommand('docker\\update.bat')}
                    title="コピー"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <div className="backup-alert backup-alert--info" style={{ marginTop: '1rem' }}>
                <AlertCircle size={16} />
                <div>
                  <strong>手順:</strong><br />
                  1. エクスプローラーで <code>docker</code> フォルダを開く<br />
                  2. <code>update.bat</code> をダブルクリック<br />
                  3. 完了後、ブラウザを更新
                </div>
              </div>

              {commandCopied && (
                <div className="backup-copy-toast">
                  <Check size={14} />
                  コピーしました
                </div>
              )}
            </div>
          </div>

          {/* 手動コマンド（折りたたみ） */}
          <details className="backup-card backup-details">
            <summary className="backup-card__header backup-details__summary">
              <Terminal size={20} />
              <span>手動コマンド（ターミナル用）</span>
            </summary>
            <div className="backup-card__body">
              <p>問題が発生した場合は、ターミナルで直接実行してください：</p>
              
              <div className="backup-command-list">
                {[
                  { label: '変更を確認', cmd: 'git fetch origin' },
                  { label: '差分を確認', cmd: 'git log HEAD..origin/main --oneline' },
                  { label: 'アップデート適用', cmd: 'git pull origin main' },
                  { label: '依存関係更新', cmd: 'npm install' },
                  { label: 'アプリ再起動', cmd: 'npm run dev' }
                ].map((item, index) => (
                  <div key={index} className="backup-command">
                    <span className="backup-command-label">{index + 1}. {item.label}</span>
                    <div className="backup-command-box">
                      <code>{item.cmd}</code>
                      <button 
                        className="backup-command-copy"
                        onClick={() => copyCommand(item.cmd)}
                        title="コピー"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {commandCopied && (
                <div className="backup-copy-toast">
                  <Check size={14} />
                  コピーしました
                </div>
              )}
            </div>
          </details>
        </div>
      </section>
    </div>
  );
};

export default BackupManagement;