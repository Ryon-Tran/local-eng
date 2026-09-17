'use client';

import React from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  CircleDashed,
  Volume2,
  Flame,
  Headphones,
  Play,
  List,
  Plus,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { StatisticsData, VocabularyDay } from '@/types';

interface DashboardViewProps {
  stats: StatisticsData | null;
  recentDays: VocabularyDay[];
  onOpenImport: () => void;
  onStudyDay: (date: string, mode?: string) => void;
  onViewDay: (date: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  recentDays,
  onOpenImport,
  onStudyDay,
  onViewDay,
}) => {
  const formattedToday = stats?.todayDate
    ? new Date(stats.todayDate).toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
          borderColor: 'rgba(99, 102, 241, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800 }}>
                Xin chào bạn
              </h2>
              <Sparkles size={20} color="#fbbf24" />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Hôm nay: <strong style={{ color: 'var(--text-primary)' }}>{formattedToday || stats?.todayDate}</strong>
            </p>
          </div>

          <button className="btn btn-primary" onClick={onOpenImport} id="dash-btn-add">
            <Plus size={16} />
            <span>Thêm từ mới</span>
          </button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <FileText size={22} />
          </div>
          <div>
            <div className="stat-value">{stats?.todayWords ?? 0}</div>
            <div className="stat-label">Từ vựng hôm nay</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="stat-value">{stats?.learnedWords ?? 0}</div>
            <div className="stat-label">Đã học</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-value">{stats?.learningWords ?? 0}</div>
            <div className="stat-label">Đang học</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1' }}>
            <CircleDashed size={22} />
          </div>
          <div>
            <div className="stat-value">{stats?.unlearnedWords ?? 0}</div>
            <div className="stat-label">Chưa học</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
            <Volume2 size={22} />
          </div>
          <div>
            <div className="stat-value">{stats?.totalListens ?? 0}</div>
            <div className="stat-label">Lượt nghe tổng cộng</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
            <Flame size={22} />
          </div>
          <div>
            <div className="stat-value">{stats?.streakDays ?? 1} ngày</div>
            <div className="stat-label">Chuỗi học liên tiếp</div>
          </div>
        </div>
      </div>

      {/* Today's Quick Study Card */}
      {stats?.todayDate && (
        <div className="card" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Calendar size={18} color="var(--accent-primary)" />
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700 }}>
                  Từ vựng hôm nay ({stats.todayDate})
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                {stats.todayWords > 0
                  ? `Đang có ${stats.todayWords} từ cần ôn luyện và nghe phát âm.`
                  : 'Chưa có từ vựng nào hôm nay. Hãy dán từ mới để bắt đầu học ngay!'}
              </p>
            </div>

            {stats.todayWords > 0 ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => onStudyDay(stats.todayDate, 'listen')}
                  id="dash-btn-study-today"
                >
                  <Headphones size={15} />
                  <span>Học ngay</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => onStudyDay(stats.todayDate, 'continuous')}
                  id="dash-btn-listen-today"
                >
                  <Play size={15} />
                  <span>Nghe danh sách</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => onViewDay(stats.todayDate)}
                  id="dash-btn-view-today"
                >
                  <List size={15} />
                  <span>Xem danh sách</span>
                </button>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={onOpenImport}>
                <Plus size={16} />
                <span>Thêm từ cho hôm nay</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recent Study Days Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} />
            <span>Lịch sử học gần đây</span>
          </h3>
        </div>

        {recentDays.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Calendar size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Chưa có danh sách ngày học nào.</p>
            <button className="btn btn-primary" onClick={onOpenImport}>Dán danh sách từ vựng đầu tiên</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {recentDays.slice(0, 6).map((day) => (
              <div key={day.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={16} color="var(--accent-primary)" />
                    <strong style={{ fontSize: 15, fontFamily: 'var(--font-heading)' }}>{day.date}</strong>
                  </div>
                  <span className="badge badge-new">{day.totalCount} từ</span>
                </div>

                <div style={{ display: 'flex', gap: 6, fontSize: 11, flexWrap: 'wrap' }}>
                  <span className="badge badge-learned">✓ {day.learnedCount} đã học</span>
                  <span className="badge badge-learning">⏱ {day.learningCount} đang học</span>
                  <span className="badge badge-new">• {day.newCount} chưa học</span>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => onStudyDay(day.date, 'listen')}
                  >
                    Học ngay
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => onStudyDay(day.date, 'continuous')}
                  >
                    Nghe
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onViewDay(day.date)}
                    title="Xem chi tiết"
                  >
                    Xem
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
