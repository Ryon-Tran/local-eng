'use client';

import React from 'react';
import { LayoutDashboard, Calendar, BookOpen, Radio, Settings } from 'lucide-react';

interface MobileNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenSettings: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
}) => {
  return (
    <nav className="mobile-bottom-nav">
      <button
        className={`mobile-nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => onSelectTab('dashboard')}
        id="mobile-nav-dashboard"
      >
        <LayoutDashboard size={20} />
        <span className="mobile-nav-label">Tổng quan</span>
      </button>

      <button
        className={`mobile-nav-item ${currentTab === 'daily-lists' ? 'active' : ''}`}
        onClick={() => onSelectTab('daily-lists')}
        id="mobile-nav-daily-lists"
      >
        <Calendar size={20} />
        <span className="mobile-nav-label">Theo ngày</span>
      </button>

      <button
        className={`mobile-nav-item ${currentTab === 'all-vocab' ? 'active' : ''}`}
        onClick={() => onSelectTab('all-vocab')}
        id="mobile-nav-all-vocab"
      >
        <BookOpen size={20} />
        <span className="mobile-nav-label">Từ vựng</span>
      </button>

      <button
        className={`mobile-nav-item ${currentTab === 'listening-studio' ? 'active' : ''}`}
        onClick={() => onSelectTab('listening-studio')}
        id="mobile-nav-listening-studio"
      >
        <Radio size={20} />
        <span className="mobile-nav-label">Phòng nghe</span>
      </button>

      <button
        className={`mobile-nav-item ${currentTab === 'settings' ? 'active' : ''}`}
        onClick={onOpenSettings}
        id="mobile-nav-settings"
      >
        <Settings size={20} />
        <span className="mobile-nav-label">Cài đặt</span>
      </button>
    </nav>
  );
};
