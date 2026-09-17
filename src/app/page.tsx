'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { DashboardView } from '@/components/DashboardView';
import { DailyListsView } from '@/components/DailyListsView';
import { VocabularyListView } from '@/components/VocabularyListView';
import { ListeningPlayer } from '@/components/ListeningPlayer';
import { ImportModal } from '@/components/ImportModal';
import { SettingsModal } from '@/components/SettingsModal';
import { Vocabulary, VocabularyDay, StatisticsData, UserSettings, VocabStatus, StudyMode } from '@/types';

export default function Home() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [days, setDays] = useState<VocabularyDay[]>([]);
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal states
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [importTargetDate, setImportTargetDate] = useState<string | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Audio / Listening Studio state
  const [listeningQueue, setListeningQueue] = useState<Vocabulary[]>([]);
  const [listeningMode, setListeningMode] = useState<StudyMode>('continuous');

  // User Settings
  const [settings, setSettings] = useState<UserSettings>({
    id: 'default',
    voice: '',
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0,
    repeatCount: 2,
    pauseBetweenWords: 2,
    autoMarkListened: true,
    autoMarkLearned: false,
    theme: 'dark',
  });

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const [statsRes, daysRes, vocabRes, settingsRes] = await Promise.all([
        fetch('/api/statistics').then((r) => r.json()),
        fetch('/api/vocabulary-days').then((r) => r.json()),
        fetch('/api/vocabularies').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json()),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (daysRes.success) setDays(daysRes.data);
      if (vocabRes.success) setVocabularies(vocabRes.data);
      if (settingsRes.success) {
        setSettings(settingsRes.data);
        if (settingsRes.data.theme) {
          setTheme(settingsRes.data.theme === 'light' ? 'light' : 'dark');
          document.documentElement.setAttribute('data-theme', settingsRes.data.theme);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle Dark/Light Theme
  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: nextTheme }),
    }).catch(console.error);
  };

  // Quick Seed Handler
  const handleQuickSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        alert('🎉 Đã nạp 20 từ vựng mẫu thành công!');
      } else {
        alert(data.error || 'Lỗi nạp từ mẫu');
      }
    } catch (e: any) {
      alert('Lỗi nạp từ mẫu: ' + e.message);
    } finally {
      setIsSeeding(false);
    }
  };

  // Start Studying a specific Day
  const handleStudyDay = (date: string, mode: string = 'continuous') => {
    const dayWords = vocabularies.filter((v) => v.studyDate === date);
    if (dayWords.length === 0) {
      alert('Không có từ vựng nào trong ngày này.');
      return;
    }
    setListeningQueue(dayWords);
    setListeningMode(mode as StudyMode);
  };

  // Start Listening with custom selected words
  const handleStartListening = (selectedVocabs: Vocabulary[], mode: string = 'continuous') => {
    if (selectedVocabs.length === 0) return;
    setListeningQueue(selectedVocabs);
    setListeningMode(mode as StudyMode);
  };

  // View specific day in VocabularyListView
  const handleViewDay = (date: string) => {
    setSelectedDate(date);
    setCurrentTab('all-vocab');
  };

  // Update Status
  const handleUpdateStatus = async (id: string, newStatus: VocabStatus) => {
    try {
      const res = await fetch(`/api/vocabularies/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setVocabularies((prev) =>
          prev.map((v) => (v.id === id ? { ...v, status: newStatus } : v))
        );
        // Refresh stats silently
        fetch('/api/statistics')
          .then((r) => r.json())
          .then((d) => d.success && setStats(d.data));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Vocabulary
  const handleDeleteVocab = async (id: string) => {
    try {
      const res = await fetch(`/api/vocabularies/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setVocabularies((prev) => prev.filter((v) => v.id !== id));
        fetchData();
      } else {
        alert(data.error || 'Lỗi khi xóa từ');
      }
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
  };

  // Save Settings
  const handleSaveSettings = async (newSettings: Partial<UserSettings>) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    const data = await res.json();
    if (data.success) {
      setSettings(data.data);
    }
  };

  // Open import modal for a specific date
  const handleOpenImportForDate = (date?: string) => {
    setImportTargetDate(date || new Date().toISOString().split('T')[0]);
    setIsImportOpen(true);
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenImport={() => handleOpenImportForDate()}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onQuickSeed={handleQuickSeed}
        isSeeding={isSeeding}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Area */}
      <main className="main-wrapper">
        {/* Top bar header */}
        <header className="top-bar">
          <div className="top-bar-title">
            <h1>VOCAL LISTENING 🎧</h1>
            <p>Học phát âm & ghi nhớ từ vựng tiếng Anh theo ngày</p>
          </div>

          <div className="top-bar-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchData}
              title="Làm mới dữ liệu"
            >
              🔄 Làm mới
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleOpenImportForDate()}
            >
              ➕ Thêm từ vựng
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="content-body">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>🎧</div>
              <p style={{ color: 'var(--text-secondary)' }}>Đang tải dữ liệu từ vựng...</p>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  stats={stats}
                  recentDays={days}
                  onOpenImport={() => handleOpenImportForDate()}
                  onStudyDay={handleStudyDay}
                  onViewDay={handleViewDay}
                />
              )}

              {currentTab === 'daily-lists' && (
                <DailyListsView
                  days={days}
                  onStudyDay={handleStudyDay}
                  onViewDay={handleViewDay}
                  onOpenImportForDate={handleOpenImportForDate}
                />
              )}

              {currentTab === 'all-vocab' && (
                <VocabularyListView
                  vocabularies={vocabularies}
                  days={days}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onStartListening={handleStartListening}
                  onUpdateStatus={handleUpdateStatus}
                  onDeleteVocab={handleDeleteVocab}
                  onRefresh={fetchData}
                  onOpenImportForDate={handleOpenImportForDate}
                />
              )}

              {currentTab === 'listening-studio' && (
                <div>
                  <div style={{ marginBottom: 20 }}>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800 }}>
                      🎧 PHÒNG HỌC NGHE (LISTENING STUDIO)
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                      Chọn từ vựng để bắt đầu các chế độ học nghe chuyên sâu
                    </p>
                  </div>

                  {listeningQueue.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>🎧</div>
                      <h3 style={{ fontSize: 18, marginBottom: 8 }}>Chưa chọn từ vựng nào để nghe</h3>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                        Hãy chọn từ trong danh sách hoặc nghe danh sách từ của ngày hôm nay.
                      </p>
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        {days[0] && (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleStudyDay(days[0].date, 'continuous')}
                          >
                            Nghe từ vựng ngày gần nhất ({days[0].date})
                          </button>
                        )}
                        <button
                          className="btn btn-secondary"
                          onClick={() => setCurrentTab('all-vocab')}
                        >
                          Chọn từ vựng thủ công
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="card" style={{ padding: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div>
                          <strong style={{ fontSize: 16 }}>
                            Đang mở phòng nghe với {listeningQueue.length} từ vựng
                          </strong>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            Trình phát đang hiển thị ở thanh cố định bên dưới hoặc mở chế độ Toàn màn hình
                          </div>
                        </div>

                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            // Find player and open fullscreen
                            const btn = document.getElementById('player-fullscreen-btn');
                            btn?.click();
                          }}
                        >
                          ⛶ Mở Toàn Màn Hình
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Sticky Listening Player Bar (shows whenever listeningQueue has words) */}
      {listeningQueue.length > 0 && (
        <ListeningPlayer
          queue={listeningQueue}
          initialMode={listeningMode}
          settings={settings}
          onClose={() => setListeningQueue([])}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={(date) => {
          fetchData();
          setSelectedDate(date);
          setCurrentTab('daily-lists');
        }}
        defaultDate={importTargetDate}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    </div>
  );
}
