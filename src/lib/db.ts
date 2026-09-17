import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Vocabulary, VocabularyDay, UserSettings, StatisticsData, ConflictResolution } from '@/types';
import { SEED_VOCABULARIES } from './seed';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'vocab.db');

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  dbInstance = new Database(DB_PATH);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  initSchema(dbInstance);
  return dbInstance;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vocabulary_days (
      id TEXT PRIMARY KEY,
      date TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vocabularies (
      id TEXT PRIMARY KEY,
      day_id TEXT NOT NULL,
      word TEXT NOT NULL,
      phonetic TEXT,
      part_of_speech TEXT,
      meaning TEXT NOT NULL,
      status TEXT DEFAULT 'NEW',
      listen_count INTEGER DEFAULT 0,
      last_listened_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (day_id) REFERENCES vocabulary_days(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_vocab_day_id ON vocabularies(day_id);
    CREATE INDEX IF NOT EXISTS idx_vocab_word ON vocabularies(word);
    CREATE INDEX IF NOT EXISTS idx_vocab_status ON vocabularies(status);
    CREATE INDEX IF NOT EXISTS idx_vocab_days_date ON vocabulary_days(date);

    CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      voice TEXT DEFAULT '',
      speed REAL DEFAULT 1.0,
      pitch REAL DEFAULT 1.0,
      volume REAL DEFAULT 1.0,
      repeat_count INTEGER DEFAULT 2,
      pause_between_words INTEGER DEFAULT 2,
      auto_mark_listened INTEGER DEFAULT 1,
      auto_mark_learned INTEGER DEFAULT 0,
      theme TEXT DEFAULT 'dark'
    );
  `);

  // Ensure default settings exist
  const settingsRow = db.prepare('SELECT id FROM user_settings WHERE id = ?').get('default');
  if (!settingsRow) {
    db.prepare(`
      INSERT INTO user_settings (id, voice, speed, pitch, volume, repeat_count, pause_between_words, auto_mark_listened, auto_mark_learned, theme)
      VALUES ('default', '', 1.0, 1.0, 1.0, 2, 2, 1, 0, 'dark')
    `).run();
  }

  // Check if DB is empty, auto-seed 20 words for today
  const dayCount = db.prepare('SELECT COUNT(*) as count FROM vocabulary_days').get() as { count: number };
  if (dayCount.count === 0) {
    seedInitialData(db);
  }
}

export function seedInitialData(db: Database.Database = getDb()) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const dayId = `day_${today}`;
  const now = new Date().toISOString();

  const insertDay = db.prepare(`
    INSERT OR IGNORE INTO vocabulary_days (id, date, created_at)
    VALUES (?, ?, ?)
  `);
  insertDay.run(dayId, today, now);

  const insertVocab = db.prepare(`
    INSERT INTO vocabularies (id, day_id, word, phonetic, part_of_speech, meaning, status, listen_count, last_listened_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'NEW', 0, NULL, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (let i = 0; i < SEED_VOCABULARIES.length; i++) {
      const item = SEED_VOCABULARIES[i];
      const id = `vocab_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;
      insertVocab.run(id, dayId, item.word, item.phonetic, item.partOfSpeech, item.meaning, now, now);
    }
  });

  tx();
}

export function getDaysWithStats(): VocabularyDay[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT 
      d.id,
      d.date,
      d.created_at as createdAt,
      COUNT(v.id) as totalCount,
      SUM(CASE WHEN v.status = 'NEW' THEN 1 ELSE 0 END) as newCount,
      SUM(CASE WHEN v.status = 'LEARNING' THEN 1 ELSE 0 END) as learningCount,
      SUM(CASE WHEN v.status = 'LEARNED' THEN 1 ELSE 0 END) as learnedCount,
      SUM(v.listen_count) as totalListens
    FROM vocabulary_days d
    LEFT JOIN vocabularies v ON d.id = v.day_id
    GROUP BY d.id
    ORDER BY d.date DESC
  `).all() as any[];

  return rows.map(r => ({
    id: r.id,
    date: r.date,
    createdAt: r.createdAt,
    totalCount: Number(r.totalCount || 0),
    newCount: Number(r.newCount || 0),
    learningCount: Number(r.learningCount || 0),
    learnedCount: Number(r.learnedCount || 0),
    totalListens: Number(r.totalListens || 0),
  }));
}

export function getDayByDate(date: string) {
  const db = getDb();
  const day = db.prepare('SELECT id, date, created_at as createdAt FROM vocabulary_days WHERE date = ?').get(date) as any;
  if (!day) return null;

  const vocabs = db.prepare(`
    SELECT 
      id, day_id as dayId, word, phonetic, part_of_speech as partOfSpeech,
      meaning, status, listen_count as listenCount, last_listened_at as lastListenedAt,
      created_at as createdAt, updated_at as updatedAt
    FROM vocabularies
    WHERE day_id = ?
    ORDER BY created_at ASC
  `).all(day.id) as Vocabulary[];

  return {
    ...day,
    vocabularies: vocabs,
  };
}

export function getOrCreateDay(date: string): string {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM vocabulary_days WHERE date = ?').get(date) as { id: string } | undefined;
  if (existing) {
    return existing.id;
  }

  const id = `day_${date}`;
  const now = new Date().toISOString();
  db.prepare('INSERT INTO vocabulary_days (id, date, created_at) VALUES (?, ?, ?)').run(id, date, now);
  return id;
}

export function getVocabularies(filters?: {
  dayId?: string;
  date?: string;
  status?: string;
  search?: string;
}): Vocabulary[] {
  const db = getDb();
  let sql = `
    SELECT 
      v.id, v.day_id as dayId, v.word, v.phonetic, v.part_of_speech as partOfSpeech,
      v.meaning, v.status, v.listen_count as listenCount, v.last_listened_at as lastListenedAt,
      v.created_at as createdAt, v.updated_at as updatedAt, d.date as studyDate
    FROM vocabularies v
    JOIN vocabulary_days d ON v.day_id = d.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.dayId) {
    sql += ` AND v.day_id = ?`;
    params.push(filters.dayId);
  }

  if (filters?.date) {
    sql += ` AND d.date = ?`;
    params.push(filters.date);
  }

  if (filters?.status && filters.status !== 'ALL') {
    sql += ` AND v.status = ?`;
    params.push(filters.status);
  }

  if (filters?.search && filters.search.trim()) {
    const s = `%${filters.search.trim().toLowerCase()}%`;
    sql += ` AND (LOWER(v.word) LIKE ? OR LOWER(v.meaning) LIKE ? OR LOWER(v.phonetic) LIKE ?)`;
    params.push(s, s, s);
  }

  sql += ` ORDER BY d.date DESC, v.created_at ASC`;

  return db.prepare(sql).all(...params) as Vocabulary[];
}

export function getVocabularyById(id: string): Vocabulary | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT 
      v.id, v.day_id as dayId, v.word, v.phonetic, v.part_of_speech as partOfSpeech,
      v.meaning, v.status, v.listen_count as listenCount, v.last_listened_at as lastListenedAt,
      v.created_at as createdAt, v.updated_at as updatedAt, d.date as studyDate
    FROM vocabularies v
    JOIN vocabulary_days d ON v.day_id = d.id
    WHERE v.id = ?
  `).get(id) as Vocabulary | undefined;

  return row || null;
}

export function createVocabulary(data: {
  date: string;
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  meaning: string;
}): Vocabulary {
  const db = getDb();
  const dayId = getOrCreateDay(data.date);
  const id = `vocab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO vocabularies (id, day_id, word, phonetic, part_of_speech, meaning, status, listen_count, last_listened_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'NEW', 0, NULL, ?, ?)
  `).run(id, dayId, data.word.trim(), data.phonetic?.trim() || '', data.partOfSpeech?.trim() || '', data.meaning.trim(), now, now);

  return getVocabularyById(id)!;
}

