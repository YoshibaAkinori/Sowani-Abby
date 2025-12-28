"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, Users, Clock, Sparkles, Settings2, Calculator, Gift, Database, FileText, Printer, Link2, Key, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import StaffManagement from './set_component/StaffManagement';
import ShiftManagement from './set_component/ShiftManagement';
import ServicesManagement from './set_component/ServicesManagement';
import OptionsManagement from './set_component/OptionsManagement';
import RegisterClosing from './set_component/RegisterClosing';
import BackupManagement from './set_component/Backupmanagement';
import PrinterSettings from './set_component/PrinterSettings';
import LineMarketing from './set_component/LineMarketing';
import LineLinkManagement from './set_component/LineLinkManagement';
import PinAuth from './set_component/PinAuth';
import PinChange from './set_component/PinChange';
import InitialDataImport from './set_component/InitialDataImport';
import './settings.css';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('staff');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const settingsMenu = [
    { id: 'staff', label: 'スタッフ管理', icon: Users, description: 'スタッフ情報の登録' },
    { id: 'shift', label: 'シフト管理', icon: Clock, description: 'スタッフのシフト・勤務時間管理' },
    { id: 'courses', label: '施術コース管理', icon: Sparkles, description: '施術メニュー・コース・料金設定' },
    { id: 'options', label: 'オプション管理', icon: Settings2, description: '追加オプション・料金設定' },
    { id: 'register-close', label: 'レジ締め管理', icon: Calculator, description: '日次売上締め・集計管理' },
    { id: 'printer', label: 'プリンター設定', icon: Printer, description: 'レシート印刷・プリンター接続設定' },
    { id: 'coupon', label: 'クーポン送信管理', icon: Gift, description: 'クーポン作成・配信・管理' },
    { id: 'line-link', label: 'LINE連携管理', icon: Link2, description: 'LINE友だち連携の管理' },
    { id: 'pin', label: 'PIN設定', icon: Key, description: '設定画面のPINコード変更' },
    { id: 'backup', label: 'バックアップ管理', icon: Database, description: 'データバックアップ・復元管理' },
    { id: 'initial-data', label: '初期データ登録', icon: Upload, description: '顧客・回数券の一括登録' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'staff':
        return (
          <div>
            <h2 className="settings__content-title">スタッフ管理</h2>
            <p className="settings__content-description">
              スタッフの基本情報の設定を行います。新規スタッフの登録から既存スタッフの情報編集まで一元管理できます。</p>
            <StaffManagement />
          </div>
        );
      case 'shift':
        return (
          <div>
            <h2 className="settings__content-title">シフト管理</h2>
            <div className="settings__content-card">
              <p className="settings__content-description">スタッフのシフトスケジュール作成・勤務実績の確認</p>
              <ShiftManagement />
            </div>
          </div>
        );
      case 'courses':
        return (
          <div>
            <h2 className="settings__content-title">施術コース管理</h2>
            <div className="settings__content-card">
              <p className="settings__content-description">フェイシャル、ボディトリートメントなどの施術コースの登録・編集を行います。料金設定、施術時間、説明文なども管理できます。</p>
              <ServicesManagement />
            </div>
          </div>
        );
      case 'options':
        return (
          <div>
            <h2 className="settings__content-title">オプション管理</h2>
            <div className="settings__content-card">
              <p className="settings__content-description">施術に追加可能なオプションメニューの管理を行います。追加料金、所要時間の設定から、組み合わせ可能なコースとの関連付けまで設定できます。</p>
              <OptionsManagement />
            </div>
          </div>
        );
      case 'register-close':
        return (
          <div>
            <h2 className="settings__content-title">レジ締め管理</h2>
            <div className="settings__content-card">
              <p className="settings__content-description">日次の売上集計、レジ締め作業を管理します。現金・カード決済の実績確認、売上レポートの出力、差異チェック機能を提供します。</p>
              <RegisterClosing />
            </div>
          </div>
        );
      case 'printer':
        return (
          <div>
            <h2 className="settings__content-title">プリンター設定</h2>
            <div className="settings__content-card">
              <p className="settings__content-description">レシートプリンターの接続方法、自動印刷設定、レシートの表示内容をカスタマイズできます。</p>
              <PrinterSettings />
            </div>
          </div>
        );
      case 'coupon':
        return (
          <div>
            <h2 className="settings__content-title">クーポン送信管理</h2>
            <div className="settings__content-card">
              <p className="settings__content-description">顧客向けクーポンの作成・配信・管理を行います。割引率の設定、有効期限管理、利用状況の追跡、メール・SMS配信機能を提供します。</p>
              <LineMarketing />
            </div>
          </div>
        );
      case 'line-link':
        return (
          <div>
            <h2 className="settings__content-title">LINE連携管理</h2>
            <div className="settings__content-card">
              <p className="settings__content-description">LINEの友だち追加やメッセージからの連携待ちを管理し、顧客情報と紐付けます。</p>
              <LineLinkManagement />
            </div>
          </div>
        );
      case 'pin':
        return (
          <div>
            <h2 className="settings__content-title">PIN設定</h2>
            <div className="settings__content-card">
              <p className="settings__content-description">設定画面へのアクセスに必要なPINコードを変更します。</p>
              <PinChange />
            </div>
          </div>
        );
      case 'backup':
        return (
          <div>
            <h2 className="settings__content-title">バックアップ・更新管理</h2>
            <div className="settings__content-card">
              <p className="settings__content-description">システムデータのバックアップ・復元、アプリのアップデート管理を行います。</p>
              <BackupManagement />
            </div>
          </div>
        );
      case 'initial-data':
        return (
          <div>
            <h2 className="settings__content-title">初期データ登録</h2>
            <div className="settings__content-card">
              <p className="settings__content-description">
                顧客情報と回数券（福袋・通常回数券）を一括で登録します。
              </p>
              <InitialDataImport />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // PIN認証チェック
  if (!isUnlocked) {
    return <PinAuth onSuccess={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="settings">
      {/* 左サイドバー */}
      <div className={`settings__sidebar ${sidebarCollapsed ? 'settings__sidebar--collapsed' : ''}`}>
        {/* ヘッダー */}
        <div className="settings__sidebar-header">
          {!sidebarCollapsed && (
            <>
              <Link href="/" className="settings__back-link">
                <ArrowLeft className="settings__back-icon" />
                <span>予約一覧に戻る</span>
              </Link>
              <div className="settings__sidebar-title">
                <Settings className="settings__sidebar-title-icon" />
                <h1>設定</h1>
              </div>
            </>
          )}
          {sidebarCollapsed && (
            <Link href="/" className="settings__back-link-icon" title="予約一覧に戻る">
              <ArrowLeft size={20} />
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="settings__sidebar-toggle"
            title={sidebarCollapsed ? 'メニューを展開' : 'メニューを折りたたむ'}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* メニュー */}
        <nav className="settings__nav">
          {settingsMenu.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`settings__nav-item ${isActive ? 'settings__nav-item--active' : ''}`}
                title={sidebarCollapsed ? item.label : ''}
              >
                <Icon className="settings__nav-icon" />
                {!sidebarCollapsed && (
                  <div className="settings__nav-content">
                    <div className="settings__nav-label">{item.label}</div>
                    <div className="settings__nav-description">{item.description}</div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* メインコンテンツ */}
      <div className="settings__main">
        {/* ヘッダー */}
        <header className="settings__header">
          <div className="settings__header-title">
            <Settings className="settings__header-icon" />
            <h1>ABBY 設定</h1>
          </div>
        </header>

        {/* コンテンツエリア */}
        <main className="settings__content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;