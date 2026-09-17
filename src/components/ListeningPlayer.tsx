'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Vocabulary, StudyMode, UserSettings } from '@/types';
import { speechEngine } from '@/lib/speech';
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

  // Settings overrides for current session
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

  const currentRepeatRef = useRef(currentRepeat);
  currentRepeatRef.current = currentRepeat;

  // Speak word and record listen stat
  const speakCurrent = useCallback(async (vocab: Vocabulary) => {
    try {
      await speechEngine.speak(vocab.word, {
        voiceURI: settings.voice,
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
  }, [settings, speed]);

  // Playlist execution loop for Mode 4 (Continuous) and Mode 3 (Repeat loop)
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

      // Pronounce current word
      await speakCurrent(vocab);

      if (!runLoopRef.current) break;

      // Handle repeats per word
      const targetRepeats = mode === 'repeat' ? Math.max(repeatCount, 3) : repeatCount;
      if (rep < targetRepeats) {
        // Pause between repeats of the same word
        await new Promise((r) => setTimeout(r, Math.max(pauseSeconds * 1000, 1000)));
        if (!runLoopRef.current) break;
        rep++;
        continue;
      }

      // Completed all repeats for this word
      rep = 1;

      // Mode 1 (Nghe từ) stops after 1 word
      if (mode === 'listen' || mode === 'guess') {
        runLoopRef.current = false;
        setIsPlaying(false);
        break;
      }

      // Check if reached end of playlist
      if (idx >= queueRef.current.length - 1) {
        runLoopRef.current = false;
        setIsPlaying(false);
        break;
      }

      // Pause between different words
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

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
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

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  // If queue is empty, do nothing
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🎧</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 800 }}>
              VOCAL LISTENING STUDIO
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Phím tắt: Space (Play/Pause) • ← / → (Trước/Kế) • R (Replay) • Esc (Thoát)
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsFullscreen(false)}
            >
              Thu nhỏ (Esc)
            </button>
            <button className="btn btn-danger btn-sm" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, margin: '24px 0' }}>
          <button
            className={`btn btn-sm ${mode === 'continuous' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { stopPlayback(); setMode('continuous'); }}
          >
            Chế độ 4: Nghe cả danh sách
          </button>
          <button
            className={`btn btn-sm ${mode === 'listen' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { stopPlayback(); setMode('listen'); }}
          >
            Chế độ 1: Nghe từng từ
          </button>
          <button
            className={`btn btn-sm ${mode === 'repeat' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { stopPlayback(); setMode('repeat'); }}
          >
            Chế độ 3: Nghe lặp lại
          </button>
          <button
            className={`btn btn-sm ${mode === 'guess' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { stopPlayback(); setMode('guess'); }}
          >
            Chế độ 2: Nghe và đoán
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
              voiceURI={settings.voice}
              speed={speed}
            />
          ) : (
            <div
              className="card"
              style={{
                width: '100%',
                padding: '48px 32px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              }}
            >
              {/* Sound wave animated icon when speaking */}
              <div style={{ height: 32, marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                {isPlaying ? (
                  <div className="sound-wave">
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                  </div>
                ) : (
                  <span style={{ fontSize: 24, opacity: 0.5 }}>🔊</span>
                )}
              </div>

              {/* Word & IPA */}
              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 54,
                  fontWeight: 800,
                  letterSpacing: -1,
                  color: '#ffffff',
                  marginBottom: 12,
                }}
              >
                {currentVocab.word}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
                {currentVocab.phonetic && (
                  <span className="phonetic-tag" style={{ fontSize: 20, padding: '4px 14px' }}>
                    {currentVocab.phonetic}
                  </span>
                )}
                {currentVocab.partOfSpeech && (
                  <span className="badge-pos" style={{ fontSize: 16, padding: '4px 12px' }}>
                    ({currentVocab.partOfSpeech})
                  </span>
                )}
              </div>

              {/* Meaning */}
              <p
                style={{
                  fontSize: 26,
                  color: '#cbd5e1',
                  fontWeight: 500,
                  maxWidth: 600,
                  margin: '0 auto',
                  lineHeight: 1.4,
                }}
              >
                {currentVocab.meaning}
              </p>

              {/* Repeat Indicator */}
              {mode === 'repeat' && (
                <div style={{ marginTop: 24 }}>
                  <span className="badge badge-learning" style={{ fontSize: 14, padding: '6px 14px' }}>
                    🔊 Lặp lại: {currentRepeat} / {repeatCount}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Progress & Controls Bar */}
          <div style={{ width: '100%', maxWidth: 640, marginTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              <span>{currentIndex + 1} / {queue.length} từ</span>
              <span>Đã nghe từ này: {currentVocab.listenCount} lần</span>
            </div>

            <div className="progress-bar-bg" style={{ height: 8 }}>
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>

            {/* Playback Button Group */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 24 }}>
              <button
                className="player-btn"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                title="Từ trước (←)"
                style={{ fontSize: 24 }}
              >
                ⏮
              </button>

              <button
                className="player-btn player-btn-main"
                onClick={togglePlayPause}
                title="Phát / Tạm dừng (Space)"
                style={{ width: 64, height: 64, fontSize: 28 }}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              <button
                className="player-btn"
                onClick={handleNext}
                disabled={currentIndex === queue.length - 1}
                title="Từ tiếp theo (→)"
                style={{ fontSize: 24 }}
              >
                ⏭
              </button>

              <button
                className="player-btn"
                onClick={handleReplayCurrent}
                title="Nghe lại (R)"
                style={{ fontSize: 22 }}
              >
                🔄
              </button>
            </div>

            {/* Settings Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tốc độ:</span>
                {[0.75, 1.0, 1.25, 1.5].map((s) => (
                  <button
                    key={s}
                    className={`btn btn-sm ${speed === s ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSpeed(s)}
                    style={{ padding: '4px 8px', fontSize: 11 }}
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
                    style={{ padding: '4px 8px', fontSize: 11 }}
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
                    style={{ padding: '4px 8px', fontSize: 11 }}
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
      {/* Top Row / Desktop Left: Word Info & Fast Controls */}
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
            ⛶
          </button>
          <button
            className="btn btn-secondary btn-icon btn-sm"
            onClick={onClose}
            title="Đóng"
            id="player-close-btn"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Center Controls & Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, maxWidth: 440, width: '100%' }}>
        <div className="player-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <button
            className="player-btn"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            title="Từ trước (←)"
          >
            ⏮
          </button>

          <button
            className="player-btn player-btn-main"
            onClick={togglePlayPause}
            title="Phát / Dừng (Space)"
            id="player-play-btn"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            className="player-btn"
            onClick={handleNext}
            disabled={currentIndex === queue.length - 1}
            title="Từ tiếp theo (→)"
          >
            ⏭
          </button>

          <button
            className="player-btn"
            onClick={handleReplayCurrent}
            title="Nghe lại (R)"
          >
            🔄
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

      {/* Settings Row (Speed & Mode) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        <select
          className="select-control"
          style={{ width: 'auto', padding: '5px 8px', fontSize: 12 }}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          title="Tốc độ đọc"
        >
          <option value={0.75}>0.75x</option>
          <option value={1.0}>1.0x</option>
          <option value={1.25}>1.25x</option>
          <option value={1.5}>1.5x</option>
        </select>

        <select
          className="select-control"
          style={{ width: 'auto', padding: '5px 8px', fontSize: 12 }}
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
