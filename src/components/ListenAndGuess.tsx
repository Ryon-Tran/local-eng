'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Vocabulary } from '@/types';
import { speechEngine } from '@/lib/speech';

interface ListenAndGuessProps {
  vocabularies: Vocabulary[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  voiceURI?: string;
  speed?: number;
}

export const ListenAndGuess: React.FC<ListenAndGuessProps> = ({
  vocabularies,
  currentIndex,
  onNext,
  onPrev,
  voiceURI,
  speed,
}) => {
  const currentVocab = vocabularies[currentIndex];
  const [userInput, setUserInput] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Play pronunciation on word change and reset state
  useEffect(() => {
    if (!currentVocab) return;
    setUserInput('');
    setIsSubmitted(false);
    setIsCorrect(false);

    // Speak the word automatically when entering card
    const timer = setTimeout(() => {
      speechEngine.speak(currentVocab.word, { voiceURI, rate: speed });
      inputRef.current?.focus();
    }, 200);

    return () => clearTimeout(timer);
  }, [currentVocab, currentIndex, voiceURI, speed]);

  const handleReplay = () => {
    if (currentVocab) {
      speechEngine.speak(currentVocab.word, { voiceURI, rate: speed });
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentVocab || !userInput.trim()) return;

    const normalizedGuess = userInput.trim().toLowerCase();
    const normalizedTarget = currentVocab.word.trim().toLowerCase();

    const correct = normalizedGuess === normalizedTarget;
    setIsCorrect(correct);
    setIsSubmitted(true);
    if (correct) {
      setScore((s) => s + 1);
    }
  };

  const handleNextWord = () => {
    onNext();
  };

  if (!currentVocab) return null;

  return (
    <div
      className="card"
      style={{
        maxWidth: 600,
        margin: '0 auto',
        padding: 36,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <span className="badge badge-pos">Chế độ 2: Nghe và đoán từ</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Tiến trình: <strong>{currentIndex + 1}</strong> / {vocabularies.length}
        </span>
      </div>

      {/* Audio Play Button */}
      <div style={{ marginTop: 10 }}>
        <button
          className="btn btn-primary btn-lg"
          style={{
            width: 80,
            height: 80,
            borderRadius: 'var(--radius-full)',
            fontSize: 32,
            boxShadow: 'var(--accent-glow)',
          }}
          onClick={handleReplay}
          title="Nghe lại phát âm"
          id="btn-guess-listen"
        >
          🔊
        </button>
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
          Nhấn để nghe lại phát âm
        </p>
      </div>

      {/* Masked Word or Revealed Result */}
      {!isSubmitted ? (
        <div style={{ margin: '16px 0', width: '100%' }}>
          <div
            style={{
              fontSize: 28,
              fontFamily: 'var(--font-mono)',
              letterSpacing: 8,
              color: 'var(--text-muted)',
              marginBottom: 16,
            }}
          >
            {currentVocab.word.replace(/[a-zA-Z]/g, '•')}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, maxWidth: 420, margin: '0 auto' }}>
            <input
              ref={inputRef}
              type="text"
              className="input-control"
              style={{ fontSize: 18, textAlign: 'center', fontWeight: 600 }}
              placeholder="Bạn đoán từ gì?"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              autoFocus
              id="guess-word-input"
            />
            <button type="submit" className="btn btn-primary" id="btn-check-guess">
              Kiểm tra
            </button>
          </form>
        </div>
      ) : (
        /* Revealed Card */
        <div
          style={{
            width: '100%',
            padding: 24,
            borderRadius: 'var(--radius-lg)',
            background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: isCorrect ? '#34d399' : '#f87171' }}>
            {isCorrect ? '🎉 Chính xác!' : '❌ Chưa chính xác'}
          </div>

          {!isCorrect && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Bạn đã nhập: <span style={{ textDecoration: 'line-through' }}>{userInput}</span>
            </div>
          )}

          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 800 }}>
              {currentVocab.word}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 }}>
              {currentVocab.phonetic && <span className="phonetic-tag">{currentVocab.phonetic}</span>}
              {currentVocab.partOfSpeech && <span className="badge-pos">({currentVocab.partOfSpeech})</span>}
            </div>
          </div>

          <p style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 500, marginTop: 6 }}>
            {currentVocab.meaning}
          </p>

          <div style={{ marginTop: 12 }}>
            <button
              className="btn btn-primary"
              style={{ minWidth: 160 }}
              onClick={handleNextWord}
              autoFocus
              id="btn-next-guess"
            >
              Tiếp tục ➔
            </button>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={onPrev} disabled={currentIndex === 0}>
          ⏮ Từ trước
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onNext}
          disabled={currentIndex === vocabularies.length - 1}
        >
          Từ tiếp theo ⏭
        </button>
      </div>
    </div>
  );
};
