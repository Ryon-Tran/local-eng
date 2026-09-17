'use client';

import React from 'react';
import { Calendar, Headphones, Play, List, Plus, CheckCircle2, Clock, CircleDashed } from 'lucide-react';
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Calendar size={22} color="var(--accent-primary)" />
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800 }}>
              TỪ VỰNG THEO NGÀY
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Quản lý từ vựng theo từng ngày thêm. Từ của các ngày được tách biệt hoàn toàn.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => onOpenImportForDate()}>
          <Plus size={16} />
          <span>Thêm danh sách mới</span>
        </button>
      </div>

      {days.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Calendar size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 17, marginBottom: 8 }}>Chưa có danh sách từ vựng theo ngày</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 13 }}>
            Dán danh sách từ vựng đầu tiên của bạn để hệ thống tự động gom nhóm theo ngày.
          </p>
          <button className="btn btn-primary" onClick={() => onOpenImportForDate()}>
            Dán từ vựng ngay
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                  gap: 14,
                  borderColor: isToday ? 'rgba(99, 102, 241, 0.4)' : undefined,
                  background: isToday ? 'rgba(99, 102, 241, 0.05)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
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
                    <span style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.8 }}>
                      Thg {dateObj.getMonth() + 1 || day.date.split('-')[1]}
                    </span>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>
                      {dateObj.getDate() || day.date.split('-')[2]}
                    </span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <strong style={{ fontSize: 16, fontFamily: 'var(--font-heading)' }}>{day.date}</strong>
                      {isToday && <span className="badge badge-learned">Hôm nay</span>}
                      <span className="badge badge-new">{day.totalCount} từ</span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={12} color="#34d399" /> {day.learnedCount} đã học
                      </span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color="#fbbf24" /> {day.learningCount} đang học
                      </span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CircleDashed size={12} color="#cbd5e1" /> {day.newCount} chưa học
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onStudyDay(day.date, 'listen')}
                    id={`btn-study-${day.date}`}
                  >
                    <Headphones size={14} />
                    <span>Học ngay</span>
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onStudyDay(day.date, 'continuous')}
                    id={`btn-listen-${day.date}`}
                  >
                    <Play size={14} />
                    <span>Nghe</span>
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onViewDay(day.date)}
                    id={`btn-view-${day.date}`}
                  >
                    <List size={14} />
                    <span>Xem</span>
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onOpenImportForDate(day.date)}
                    title="Thêm từ vào ngày này"
                    style={{ padding: '6px 10px' }}
                  >
                    <Plus size={14} />
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
