'use client';

import React from 'react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenImport: () => void;
  onOpenSettings: () => void;
  onQuickSeed: () => void;
  isSeeding: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenImport,
  onOpenSettings,
  onQuickSeed,
  isSeeding,
  theme,
  onToggleTheme,
}) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-icon">🎧</div>
        <div>
          <div className="brand-title">VOCAL ENG</div>
          <span className="brand-badge">PRO LISTENING</span>
        </div>
      </div>

      <nav className="nav-menu">
        <button
          className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onSelectTab('dashboard')}
          id="nav-dashboard"
        >
          <span className="nav-icon">📊</span>
          <span>Tổng quan</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'daily-lists' ? 'active' : ''}`}
          onClick={() => onSelectTab('daily-lists')}
          id="nav-daily-lists"
        >
          <span className="nav-icon">📅</span>
          <span>Từ vựng theo ngày</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'all-vocab' ? 'active' : ''}`}
          onClick={() => onSelectTab('all-vocab')}
          id="nav-all-vocab"
        >
          <span className="nav-icon">📚</span>
          <span>Danh sách từ vựng</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'listening-studio' ? 'active' : ''}`}
          onClick={() => onSelectTab('listening-studio')}
          id="nav-listening-studio"
        >
          <span className="nav-icon">🎧</span>
          <span>Phòng học nghe</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={onOpenSettings}
          id="nav-settings"
        >
          <span className="nav-icon">⚙️</span>
          <span>Cài đặt</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={onOpenImport}
          id="btn-open-import"
        >
          <span>➕</span>
          <span>Thêm từ vựng</span>
        </button>

        <button
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          onClick={onQuickSeed}
          disabled={isSeeding}
          title="Nạp 20 từ mẫu để kiểm thử ngay"
          id="btn-quick-seed"
        >
          <span>⚡</span>
          <span>{isSeeding ? 'Đang nạp...' : 'Nạp 20 từ mẫu'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Giao diện:</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onToggleTheme}
            style={{ padding: '4px 10px' }}
            id="btn-toggle-theme"
          >
            {theme === 'dark' ? '🌙 Tối' : '☀️ Sáng'}
          </button>
        </div>
      </div>
    </aside>
  );
};
