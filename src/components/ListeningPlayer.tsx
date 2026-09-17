'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SkipBack,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
  Volume2,
  Headphones,
  Sparkles,
} from 'lucide-react';
import { Vocabulary, StudyMode, UserSettings } from '@/types';
import { speechEngine, FormattedVoice } from '@/lib/speech';
import { ListenAndGuess } from './ListenAndGuess';

interface ListeningPlayerProps {
  queue: Vocabulary[];
  initialMode?: StudyMode;
  settings: UserSettings;
  onClose: () => void;
  onUpdateStatus?: (id: string, status: any) => void;
}

export const ListeningPlayer: React.FC<ListeningPlayerProps> = ({
  queue,
  initialMode = 'continuous',
  settings,
  onClose,
  onUpdateStatus,
}) => {
  const [mode, setMode] = useState<StudyMode>(initialMode);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Voice and audio settings
  const [selectedVoice, setSelectedVoice] = useState(settings.voice || '');
  const [availableVoices, setAvailableVoices] = useState<FormattedVoice[]>([]);
  const [speed, setSpeed] = useState(settings.speed || 1.0);
  const [repeatCount, setRepeatCount] = useState(settings.repeatCount || 2);
  const [pauseSeconds, setPauseSeconds] = useState(settings.pauseBetweenWords || 2);
  const [currentRepeat, setCurrentRepeat] = useState(1);

  const currentVocab = queue[currentIndex];
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  const queueRef = useRef(queue);
  queueRef.current = queue;

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // Load available English voices
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

  // Update active voice when selectedVoice changes
  const handleVoiceChange = (newVoiceURI: string) => {
    setSelectedVoice(newVoiceURI);
    speechEngine.setActiveVoice(newVoiceURI);

    // Save to backend settings
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice: newVoiceURI }),
    }).catch(console.error);

    // Pronounce sample with new voice
    if (currentVocab) {
      speechEngine.speak(currentVocab.word, { voiceURI: newVoiceURI, rate: speed });
    }
  };

  // Speak word and record listen stat
  const speakCurrent = useCallback(async (vocab: Vocabulary) => {
    try {
      await speechEngine.speak(vocab.word, {
        voiceURI: selectedVoice,
        rate: speed,
        pitch: settings.pitch,
        volume: settings.volume,
      });

      // Update listen count
      fetch(`/api/vocabularies/${vocab.id}/listen`, { method: 'POST' }).catch(console.error);
      vocab.listenCount += 1;
    } catch (e) {
      console.error(e);
    }
  }, [selectedVoice, settings.pitch, settings.volume, speed]);

  // Playlist execution loop
  const runLoopRef = useRef<boolean>(false);

  const stopPlayback = useCallback(() => {
    runLoopRef.current = false;
    setIsPlaying(false);
    speechEngine.stop();
  }, []);

  const playSequence = useCallback(async (startIdx: number, startRepeat = 1) => {
    runLoopRef.current = true;
    setIsPlaying(true);

    let idx = startIdx;
    let rep = startRepeat;

    while (runLoopRef.current && idx < queueRef.current.length) {
      const vocab = queueRef.current[idx];
      setCurrentIndex(idx);
      setCurrentRepeat(rep);

      await speakCurrent(vocab);

      if (!runLoopRef.current) break;

      const targetRepeats = mode === 'repeat' ? Math.max(repeatCount, 3) : repeatCount;
      if (rep < targetRepeats) {
        await new Promise((r) => setTimeout(r, Math.max(pauseSeconds * 1000, 1000)));
        if (!runLoopRef.current) break;
        rep++;
        continue;
      }

      rep = 1;

      if (mode === 'listen' || mode === 'guess') {
        runLoopRef.current = false;
        setIsPlaying(false);
        break;
      }

      if (idx >= queueRef.current.length - 1) {
        runLoopRef.current = false;
        setIsPlaying(false);
        break;
      }

      await new Promise((r) => setTimeout(r, pauseSeconds * 1000));
      if (!runLoopRef.current) break;

      idx++;
    }

    setIsPlaying(false);
  }, [mode, repeatCount, pauseSeconds, speakCurrent]);

  const togglePlayPause = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      playSequence(currentIndex, currentRepeat);
    }
  };

  const handleNext = () => {
    stopPlayback();
    if (currentIndex < queue.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setCurrentRepeat(1);
      if (mode === 'continuous') {
        playSequence(nextIdx, 1);
      } else {
        speakCurrent(queue[nextIdx]);
      }
    }
  };

  const handlePrev = () => {
    stopPlayback();
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setCurrentRepeat(1);
      if (mode === 'continuous') {
        playSequence(prevIdx, 1);
      } else {
        speakCurrent(queue[prevIdx]);
      }
    }
  };

  const handleReplayCurrent = () => {
    stopPlayback();
    setCurrentRepeat(1);
    if (mode === 'continuous') {
      playSequence(currentIndex, 1);
    } else {
      speakCurrent(currentVocab);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case 'KeyR':
          e.preventDefault();
          handleReplayCurrent();
          break;
        case 'KeyS':
          e.preventDefault();
          handleNext();
          break;
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentIndex, isFullscreen, onClose]);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  if (!queue || queue.length === 0 || !currentVocab) {
    return null;
  }

  const progressPercent = ((currentIndex + 1) / queue.length) * 100;

  // Render Fullscreen Study Mode
  if (isFullscreen) {
    return (
      <div className="fullscreen-studio">
        {/* Top Header */}
        <div className="fullscreen-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Headphones size={24} color="var(--accent-cyan)" />
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 800 }}>
              VOCAL LISTENING STUDIO
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Quick Voice Selector in Fullscreen */}
            <select
              className="select-control"
              style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }}
              value={selectedVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              title="Đổi giọng đọc tiếng Anh"
            >
              <option value="">Giọng đọc mặc định</option>
              {availableVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.label}
                </option>
              ))}
            </select>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsFullscreen(false)}
            >
              <Minimize2 size={14} />
              <span>Thu nhỏ (Esc)</span>
            </button>
            <button className="btn btn-danger btn-sm" onClick={onClose}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '20px 0', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${mode === 'continuous' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { stopPlayback(); setMode('continuous'); }}
          >
            Mode 4: Danh sách
          </button>
          <button
            className={`btn btn-sm ${mode === 'listen' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { stopPlayback(); setMode('listen'); }}
          >
            Mode 1: Nghe từng từ
          </button>
          <button
            className={`btn btn-sm ${mode === 'repeat' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { stopPlayback(); setMode('repeat'); }}
          >
            Mode 3: Lặp lại
          </button>
          <button
            className={`btn btn-sm ${mode === 'guess' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { stopPlayback(); setMode('guess'); }}
          >
            Mode 2: Nghe & đoán
          </button>
        </div>

        {/* Center Study Card */}
        <div className="fullscreen-main">
          {mode === 'guess' ? (
            <ListenAndGuess
              vocabularies={queue}
              currentIndex={currentIndex}
              onNext={handleNext}
              onPrev={handlePrev}
              voiceURI={selectedVoice}
              speed={speed}
            />
          ) : (
            <div
              className="card"
              style={{
                width: '100%',
                padding: '44px 28px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              }}
            >
              <div style={{ height: 32, marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                {isPlaying ? (
                  <div className="sound-wave">
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                  </div>
                ) : (
                  <Volume2 size={26} color="var(--accent-primary)" style={{ opacity: 0.6 }} />
                )}
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 50,
                  fontWeight: 800,
                  letterSpacing: -1,
                  color: '#ffffff',
                  marginBottom: 10,
                }}
              >
                {currentVocab.word}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
                {currentVocab.phonetic && (
                  <span className="phonetic-tag" style={{ fontSize: 18, padding: '4px 12px' }}>
                    {currentVocab.phonetic}
                  </span>
                )}
                {currentVocab.partOfSpeech && (
                  <span className="badge-pos" style={{ fontSize: 15, padding: '4px 10px' }}>
                    ({currentVocab.partOfSpeech})
                  </span>
                )}
              </div>

              <p
                style={{
                  fontSize: 24,
                  color: '#cbd5e1',
                  fontWeight: 500,
                  maxWidth: 600,
                  margin: '0 auto',
                  lineHeight: 1.4,
                }}
              >
                {currentVocab.meaning}
              </p>

              {mode === 'repeat' && (
                <div style={{ marginTop: 20 }}>
                  <span className="badge badge-learning" style={{ fontSize: 13, padding: '6px 14px' }}>
                    Lặp lại: {currentRepeat} / {repeatCount}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Progress & Controls Bar */}
          <div style={{ width: '100%', maxWidth: 640, marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              <span>{currentIndex + 1} / {queue.length} từ</span>
              <span>Đã nghe từ này: {currentVocab.listenCount} lần</span>
            </div>

            <div className="progress-bar-bg" style={{ height: 8 }}>
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>

            {/* Playback Button Group */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 22 }}>
              <button
                className="player-btn"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                title="Từ trước (←)"
              >
                <SkipBack size={24} />
              </button>

              <button
                className="player-btn player-btn-main"
                onClick={togglePlayPause}
                title="Phát / Tạm dừng (Space)"
                style={{ width: 62, height: 62 }}
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 2 }} />}
              </button>

              <button
                className="player-btn"
                onClick={handleNext}
                disabled={currentIndex === queue.length - 1}
                title="Từ tiếp theo (→)"
              >
                <SkipForward size={24} />
              </button>

              <button
                className="player-btn"
                onClick={handleReplayCurrent}
                title="Nghe lại (R)"
              >
                <RotateCcw size={22} />
              </button>
            </div>

            {/* Settings Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 22, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tốc độ:</span>
                {[0.75, 1.0, 1.25, 1.5].map((s) => (
                  <button
                    key={s}
                    className={`btn btn-sm ${speed === s ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSpeed(s)}
                    style={{ padding: '3px 8px', fontSize: 11 }}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Khoảng nghỉ:</span>
                {[1, 2, 3, 5].map((sec) => (
                  <button
                    key={sec}
                    className={`btn btn-sm ${pauseSeconds === sec ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPauseSeconds(sec)}
                    style={{ padding: '3px 8px', fontSize: 11 }}
                  >
                    {sec}s
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lặp từ:</span>
                {[1, 2, 3].map((r) => (
                  <button
                    key={r}
                    className={`btn btn-sm ${repeatCount === r ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setRepeatCount(r)}
                    style={{ padding: '3px 8px', fontSize: 11 }}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Bottom Sticky Player Bar
  return (
    <div className="sticky-player" id="sticky-listening-player">
      {/* Top Row / Left: Word Info */}
      <div className="player-info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isPlaying && (
            <div className="sound-wave">
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span className="player-word">{currentVocab.word}</span>
              {currentVocab.phonetic && (
                <span className="phonetic-tag" style={{ fontSize: 11, padding: '1px 6px' }}>
                  {currentVocab.phonetic}
                </span>
              )}
              {currentVocab.partOfSpeech && (
                <span className="badge-pos" style={{ fontSize: 10, padding: '1px 5px' }}>
                  ({currentVocab.partOfSpeech})
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentVocab.meaning}
            </div>
          </div>
        </div>

        {/* Mobile Quick Action Buttons (Fullscreen & Close) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className="btn btn-secondary btn-icon btn-sm"
            onClick={() => setIsFullscreen(true)}
            title="Toàn màn hình"
            id="player-fullscreen-btn"
          >
            <Maximize2 size={14} />
          </button>
          <button
            className="btn btn-secondary btn-icon btn-sm"
            onClick={onClose}
            title="Đóng"
            id="player-close-btn"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Center Controls & Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, maxWidth: 440, width: '100%' }}>
        <div className="player-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <button
            className="player-btn"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            title="Từ trước (←)"
          >
            <SkipBack size={18} />
          </button>

          <button
            className="player-btn player-btn-main"
            onClick={togglePlayPause}
            title="Phát / Dừng (Space)"
            id="player-play-btn"
          >
            {isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: 2 }} />}
          </button>

          <button
            className="player-btn"
            onClick={handleNext}
            disabled={currentIndex === queue.length - 1}
            title="Từ tiếp theo (→)"
          >
            <SkipForward size={18} />
          </button>

          <button
            className="player-btn"
            onClick={handleReplayCurrent}
            title="Nghe lại (R)"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="player-progress-wrapper" style={{ width: '100%' }}>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            <span>
              Từ <strong>{currentIndex + 1}</strong> / {queue.length}
            </span>
            {mode === 'repeat' && <span>Lặp: {currentRepeat}/{repeatCount}</span>}
            <span>Nghỉ: {pauseSeconds}s</span>
          </div>
        </div>
      </div>

      {/* Settings Row (Voice, Speed & Mode) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {/* Quick Voice Selector */}
        {availableVoices.length > 0 && (
          <select
            className="select-control"
            style={{ width: 'auto', maxWidth: 140, padding: '4px 8px', fontSize: 11 }}
            value={selectedVoice}
            onChange={(e) => handleVoiceChange(e.target.value)}
            title="Chọn giọng đọc tiếng Anh"
            id="player-select-voice"
          >
            <option value="">Giọng mặc định</option>
            {availableVoices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.label}
              </option>
            ))}
          </select>
        )}

        {/* Speed Selector */}
        <select
          className="select-control"
          style={{ width: 'auto', padding: '4px 8px', fontSize: 11 }}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          title="Tốc độ đọc"
        >
          <option value={0.75}>0.75x</option>
          <option value={1.0}>1.0x</option>
          <option value={1.25}>1.25x</option>
          <option value={1.5}>1.5x</option>
        </select>

        {/* Mode Selector */}
        <select
          className="select-control"
          style={{ width: 'auto', padding: '4px 8px', fontSize: 11 }}
          value={mode}
          onChange={(e) => {
            stopPlayback();
            setMode(e.target.value as StudyMode);
          }}
          title="Chế độ học"
        >
          <option value="continuous">Mode 4: Danh sách</option>
          <option value="listen">Mode 1: Nghe từ</option>
          <option value="repeat">Mode 3: Lặp lại</option>
          <option value="guess">Mode 2: Nghe & đoán</option>
        </select>
      </div>
    </div>
  );
};
