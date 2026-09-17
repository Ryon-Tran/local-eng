'use client';

import React from 'react';
import { VocabularyDay } from '@/types';

interface DailyListsViewProps {
  days: VocabularyDay[];
  onStudyDay: (date: string, mode?: string) => void;
  onViewDay: (date: string) => void;
  onOpenImportForDate: (date?: string) => void;
}

export const DailyListsView: React.FC<DailyListsViewProps> = ({
  days,
  onStudyDay,
  onViewDay,
  onOpenImportForDate,
}) => {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800 }}>
            📅 TỪ VỰNG THEO NGÀY
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Quản lý từ vựng theo từng ngày thêm. Từ của các ngày được tách biệt hoàn toàn.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => onOpenImportForDate()}>
          <span>➕</span>
          <span>Thêm danh sách mới</span>
        </button>
      </div>

      {days.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>Chưa có danh sách từ vựng theo ngày</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
            Dán danh sách từ vựng đầu tiên của bạn để hệ thống tự động gom nhóm theo ngày.
          </p>
          <button className="btn btn-primary" onClick={() => onOpenImportForDate()}>
            Dán từ vựng ngay
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {days.map((day) => {
            const dateObj = new Date(day.date);
            const isToday = day.date === new Date().toISOString().split('T')[0];

            return (
              <div
                key={day.id}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                  borderColor: isToday ? 'rgba(99, 102, 241, 0.4)' : undefined,
                  background: isToday ? 'rgba(99, 102, 241, 0.05)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 'var(--radius-md)',
                      background: isToday ? 'var(--accent-gradient)' : 'rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ fontSize: 11, textTransform: 'uppercase', opacity: 0.8 }}>
                      {dateObj.toLocaleDateString('vi-VN', { month: 'numeric' })}
                    </span>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>
                      {dateObj.getDate() || day.date.split('-')[2]}
                    </span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <strong style={{ fontSize: 18, fontFamily: 'var(--font-heading)' }}>{day.date}</strong>
                      {isToday && <span className="badge badge-learned">Hôm nay</span>}
                      <span className="badge badge-new">{day.totalCount} từ</span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span>🟢 {day.learnedCount} đã học</span>
                      <span>•</span>
                      <span>🟡 {day.learningCount} đang học</span>
                      <span>•</span>
                      <span>⚪ {day.newCount} chưa học</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => onStudyDay(day.date, 'listen')}
                    id={`btn-study-${day.date}`}
                  >
                    <span>🎧</span>
                    <span>Học ngay</span>
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => onStudyDay(day.date, 'continuous')}
                    id={`btn-listen-${day.date}`}
                  >
                    <span>▶</span>
                    <span>Nghe</span>
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => onViewDay(day.date)}
                    id={`btn-view-${day.date}`}
                  >
                    <span>📋</span>
                    <span>Xem danh sách</span>
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => onOpenImportForDate(day.date)}
                    title="Thêm từ vào ngày này"
                    style={{ padding: '8px 12px' }}
                  >
                    <span>➕</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
