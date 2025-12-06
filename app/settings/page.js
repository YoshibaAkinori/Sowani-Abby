"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, Users, Clock, Sparkles, Settings2, Calculator, Gift, Database, FileText, Printer } from 'lucide-react';
import StaffManagement from './set_component/StaffManagement';
import ShiftManagement from './set_component/ShiftManagement';
import ServicesManagement from './set_component/ServicesManagement';
import OptionsManagement from './set_component/OptionsManagement';
import RegisterClosing from './set_component/RegisterClosing';
import BackupManagement from './set_component/Backupmanagement';
import PrinterSettings from './set_component/PrinterSettings';
import './settings.css';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('staff');

  const settingsMenu = [
    { id: 'staff', label: 'スタッフ管理', icon: Users, description: 'スタッフ情報の登録' },
    { id: 'shift', label: 'シフト管理', icon: Clock, description: 'スタッフのシフト・勤務時間管理' },
    { id: 'courses', label: '施術コース管理', icon: Sparkles, description: '施術メニュー・コース・料金設定' },
    { id: 'options', label: 'オプション管理', icon: Settings2, description: '追加オプション・料金設定' },
    { id: 'register-close', label: 'レジ締め管理', icon: Calculator, description: '日次売上締め・集計管理' },
    { id: 'printer', label: 'プリンター設定', icon: Printer, description: 'レシート印刷・プリンター接続設定' },
    { id: 'coupon', label: 'クーポン送信管理', icon: Gift, description: 'クーポン作成・配信・管理' },
    { id: 'documents', label: '各種書類作成', icon: FileText, description: '売上報告書・レシート管理' },
    { id: 'backup', label: 'バックアップ管理', icon: Database, description: 'データバックアップ・復元管理' },
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
              <p className="settings__content-description">スタッフのシフトスケジュール、勤務時間の設定・管理を行います。週間・月間シフトの作成から勤務実績の確認まで対応します。</p>
                <ShiftManagement/>
              
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
              <div className="settings__content-status">※ 機能実装中</div>
            </div>
          </div>
        );
      case 'documents':
        return (
          <div>
            <h2 className="settings__content-title">各種書類作成</h2>
            <div className="settings__content-card">
              <p className="settings__content-description">請求書、領収書、レシート、売上報告書などの各種帳票の作成・印刷・PDF出力を行います。顧客情報と連携した自動作成機能、テンプレートのカスタマイズも可能です。</p>
              <div className="settings__content-status">※ 機能実装中</div>
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
      default:
        return null;
    }
  };

  return (
    <div className="settings">
      {/* 左サイドバー */}
      <div className="settings__sidebar">
        {/* ヘッダー */}
        <div className="settings__sidebar-header">
          <Link href="/" className="settings__back-link">
            <ArrowLeft className="settings__back-icon" />
            <span>ダッシュボードに戻る</span>
          </Link>
          <div className="settings__sidebar-title">
            <Settings className="settings__sidebar-title-icon" />
            <h1>設定</h1>
          </div>
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
              >
                <Icon className="settings__nav-icon" />
                <div className="settings__nav-content">
                  <div className="settings__nav-label">{item.label}</div>
                  <div className="settings__nav-description">{item.description}</div>
                </div>
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