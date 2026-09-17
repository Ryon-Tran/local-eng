'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Check, ArrowRight, SkipBack, SkipForward, Sparkles, X } from 'lucide-react';
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

  useEffect(() => {
    if (!currentVocab) return;
    setUserInput('');
    setIsSubmitted(false);
    setIsCorrect(false);

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
        maxWidth: 580,
        margin: '0 auto',
        padding: 32,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <span className="badge badge-pos">Mode 2: Nghe và đoán từ</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Tiến trình: <strong>{currentIndex + 1}</strong> / {vocabularies.length}
        </span>
      </div>

      {/* Audio Play Button */}
      <div style={{ marginTop: 6 }}>
        <button
          className="btn btn-primary btn-lg"
          style={{
            width: 72,
            height: 72,
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--accent-glow)',
          }}
          onClick={handleReplay}
          title="Nghe lại phát âm"
          id="btn-guess-listen"
        >
          <Volume2 size={32} />
        </button>
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          Nhấn để nghe lại phát âm
        </p>
      </div>

      {/* Masked Word or Revealed Result */}
      {!isSubmitted ? (
        <div style={{ margin: '14px 0', width: '100%' }}>
          <div
            style={{
              fontSize: 26,
              fontFamily: 'var(--font-mono)',
              letterSpacing: 6,
              color: 'var(--text-muted)',
              marginBottom: 16,
            }}
          >
            {currentVocab.word.replace(/[a-zA-Z]/g, '•')}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, maxWidth: 400, margin: '0 auto' }}>
            <input
              ref={inputRef}
              type="text"
              className="input-control"
              style={{ fontSize: 16, textAlign: 'center', fontWeight: 600 }}
              placeholder="Bạn đoán từ gì?"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              autoFocus
              id="guess-word-input"
            />
            <button type="submit" className="btn btn-primary" id="btn-check-guess">
              <Check size={16} />
              <span>Kiểm tra</span>
            </button>
          </form>
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            padding: 20,
            borderRadius: 'var(--radius-lg)',
            background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 16, fontWeight: 700, color: isCorrect ? '#34d399' : '#f87171' }}>
            {isCorrect ? <Sparkles size={18} /> : <X size={18} />}
            <span>{isCorrect ? 'Chính xác!' : 'Chưa chính xác'}</span>
          </div>

          {!isCorrect && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Bạn đã nhập: <span style={{ textDecoration: 'line-through' }}>{userInput}</span>
            </div>
          )}

          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800 }}>
              {currentVocab.word}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
              {currentVocab.phonetic && <span className="phonetic-tag">{currentVocab.phonetic}</span>}
              {currentVocab.partOfSpeech && <span className="badge-pos">({currentVocab.partOfSpeech})</span>}
            </div>
          </div>

          <p style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 500, marginTop: 4 }}>
            {currentVocab.meaning}
          </p>

          <div style={{ marginTop: 10 }}>
            <button
              className="btn btn-primary"
              style={{ minWidth: 150 }}
              onClick={handleNextWord}
              autoFocus
              id="btn-next-guess"
            >
              <span>Tiếp tục</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 6 }}>
        <button className="btn btn-secondary btn-sm" onClick={onPrev} disabled={currentIndex === 0}>
          <SkipBack size={13} />
          <span>Từ trước</span>
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onNext}
          disabled={currentIndex === vocabularies.length - 1}
        >
          <span>Tiếp theo</span>
          <SkipForward size={13} />
        </button>
      </div>
    </div>
  );
};
