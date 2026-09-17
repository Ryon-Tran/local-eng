'use client';

import React, { useState } from 'react';
import {
  Plus,
  FileText,
  Edit3,
  Zap,
  Search,
  AlertTriangle,
  Save,
  X,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { ParsedVocabItem, ParseError, ConflictResolution } from '@/types';
import { SEED_RAW_TEXT } from '@/lib/seed';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (date: string) => void;
  defaultDate?: string;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultDate,
}) => {
  const [activeTab, setActiveTab] = useState<'bulk' | 'manual'>('bulk');
  const [targetDate, setTargetDate] = useState(
    defaultDate || new Date().toISOString().split('T')[0]
  );

  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedVocabItem[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [globalResolution, setGlobalResolution] = useState<ConflictResolution>('skip');
  const [itemResolutions, setItemResolutions] = useState<Record<string, ConflictResolution>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [manualWord, setManualWord] = useState('');
  const [manualPhonetic, setManualPhonetic] = useState('');
  const [manualPOS, setManualPOS] = useState('');
  const [manualMeaning, setManualMeaning] = useState('');
  const [manualUsage, setManualUsage] = useState('');
  const [manualExample, setManualExample] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setParseErrors([]);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/vocabularies/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      });
      const data = await res.json();
      if (data.success) {
        setParsedItems(data.data.items);
        setParseErrors(data.data.errors);

        const initialResolutions: Record<string, ConflictResolution> = {};
        data.data.items.forEach((item: ParsedVocabItem) => {
          if (item.duplicateInfo?.exists) {
            initialResolutions[item.word.toLowerCase()] = 'skip';
          }
        });
        setItemResolutions(initialResolutions);
      } else {
        alert(data.error || 'Lỗi khi phân tích từ vựng');
      }
    } catch (e: any) {
      console.error(e);
      alert('Không thể kết nối đến máy chủ: ' + e.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleGlobalResolutionChange = (res: ConflictResolution) => {
    setGlobalResolution(res);
    const updated: Record<string, ConflictResolution> = {};
    parsedItems.forEach((item) => {
      if (item.duplicateInfo?.exists) {
        updated[item.word.toLowerCase()] = res;
      }
    });
    setItemResolutions(updated);
  };

  const handleItemResolutionChange = (word: string, res: ConflictResolution) => {
    setItemResolutions((prev) => ({
      ...prev,
      [word.toLowerCase()]: res,
    }));
  };

  const handleSaveBulk = async () => {
    if (parsedItems.length === 0) return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const payloadItems = parsedItems.map((item) => ({
        word: item.word,
        phonetic: item.phonetic,
        partOfSpeech: item.partOfSpeech,
        meaning: item.meaning,
        usage: item.usage,
        exampleSentence: item.exampleSentence,
        resolution: itemResolutions[item.word.toLowerCase()] || globalResolution,
      }));

      const res = await fetch('/api/vocabularies/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: targetDate,
          items: payloadItems,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveMessage(data.message);
        setTimeout(() => {
          onSuccess(targetDate);
          onClose();
        }, 1000);
      } else {
        alert(data.error || 'Lỗi khi lưu dữ liệu');
      }
    } catch (e: any) {
      console.error(e);
      alert('Lỗi lưu từ vựng: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualWord.trim() || !manualMeaning.trim()) {
      setManualError('Vui lòng nhập từ tiếng Anh và nghĩa tiếng Việt.');
      return;
    }

    setIsSaving(true);
    setManualError(null);

    try {
      const res = await fetch('/api/vocabularies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: manualWord.trim(),
          phonetic: manualPhonetic.trim(),
          partOfSpeech: manualPOS.trim(),
          meaning: manualMeaning.trim(),
          usage: manualUsage.trim() || undefined,
          exampleSentence: manualExample.trim() || undefined,
          date: targetDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setManualWord('');
        setManualPhonetic('');
        setManualPOS('');
        setManualMeaning('');
        setManualUsage('');
        setManualExample('');
        onSuccess(targetDate);
        onClose();
      } else {
        setManualError(data.error || 'Lỗi khi thêm từ');
      }
    } catch (e: any) {
      console.error(e);
      setManualError('Lỗi kết nối: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const duplicateCount = parsedItems.filter((i) => i.duplicateInfo?.exists).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 740 }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Plus size={20} color="var(--accent-primary)" />
            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700 }}>
                Thêm Từ Vựng Mới
              </h3>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Tự động tách từ & phân nhóm theo ngày học
              </span>
            </div>
          </div>

          <button className="btn btn-secondary btn-icon btn-sm" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <button
            style={{
              flex: 1,
              padding: '12px 14px',
              background: activeTab === 'bulk' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'bulk' ? '2px solid var(--accent-primary)' : 'none',
              color: activeTab === 'bulk' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            onClick={() => setActiveTab('bulk')}
            id="tab-bulk-import"
          >
            <FileText size={15} />
            <span>Dán hàng loạt (Bulk Paste)</span>
          </button>

          <button
            style={{
              flex: 1,
              padding: '12px 14px',
              background: activeTab === 'manual' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'manual' ? '2px solid var(--accent-primary)' : 'none',
              color: activeTab === 'manual' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            onClick={() => setActiveTab('manual')}
            id="tab-manual-import"
          >
            <Edit3 size={15} />
            <span>Thêm thủ công từng từ</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Target Date Picker */}
          <div className="input-group" style={{ marginBottom: 14 }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} />
              <span>Ngày học (studyDate):</span>
            </label>
            <input
              type="date"
              className="input-control"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              style={{ maxWidth: 220 }}
              id="import-date-input"
            />
          </div>

          {activeTab === 'bulk' ? (
            <div>
              <div className="input-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="input-label">Dán văn bản từ vựng vào đây:</label>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 11, padding: '2px 8px', gap: 4 }}
                    onClick={() => setRawText(SEED_RAW_TEXT)}
                    type="button"
                    title="Dán nhanh 20 từ mẫu để thử nghiệm"
                  >
                    <Zap size={12} />
                    <span>Nạp ví dụ mẫu</span>
                  </button>
                </div>

                <textarea
                  className="textarea-control"
                  placeholder={`Abandon /əˈbændən/ (v): Từ bỏ\nAbility /əˈbɪləti/ (n): Khả năng\nAccording to /əˈkɔːrdɪŋ tuː/ (prep): Theo như`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={6}
                  id="bulk-vocab-textarea"
                />
              </div>

              {/* Action Button: Analyze */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleParse}
                  disabled={isParsing || !rawText.trim()}
                  id="btn-analyze-vocab"
                >
                  <Search size={15} />
                  <span>{isParsing ? 'Đang phân tích...' : 'Phân tích từ vựng'}</span>
                </button>
                {parsedItems.length > 0 && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setParsedItems([]);
                      setParseErrors([]);
                    }}
                  >
                    Xóa kết quả
                  </button>
                )}
              </div>

              {/* Error reporting for unparseable lines */}
              {parseErrors.length > 0 && (
                <div
                  className="card"
                  style={{
                    marginBottom: 14,
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    padding: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                    <AlertTriangle size={15} />
                    <span>Có {parseErrors.length} dòng không thể phân tích:</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    {parseErrors.map((err, idx) => (
                      <div key={idx} style={{ color: 'var(--text-secondary)' }}>
                        <strong>Dòng {err.lineNumber}:</strong> <code style={{ color: '#fca5a5' }}>{err.rawLine}</code> — {err.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicate Warnings */}
              {duplicateCount > 0 && (
                <div
                  className="card"
                  style={{
                    marginBottom: 14,
                    background: 'rgba(245, 158, 11, 0.1)',
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                    padding: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={16} color="#fbbf24" />
                      <div>
                        <strong style={{ color: '#fbbf24', fontSize: 13 }}>
                          Phát hiện {duplicateCount} từ đã tồn tại trong hệ thống
                        </strong>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          Chọn cách xử lý khi lưu bản ghi trùng:
                        </div>
                      </div>
                    </div>

                    <select
                      className="select-control"
                      style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
                      value={globalResolution}
                      onChange={(e) => handleGlobalResolutionChange(e.target.value as ConflictResolution)}
                    >
                      <option value="skip">Bỏ qua (Skip - Mặc định)</option>
                      <option value="update">Cập nhật thông tin</option>
                      <option value="duplicate">Tạo bản ghi mới</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              {parsedItems.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <strong style={{ fontSize: 13 }}>
                      Đã tìm thấy {parsedItems.length} từ vựng hợp lệ:
                    </strong>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Xem trước trước khi lưu
                    </span>
                  </div>

                  <div
                    style={{
                      maxHeight: 220,
                      overflowY: 'auto',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-input)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '6px 10px' }}>Từ tiếng Anh</th>
                          <th style={{ padding: '6px 10px' }}>Phiên âm</th>
                          <th style={{ padding: '6px 10px' }}>Loại</th>
                          <th style={{ padding: '6px 10px' }}>Nghĩa</th>
                          <th style={{ padding: '6px 10px' }}>Trùng lặp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedItems.map((item, i) => {
                          const isDup = item.duplicateInfo?.exists;
                          const resolution = itemResolutions[item.word.toLowerCase()] || globalResolution;

                          return (
                            <tr
                              key={i}
                              style={{
                                borderBottom: '1px solid var(--border-color)',
                                background: isDup ? 'rgba(245, 158, 11, 0.04)' : undefined,
                              }}
                            >
                              <td style={{ padding: '6px 10px', fontWeight: 600 }}>{item.word}</td>
                              <td style={{ padding: '6px 10px', color: 'var(--accent-cyan)' }}>{item.phonetic}</td>
                              <td style={{ padding: '6px 10px' }}>
                                {item.partOfSpeech && <span className="badge-pos">({item.partOfSpeech})</span>}
                              </td>
                              <td style={{ padding: '6px 10px' }}>
                                <div style={{ fontWeight: 500 }}>{item.meaning}</div>
                                {item.usage && (
                                  <div style={{ fontSize: 11, color: 'var(--accent-primary)', marginTop: 2 }}>
                                    💡 {item.usage}
                                  </div>
                                )}
                                {item.exampleSentence && (
                                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 2 }}>
                                    📝 {item.exampleSentence}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '6px 10px' }}>
                                {isDup ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <span style={{ fontSize: 10, color: '#fbbf24' }}>
                                      Ngày {item.duplicateInfo?.existingDate}
                                    </span>
                                    <select
                                      className="select-control"
                                      style={{ padding: '2px 4px', fontSize: 10 }}
                                      value={resolution}
                                      onChange={(e) => handleItemResolutionChange(item.word, e.target.value as ConflictResolution)}
                                    >
                                      <option value="skip">Bỏ qua</option>
                                      <option value="update">Cập nhật</option>
                                      <option value="duplicate">Lưu mới</option>
                                    </select>
                                  </div>
                                ) : (
                                  <span style={{ color: '#34d399', fontSize: 11 }}>Mới</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {saveMessage && (
                <div style={{ marginTop: 12, color: '#34d399', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} />
                  <span>{saveMessage}</span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleManualAdd}>
              <div className="input-group">
                <label className="input-label">Từ hoặc cụm từ tiếng Anh (*):</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="VD: Abandon hoặc According to"
                  value={manualWord}
                  onChange={(e) => setManualWord(e.target.value)}
                  required
                  id="manual-word-input"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div className="input-group" style={{ flex: 1, minWidth: 140 }}>
                  <label className="input-label">Phiên âm IPA:</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="VD: /əˈbændən/"
                    value={manualPhonetic}
                    onChange={(e) => setManualPhonetic(e.target.value)}
                  />
                </div>

                <div className="input-group" style={{ flex: 1, minWidth: 140 }}>
                  <label className="input-label">Từ loại:</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="VD: v, n, adj, prep"
                    value={manualPOS}
                    onChange={(e) => setManualPOS(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Nghĩa tiếng Việt (*):</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="VD: Từ bỏ"
                  value={manualMeaning}
                  onChange={(e) => setManualMeaning(e.target.value)}
                  required
                  id="manual-meaning-input"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Cách dùng / Collocations (tùy chọn):</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="VD: abandon a plan, abandon hope, abandon someone"
                  value={manualUsage}
                  onChange={(e) => setManualUsage(e.target.value)}
                  id="manual-usage-input"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Ví dụ câu & nghĩa tiếng Việt (tùy chọn):</label>
                <textarea
                  className="textarea-control"
                  rows={2}
                  placeholder="VD: They had to abandon the car. (Họ đã phải bỏ lại chiếc xe.)"
                  value={manualExample}
                  onChange={(e) => setManualExample(e.target.value)}
                  id="manual-example-input"
                />
              </div>

              {manualError && (
                <div style={{ color: '#f87171', fontSize: 12, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} />
                  <span>{manualError}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 6 }}
                disabled={isSaving}
                id="btn-submit-manual"
              >
                <Plus size={16} />
                <span>{isSaving ? 'Đang lưu...' : 'Thêm từ vào danh sách'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        {activeTab === 'bulk' && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Hủy
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveBulk}
              disabled={isSaving || parsedItems.length === 0}
              id="btn-save-bulk"
            >
              <Save size={15} />
              <span>{isSaving ? 'Đang lưu...' : `Lưu ${parsedItems.length} từ vựng`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
