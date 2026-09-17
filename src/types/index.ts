export type VocabStatus = 'NEW' | 'LEARNING' | 'LEARNED';

export interface Vocabulary {
  id: string;
  dayId: string;
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaning: string;
  status: VocabStatus;
  listenCount: number;
  lastListenedAt: string | null;
  createdAt: string;
  updatedAt: string;
  studyDate?: string;
}

export interface VocabularyDay {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  totalCount: number;
  newCount: number;
  learningCount: number;
  learnedCount: number;
  totalListens?: number;
}

export interface UserSettings {
  id: string;
  voice: string;
  speed: number;
  pitch: number;
  volume: number;
  repeatCount: number;
  pauseBetweenWords: number; // in seconds
  autoMarkListened: boolean;
  autoMarkLearned: boolean;
  theme: 'dark' | 'light' | 'system';
}

export interface ParsedVocabItem {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaning: string;
  rawLine: string;
  lineNumber: number;
  duplicateInfo?: {
    exists: boolean;
    existingDate?: string;
    existingId?: string;
  };
}

export interface ParseError {
  lineNumber: number;
  rawLine: string;
  reason: string;
}

export interface ParseResult {
  items: ParsedVocabItem[];
  errors: ParseError[];
  totalLines: number;
  validCount: number;
}

export type ConflictResolution = 'skip' | 'update' | 'duplicate';

export interface ImportPayload {
  date: string; // Target study date YYYY-MM-DD
  items: Array<{
    word: string;
    phonetic: string;
    partOfSpeech: string;
    meaning: string;
    resolution?: ConflictResolution;
  }>;
}

export interface StatisticsData {
  todayWords: number;
  learnedWords: number;
  learningWords: number;
  unlearnedWords: number;
  listenedToday: number;
  totalListens: number;
  totalWords: number;
  streakDays: number;
  todayDate: string;
}

export type StudyMode = 'listen' | 'guess' | 'repeat' | 'continuous';