export function updateVocabulary(id: string, data: Partial<{
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaning: string;
  status: string;
}>): Vocabulary | null {
  const db = getDb();
  const updates: string[] = [];
  const params: any[] = [];

  if (data.word !== undefined) {
    updates.push('word = ?');
    params.push(data.word.trim());
  }
  if (data.phonetic !== undefined) {
    updates.push('phonetic = ?');
    params.push(data.phonetic.trim());
  }
  if (data.partOfSpeech !== undefined) {
    updates.push('part_of_speech = ?');
    params.push(data.partOfSpeech.trim());
  }
  if (data.meaning !== undefined) {
    updates.push('meaning = ?');
    params.push(data.meaning.trim());
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }

  if (updates.length === 0) {
    return getVocabularyById(id);
  }

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  db.prepare(`UPDATE vocabularies SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  return getVocabularyById(id);
}

export function deleteVocabulary(id: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM vocabularies WHERE id = ?').run(id);
  return res.changes > 0;
}

export function incrementListenCount(id: string): { listenCount: number; lastListenedAt: string } | null {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE vocabularies 
    SET listen_count = listen_count + 1, last_listened_at = ?, updated_at = ?
    WHERE id = ?
  `).run(now, now, id);

  const row = db.prepare('SELECT listen_count as listenCount, last_listened_at as lastListenedAt FROM vocabularies WHERE id = ?').get(id) as any;
  return row || null;
}

