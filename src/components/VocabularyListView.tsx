'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Volume2,
  CheckCircle2,
  Clock,
  CircleDashed,
  Trash2,
  Plus,
  Headphones,
  Check,
} from 'lucide-react';
import { Vocabulary, VocabStatus, VocabularyDay } from '@/types';
import { speechEngine } from '@/lib/speech';

interface VocabularyListViewProps {
  vocabularies: Vocabulary[];
  days: VocabularyDay[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onStartListening: (selectedVocabs: Vocabulary[], initialMode?: string) => void;
  onUpdateStatus: (id: string, newStatus: VocabStatus) => Promise<void>;
  onDeleteVocab: (id: string) => Promise<void>;
  onRefresh: () => void;
  onOpenImportForDate: (date: string) => void;
}

export const VocabularyListView: React.FC<VocabularyListViewProps> = ({
  vocabularies,
  days,
  selectedDate,
  onSelectDate,
  onStartListening,
  onUpdateStatus,
  onDeleteVocab,
  onRefresh,
  onOpenImportForDate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VocabStatus>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Filter items based on date, search query, and status
  const filteredVocabs = useMemo(() => {
    return vocabularies.filter((item) => {
      if (selectedDate && selectedDate !== 'ALL' && item.studyDate !== selectedDate) {
        return false;
      }
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchWord = item.word.toLowerCase().includes(q);
        const matchIPA = item.phonetic.toLowerCase().includes(q);
        const matchMeaning = item.meaning.toLowerCase().includes(q);
        if (!matchWord && !matchIPA && !matchMeaning) {
          return false;
        }
      }
      return true;
    });
  }, [vocabularies, selectedDate, statusFilter, searchQuery]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredVocabs.length && filteredVocabs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVocabs.map((v) => v.id)));
    }
  };

  const handlePronounceSingle = async (vocab: Vocabulary) => {
    setPlayingId(vocab.id);
    try {
      await speechEngine.speak(vocab.word);
      await fetch(`/api/vocabularies/${vocab.id}/listen`, { method: 'POST' });
      vocab.listenCount += 1;
      vocab.lastListenedAt = new Date().toISOString();
    } catch (e) {
      console.error(e);
    } finally {
      setPlayingId(null);
    }
  };

  const handleListenSelected = () => {
    const selected = vocabularies.filter((v) => selectedIds.has(v.id));
    if (selected.length > 0) {
      onStartListening(selected, 'continuous');
    }
  };

  const handleBulkStatus = async (status: VocabStatus) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await onUpdateStatus(id, status);
    }
    onRefresh();
  };

  const confirmDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa từ vựng này không?')) {
      await onDeleteVocab(id);
      selectedIds.delete(id);
      setSelectedIds(new Set(selectedIds));
    }
  };

  return (
    <div>
      {/* Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <BookOpen size={22} color="var(--accent-primary)" />
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800 }}>
              DANH SÁCH TỪ VỰNG
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {selectedDate && selectedDate !== 'ALL'
              ? `Đang xem từ vựng ngày: ${selectedDate}`
              : 'Tất cả từ vựng trong hệ thống'}
          </p>
        </div>

        {selectedDate && selectedDate !== 'ALL' && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onOpenImportForDate(selectedDate)}
          >
            <Plus size={14} />
            <span>Thêm vào ngày này</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div
        className="card"
        style={{
          marginBottom: 18,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Search Input with Icon */}
          <div style={{ flex: 2, minWidth: 240, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Search size={16} />
            </div>
            <input
              type="text"
              className="input-control"
              style={{ paddingLeft: 36 }}
              placeholder="Tìm kiếm từ tiếng Anh, phiên âm, hoặc nghĩa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="search-vocab-input"
            />
          </div>

          {/* Date Selector */}
          <div style={{ flex: 1, minWidth: 160 }}>
            <select
              className="select-control"
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              id="filter-date-select"
            >
              <option value="ALL">Tất cả các ngày</option>
              {days.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.date} ({d.totalCount} từ)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('ALL')}
            >
              Tất cả ({vocabularies.length})
            </button>
            <button
              className={`btn btn-sm ${statusFilter === 'NEW' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('NEW')}
            >
              <CircleDashed size={13} />
              <span>Chưa học ({vocabularies.filter((v) => v.status === 'NEW').length})</span>
            </button>
            <button
              className={`btn btn-sm ${statusFilter === 'LEARNING' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('LEARNING')}
            >
              <Clock size={13} />
              <span>Đang học ({vocabularies.filter((v) => v.status === 'LEARNING').length})</span>
            </button>
            <button
              className={`btn btn-sm ${statusFilter === 'LEARNED' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('LEARNED')}
            >
              <CheckCircle2 size={13} />
              <span>Đã học ({vocabularies.filter((v) => v.status === 'LEARNED').length})</span>
            </button>
          </div>

          {/* Selection Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleSelectAll}
              id="btn-select-all"
            >
              {selectedIds.size === filteredVocabs.length && filteredVocabs.length > 0
                ? 'Bỏ chọn tất cả'
                : 'Chọn tất cả'}
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Đã chọn: <strong style={{ color: 'var(--text-primary)' }}>{selectedIds.size}</strong> từ
            </span>
          </div>
        </div>
      </div>

      {/* Floating or Top Action Bar when words are selected */}
      {selectedIds.size > 0 && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(6, 182, 212, 0.15) 100%)',
            borderColor: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            padding: '12px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Headphones size={20} color="var(--accent-cyan)" />
            <div>
              <strong style={{ fontSize: 14 }}>Đã chọn {selectedIds.size} từ vựng</strong>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Sẵn sàng để nghe và luyện phát âm
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleListenSelected}
              id="btn-listen-selected"
            >
              <Volume2 size={15} />
              <span>NGHE TỪ ĐÃ CHỌN</span>
            </button>

            <button
              className="btn btn-success btn-sm"
              onClick={() => handleBulkStatus('LEARNED')}
              title="Đánh dấu là Đã học"
            >
              <Check size={13} />
              <span>Đã học</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Vocabulary Items List */}
      {filteredVocabs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <Search size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Không tìm thấy từ vựng nào</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredVocabs.map((vocab) => {
            const isSelected = selectedIds.has(vocab.id);
            const isPlaying = playingId === vocab.id;

            return (
              <div
                key={vocab.id}
                className={`vocab-card ${isSelected ? 'selected' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                {/* Left: Checkbox & Word Information */}
                <div className="vocab-card-main" style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 220 }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(vocab.id)}
                    style={{ width: 20, height: 20, cursor: 'pointer', flexShrink: 0 }}
                    id={`check-vocab-${vocab.id}`}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="vocab-word">{vocab.word}</span>
                      {vocab.phonetic && (
                        <span className="phonetic-tag">{vocab.phonetic}</span>
                      )}
                      {vocab.partOfSpeech && (
                        <span className="badge-pos">({vocab.partOfSpeech})</span>
                      )}
                    </div>

                    <div className="vocab-meaning">{vocab.meaning}</div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span>📅 {vocab.studyDate}</span>
                      <span>•</span>
                      <span>Đã nghe: <strong>{vocab.listenCount}</strong> lần</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions & Status */}
                <div className="vocab-card-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Single Pronounce Button */}
                  <button
                    className={`btn ${isPlaying ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => handlePronounceSingle(vocab)}
                    disabled={isPlaying}
                    title="Nghe phát âm từ này"
                    id={`btn-listen-single-${vocab.id}`}
                  >
                    <Volume2 size={14} />
                    <span>{isPlaying ? '...' : 'Nghe'}</span>
                  </button>

                  {/* Status Toggle Dropdown */}
                  <select
                    className="select-control"
                    style={{
                      width: 'auto',
                      padding: '5px 8px',
                      fontSize: 12,
                      fontWeight: 600,
                      background:
                        vocab.status === 'LEARNED'
                          ? 'var(--status-learned-bg)'
                          : vocab.status === 'LEARNING'
                          ? 'var(--status-learning-bg)'
                          : 'var(--status-new-bg)',
                      color:
                        vocab.status === 'LEARNED'
                          ? 'var(--status-learned-text)'
                          : vocab.status === 'LEARNING'
                          ? 'var(--status-learning-text)'
                          : 'var(--status-new-text)',
                      borderColor: 'transparent',
                    }}
                    value={vocab.status}
                    onChange={(e) => onUpdateStatus(vocab.id, e.target.value as VocabStatus)}
                  >
                    <option value="NEW">⚪ Chưa học</option>
                    <option value="LEARNING">🟡 Đang học</option>
                    <option value="LEARNED">🟢 Đã học</option>
                  </select>

                  {/* Delete Button */}
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => confirmDelete(vocab.id)}
                    title="Xóa từ vựng"
                    style={{ padding: '5px 8px' }}
                  >
                    <Trash2 size={14} />
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
