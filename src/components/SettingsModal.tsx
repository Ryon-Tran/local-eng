'use client';

import React, { useState, useEffect } from 'react';
import { UserSettings } from '@/types';
import { speechEngine } from '@/lib/speech';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  theme,
  onToggleTheme,
}) => {
  const [voice, setVoice] = useState(settings.voice || '');
  const [speed, setSpeed] = useState(settings.speed || 1.0);
  const [pitch, setPitch] = useState(settings.pitch || 1.0);
  const [volume, setVolume] = useState(settings.volume || 1.0);
  const [repeatCount, setRepeatCount] = useState(settings.repeatCount || 2);
  const [pauseSeconds, setPauseSeconds] = useState(settings.pauseBetweenWords || 2);
  const [autoMarkListened, setAutoMarkListened] = useState(settings.autoMarkListened ?? true);
  const [autoMarkLearned, setAutoMarkLearned] = useState(settings.autoMarkLearned ?? false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load available English voices from browser
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const load = () => {
        const enVoices = speechEngine.getEnglishVoices();
        setAvailableVoices(enVoices);
      };
      load();
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = load;
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleTestVoice = () => {
    speechEngine.speak('Hello! This is your English vocabulary pronunciation assistant.', {
      voiceURI: voice,
      rate: speed,
      pitch,
      volume,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        voice,
        speed,
        pitch,
        volume,
        repeatCount,
        pauseBetweenWords: pauseSeconds,
        autoMarkListened,
        autoMarkLearned,
        theme,
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert('Lỗi khi lưu cài đặt');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚙️</span>
            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700 }}>
                Cài Đặt Học Tập & Phát Âm
              </h3>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Tùy biến giọng đọc TTS, tốc độ phát và chế độ học
              </span>
            </div>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Voice Selector */}
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Giọng đọc tiếng Anh (English Voice):</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <select
                className="select-control"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                id="select-voice"
              >
                <option value="">-- Mặc định trình duyệt (English) --</option>
                {availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleTestVoice}
                title="Nghe thử giọng này"
                id="btn-test-voice"
              >
                🔊 Thử
              </button>
            </div>
          </div>

          {/* Speed */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="input-label">Tốc độ đọc (Speed): <strong>{speed}x</strong></label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0.75, 1.0, 1.25, 1.5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`btn btn-sm ${speed === s ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={() => setSpeed(s)}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.75"
              step="0.05"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          {/* Repeat count & Pause */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }} className="input-group">
              <label className="input-label">Số lần lặp lại mỗi từ:</label>
              <select
                className="select-control"
                value={repeatCount}
                onChange={(e) => setRepeatCount(Number(e.target.value))}
              >
                <option value={1}>1 lần</option>
                <option value={2}>2 lần (Khuyên dùng)</option>
                <option value={3}>3 lần</option>
                <option value={5}>5 lần</option>
              </select>
            </div>

            <div style={{ flex: 1 }} className="input-group">
              <label className="input-label">Thời gian nghỉ giữa các từ:</label>
              <select
                className="select-control"
                value={pauseSeconds}
                onChange={(e) => setPauseSeconds(Number(e.target.value))}
              >
                <option value={1}>1 giây</option>
                <option value={2}>2 giây (Chuẩn)</option>
                <option value={3}>3 giây</option>
                <option value={5}>5 giây</option>
              </select>
            </div>
          </div>

          {/* Pitch & Volume */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label className="input-label" style={{ display: 'block', marginBottom: 6 }}>
                Cao độ (Pitch): {pitch}
              </label>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label className="input-label" style={{ display: 'block', marginBottom: 6 }}>
                Âm lượng (Volume): {Math.round(volume * 100)}%
              </label>
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Automations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 6, borderTop: '1px solid var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoMarkListened}
                onChange={(e) => setAutoMarkListened(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span>Tự động tăng số lần nghe (listenCount) khi phát từ</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoMarkLearned}
                onChange={(e) => setAutoMarkLearned(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span>Tự động chuyển thành "Đã học" sau khi nghe xong danh sách</span>
            </label>
          </div>

          {/* Theme */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border-color)' }}>
            <div>
              <span className="input-label">Giao diện màu sắc:</span>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {theme === 'dark' ? 'Chế độ tối (Dark Mode)' : 'Chế độ sáng (Light Mode)'}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onToggleTheme}
            >
              {theme === 'dark' ? '🌙 Chuyển sang Sáng' : '☀️ Chuyển sang Tối'}
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
            id="btn-save-settings"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </div>
      </div>
    </div>
  );
};