export function updateVocabularyStatus(id: string, status: string): boolean {
  const db = getDb();
  const now = new Date().toISOString();
  const res = db.prepare(`
    UPDATE vocabularies SET status = ?, updated_at = ? WHERE id = ?
  `).run(status, now, id);
  return res.changes > 0;
}

export function findDuplicates(words: string[]): Record<string, { exists: boolean; existingDate?: string; existingId?: string }> {
  const db = getDb();
  const result: Record<string, { exists: boolean; existingDate?: string; existingId?: string }> = {};

  for (const word of words) {
    const cleanWord = word.trim().toLowerCase();
    const row = db.prepare(`
      SELECT v.id, d.date 
      FROM vocabularies v
      JOIN vocabulary_days d ON v.day_id = d.id
      WHERE LOWER(v.word) = ?
      LIMIT 1
    `).get(cleanWord) as { id: string; date: string } | undefined;

    if (row) {
      result[cleanWord] = {
        exists: true,
        existingDate: row.date,
        existingId: row.id,
      };
    } else {
      result[cleanWord] = {
        exists: false,
      };
    }
  }

  return result;
}

export function importVocabularies(
  date: string,
  items: Array<{
    word: string;
    phonetic: string;
    partOfSpeech: string;
    meaning: string;
    resolution?: ConflictResolution;
  }>
): { added: number; updated: number; skipped: number } {
  const db = getDb();
  const dayId = getOrCreateDay(date);
  const now = new Date().toISOString();

  let added = 0;
  let updated = 0;
  let skipped = 0;

  const insertStmt = db.prepare(`
    INSERT INTO vocabularies (id, day_id, word, phonetic, part_of_speech, meaning, status, listen_count, last_listened_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'NEW', 0, NULL, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE vocabularies
    SET phonetic = ?, part_of_speech = ?, meaning = ?, updated_at = ?
    WHERE id = ?
  `);

  const findExistingStmt = db.prepare(`
    SELECT id FROM vocabularies WHERE LOWER(word) = LOWER(?) LIMIT 1
  `);

  const tx = db.transaction(() => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const resolution = item.resolution || 'skip';
      const existing = findExistingStmt.get(item.word.trim()) as { id: string } | undefined;

      if (existing) {
        if (resolution === 'skip') {
          skipped++;
          continue;
        } else if (resolution === 'update') {
          updateStmt.run(item.phonetic || '', item.partOfSpeech || '', item.meaning, now, existing.id);
          updated++;
          continue;
        }
        // if resolution === 'duplicate', proceed to insert new
      }

      const id = `vocab_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;
      insertStmt.run(id, dayId, item.word.trim(), item.phonetic || '', item.partOfSpeech || '', item.meaning.trim(), now, now);
      added++;
    }
  });

  tx();

  return { added, updated, skipped };
}

export function getStatistics(): StatisticsData {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const overall = db.prepare(`
    SELECT 
      COUNT(id) as totalWords,
      SUM(CASE WHEN status = 'LEARNED' THEN 1 ELSE 0 END) as learnedWords,
      SUM(CASE WHEN status = 'LEARNING' THEN 1 ELSE 0 END) as learningWords,
      SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END) as unlearnedWords,
      SUM(listen_count) as totalListens
    FROM vocabularies
  `).get() as any;

  const todayStats = db.prepare(`
    SELECT 
      COUNT(v.id) as todayWords,
      SUM(CASE WHEN date(v.last_listened_at) = date('now') THEN v.listen_count ELSE 0 END) as listenedToday
    FROM vocabularies v
    JOIN vocabulary_days d ON v.day_id = d.id
    WHERE d.date = ?
  `).get(today) as any;

  // Compute consecutive streak days with vocabularies
  const days = db.prepare('SELECT date FROM vocabulary_days ORDER BY date DESC').all() as { date: string }[];
  let streak = 0;
  if (days.length > 0) {
    // Check if the latest day is today or yesterday
    const nowMs = new Date(today).getTime();
    let prevMs = nowMs;
    for (const d of days) {
      const dMs = new Date(d.date).getTime();
      const diffDays = Math.round((prevMs - dMs) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) {
        streak++;
        prevMs = dMs;
      } else {
        break;
      }
    }
  }

  return {
    todayWords: Number(todayStats?.todayWords || 0),
    learnedWords: Number(overall?.learnedWords || 0),
    learningWords: Number(overall?.learningWords || 0),
    unlearnedWords: Number(overall?.unlearnedWords || 0),
    listenedToday: Number(todayStats?.listenedToday || 0),
    totalListens: Number(overall?.totalListens || 0),
    totalWords: Number(overall?.totalWords || 0),
    streakDays: streak > 0 ? streak : (overall?.totalWords > 0 ? 1 : 0),
    todayDate: today,
  };
}

export function getUserSettings(): UserSettings {
  const db = getDb();
  const row = db.prepare('SELECT * FROM user_settings WHERE id = ?').get('default') as any;
  if (!row) {
    return {
      id: 'default',
      voice: '',
      speed: 1.0,
      pitch: 1.0,
      volume: 1.0,
      repeatCount: 2,
      pauseBetweenWords: 2,
      autoMarkListened: true,
      autoMarkLearned: false,
      theme: 'dark',
    };
  }

  return {
    id: row.id,
    voice: row.voice || '',
    speed: Number(row.speed || 1.0),
    pitch: Number(row.pitch || 1.0),
    volume: Number(row.volume || 1.0),
    repeatCount: Number(row.repeat_count || 2),
    pauseBetweenWords: Number(row.pause_between_words || 2),
    autoMarkListened: Boolean(row.auto_mark_listened),
    autoMarkLearned: Boolean(row.auto_mark_learned),
    theme: row.theme || 'dark',
  };
}

export function updateUserSettings(settings: Partial<UserSettings>): UserSettings {
  const db = getDb();
  const current = getUserSettings();
  const updated = { ...current, ...settings };

  db.prepare(`
    UPDATE user_settings
    SET voice = ?, speed = ?, pitch = ?, volume = ?, repeat_count = ?,
        pause_between_words = ?, auto_mark_listened = ?, auto_mark_learned = ?, theme = ?
    WHERE id = 'default'
  `).run(
    updated.voice,
    updated.speed,
    updated.pitch,
    updated.volume,
    updated.repeatCount,
    updated.pauseBetweenWords,
    updated.autoMarkListened ? 1 : 0,
    updated.autoMarkLearned ? 1 : 0,
    updated.theme
  );

  return updated;
}
