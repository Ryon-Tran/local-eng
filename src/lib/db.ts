import { Pool } from 'pg';
import { Vocabulary, VocabularyDay, UserSettings, StatisticsData, ConflictResolution } from '@/types';
import { SEED_VOCABULARIES } from './seed';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_0NfvBHSXDru8@ep-rapid-thunder-aio4c6y7-pooler.c-4.us-east-1.aws.neon.tech/local_eng?sslmode=require';

let pool: Pool | null = null;
let isInitialized = false;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export async function initDb(): Promise<void> {
  if (isInitialized) return;
  const p = getPool();

  await p.query(`
    CREATE TABLE IF NOT EXISTS vocabulary_days (
      id VARCHAR(100) PRIMARY KEY,
      date VARCHAR(20) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vocabularies (
      id VARCHAR(100) PRIMARY KEY,
      day_id VARCHAR(100) NOT NULL REFERENCES vocabulary_days(id) ON DELETE CASCADE,
      word VARCHAR(255) NOT NULL,
      phonetic VARCHAR(255),
      part_of_speech VARCHAR(100),
      meaning TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'NEW',
      listen_count INT DEFAULT 0,
      last_listened_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_vocab_day_id ON vocabularies(day_id);
    CREATE INDEX IF NOT EXISTS idx_vocab_word ON vocabularies(word);
    CREATE INDEX IF NOT EXISTS idx_vocab_status ON vocabularies(status);
    CREATE INDEX IF NOT EXISTS idx_vocab_days_date ON vocabulary_days(date);

    CREATE TABLE IF NOT EXISTS user_settings (
      id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
      voice VARCHAR(255) DEFAULT '',
      speed REAL DEFAULT 1.0,
      pitch REAL DEFAULT 1.0,
      volume REAL DEFAULT 1.0,
      repeat_count INT DEFAULT 2,
      pause_between_words INT DEFAULT 2,
      auto_mark_listened BOOLEAN DEFAULT TRUE,
      auto_mark_learned BOOLEAN DEFAULT FALSE,
      theme VARCHAR(50) DEFAULT 'dark'
    );
  `);

  // Ensure default user settings
  const settingsRes = await p.query('SELECT id FROM user_settings WHERE id = $1', ['default']);
  if (settingsRes.rows.length === 0) {
    await p.query(`
      INSERT INTO user_settings (id, voice, speed, pitch, volume, repeat_count, pause_between_words, auto_mark_listened, auto_mark_learned, theme)
      VALUES ('default', '', 1.0, 1.0, 1.0, 2, 2, TRUE, FALSE, 'dark')
    `);
  }

  // Auto seed 20 words if database has 0 days
  const countRes = await p.query('SELECT COUNT(*) as count FROM vocabulary_days');
  if (parseInt(countRes.rows[0].count, 10) === 0) {
    await seedInitialData();
  }

  isInitialized = true;
}

export async function seedInitialData(): Promise<void> {
  const p = getPool();
  const today = new Date().toISOString().split('T')[0];
  const dayId = `day_${today}`;

  await p.query(
    `INSERT INTO vocabulary_days (id, date) VALUES ($1, $2) ON CONFLICT (date) DO NOTHING`,
    [dayId, today]
  );

  for (let i = 0; i < SEED_VOCABULARIES.length; i++) {
    const item = SEED_VOCABULARIES[i];
    const id = `vocab_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;
    await p.query(
      `INSERT INTO vocabularies (id, day_id, word, phonetic, part_of_speech, meaning, status, listen_count)
       VALUES ($1, $2, $3, $4, $5, $6, 'NEW', 0)`,
      [id, dayId, item.word, item.phonetic, item.partOfSpeech, item.meaning]
    );
  }
}

export async function getDaysWithStats(): Promise<VocabularyDay[]> {
  await initDb();
  const p = getPool();
  const res = await p.query(`
    SELECT 
      d.id,
      d.date,
      d.created_at as "createdAt",
      COUNT(v.id) as "totalCount",
      SUM(CASE WHEN v.status = 'NEW' THEN 1 ELSE 0 END) as "newCount",
      SUM(CASE WHEN v.status = 'LEARNING' THEN 1 ELSE 0 END) as "learningCount",
      SUM(CASE WHEN v.status = 'LEARNED' THEN 1 ELSE 0 END) as "learnedCount",
      COALESCE(SUM(v.listen_count), 0) as "totalListens"
    FROM vocabulary_days d
    LEFT JOIN vocabularies v ON d.id = v.day_id
    GROUP BY d.id, d.date, d.created_at
    ORDER BY d.date DESC
  `);

  return res.rows.map((r) => ({
    id: r.id,
    date: r.date,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    totalCount: parseInt(r.totalCount, 10) || 0,
    newCount: parseInt(r.newCount, 10) || 0,
    learningCount: parseInt(r.learningCount, 10) || 0,
    learnedCount: parseInt(r.learnedCount, 10) || 0,
    totalListens: parseInt(r.totalListens, 10) || 0,
  }));
}

export async function getDayByDate(date: string) {
  await initDb();
  const p = getPool();
  const dayRes = await p.query('SELECT id, date, created_at as "createdAt" FROM vocabulary_days WHERE date = $1', [date]);
  if (dayRes.rows.length === 0) return null;

  const day = dayRes.rows[0];
  const vocabsRes = await p.query(
    `SELECT 
       id, day_id as "dayId", word, phonetic, part_of_speech as "partOfSpeech",
       meaning, status, listen_count as "listenCount", last_listened_at as "lastListenedAt",
       created_at as "createdAt", updated_at as "updatedAt"
     FROM vocabularies
     WHERE day_id = $1
     ORDER BY created_at ASC`,
    [day.id]
  );

  return {
    ...day,
    vocabularies: vocabsRes.rows,
  };
}

export async function getOrCreateDay(date: string): Promise<string> {
  await initDb();
  const p = getPool();
  const existing = await p.query('SELECT id FROM vocabulary_days WHERE date = $1', [date]);
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const id = `day_${date}`;
  await p.query('INSERT INTO vocabulary_days (id, date) VALUES ($1, $2)', [id, date]);
  return id;
}

export async function getVocabularies(filters?: {
  dayId?: string;
  date?: string;
  status?: string;
  search?: string;
}): Promise<Vocabulary[]> {
  await initDb();
  const p = getPool();
  let sql = `
    SELECT 
      v.id, v.day_id as "dayId", v.word, v.phonetic, v.part_of_speech as "partOfSpeech",
      v.meaning, v.status, v.listen_count as "listenCount", v.last_listened_at as "lastListenedAt",
      v.created_at as "createdAt", v.updated_at as "updatedAt", d.date as "studyDate"
    FROM vocabularies v
    JOIN vocabulary_days d ON v.day_id = d.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.dayId) {
    params.push(filters.dayId);
    sql += ` AND v.day_id = $${params.length}`;
  }

  if (filters?.date) {
    params.push(filters.date);
    sql += ` AND d.date = $${params.length}`;
  }

  if (filters?.status && filters.status !== 'ALL') {
    params.push(filters.status);
    sql += ` AND v.status = $${params.length}`;
  }

  if (filters?.search && filters.search.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    sql += ` AND (LOWER(v.word) LIKE $${params.length} OR LOWER(v.meaning) LIKE $${params.length} OR LOWER(v.phonetic) LIKE $${params.length})`;
  }

  sql += ` ORDER BY d.date DESC, v.created_at ASC`;

  const res = await p.query(sql, params);
  return res.rows.map((r) => ({
    ...r,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
    updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : '',
    lastListenedAt: r.lastListenedAt ? new Date(r.lastListenedAt).toISOString() : null,
  }));
}

export async function getVocabularyById(id: string): Promise<Vocabulary | null> {
  await initDb();
  const p = getPool();
  const res = await p.query(
    `SELECT 
       v.id, v.day_id as "dayId", v.word, v.phonetic, v.part_of_speech as "partOfSpeech",
       v.meaning, v.status, v.listen_count as "listenCount", v.last_listened_at as "lastListenedAt",
       v.created_at as "createdAt", v.updated_at as "updatedAt", d.date as "studyDate"
     FROM vocabularies v
     JOIN vocabulary_days d ON v.day_id = d.id
     WHERE v.id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

export async function createVocabulary(data: {
  date: string;
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  meaning: string;
}): Promise<Vocabulary> {
  await initDb();
  const p = getPool();
  const dayId = await getOrCreateDay(data.date);
  const id = `vocab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  await p.query(
    `INSERT INTO vocabularies (id, day_id, word, phonetic, part_of_speech, meaning, status, listen_count)
     VALUES ($1, $2, $3, $4, $5, $6, 'NEW', 0)`,
    [id, dayId, data.word.trim(), data.phonetic?.trim() || '', data.partOfSpeech?.trim() || '', data.meaning.trim()]
  );

  return (await getVocabularyById(id))!;
}

export async function updateVocabulary(
  id: string,
  data: Partial<{
    word: string;
    phonetic: string;
    partOfSpeech: string;
    meaning: string;
    status: string;
  }>
): Promise<Vocabulary | null> {
  await initDb();
  const p = getPool();
  const updates: string[] = [];
  const params: any[] = [];

  if (data.word !== undefined) {
    params.push(data.word.trim());
    updates.push(`word = $${params.length}`);
  }
  if (data.phonetic !== undefined) {
    params.push(data.phonetic.trim());
    updates.push(`phonetic = $${params.length}`);
  }
  if (data.partOfSpeech !== undefined) {
    params.push(data.partOfSpeech.trim());
    updates.push(`part_of_speech = $${params.length}`);
  }
  if (data.meaning !== undefined) {
    params.push(data.meaning.trim());
    updates.push(`meaning = $${params.length}`);
  }
  if (data.status !== undefined) {
    params.push(data.status);
    updates.push(`status = $${params.length}`);
  }

  if (updates.length === 0) {
    return getVocabularyById(id);
  }

  updates.push(`updated_at = NOW()`);
  params.push(id);

  await p.query(`UPDATE vocabularies SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
  return getVocabularyById(id);
}

export async function deleteVocabulary(id: string): Promise<boolean> {
  await initDb();
  const p = getPool();
  const res = await p.query('DELETE FROM vocabularies WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function incrementListenCount(id: string): Promise<{ listenCount: number; lastListenedAt: string } | null> {
  await initDb();
  const p = getPool();
  const res = await p.query(
    `UPDATE vocabularies 
     SET listen_count = listen_count + 1, last_listened_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING listen_count as "listenCount", last_listened_at as "lastListenedAt"`,
    [id]
  );
  return res.rows[0] || null;
}

export async function updateVocabularyStatus(id: string, status: string): Promise<boolean> {
  await initDb();
  const p = getPool();
  const res = await p.query(`UPDATE vocabularies SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id]);
  return (res.rowCount ?? 0) > 0;
}

export async function findDuplicates(
  words: string[]
): Promise<Record<string, { exists: boolean; existingDate?: string; existingId?: string }>> {
  await initDb();
  const p = getPool();
  const result: Record<string, { exists: boolean; existingDate?: string; existingId?: string }> = {};

  for (const word of words) {
    const cleanWord = word.trim().toLowerCase();
    const res = await p.query(
      `SELECT v.id, d.date 
       FROM vocabularies v
       JOIN vocabulary_days d ON v.day_id = d.id
       WHERE LOWER(v.word) = $1
       LIMIT 1`,
      [cleanWord]
    );

    if (res.rows.length > 0) {
      result[cleanWord] = {
        exists: true,
        existingDate: res.rows[0].date,
        existingId: res.rows[0].id,
      };
    } else {
      result[cleanWord] = {
        exists: false,
      };
    }
  }

  return result;
}

export async function importVocabularies(
  date: string,
  items: Array<{
    word: string;
    phonetic: string;
    partOfSpeech: string;
    meaning: string;
    resolution?: ConflictResolution;
  }>
): Promise<{ added: number; updated: number; skipped: number }> {
  await initDb();
  const p = getPool();
  const dayId = await getOrCreateDay(date);

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const resolution = item.resolution || 'skip';

    const existingRes = await p.query('SELECT id FROM vocabularies WHERE LOWER(word) = LOWER($1) LIMIT 1', [
      item.word.trim(),
    ]);

    if (existingRes.rows.length > 0) {
      const existingId = existingRes.rows[0].id;
      if (resolution === 'skip') {
        skipped++;
        continue;
      } else if (resolution === 'update') {
        await p.query(
          `UPDATE vocabularies
           SET phonetic = $1, part_of_speech = $2, meaning = $3, updated_at = NOW()
           WHERE id = $4`,
          [item.phonetic || '', item.partOfSpeech || '', item.meaning.trim(), existingId]
        );
        updated++;
        continue;
      }
    }

    const id = `vocab_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;
    await p.query(
      `INSERT INTO vocabularies (id, day_id, word, phonetic, part_of_speech, meaning, status, listen_count)
       VALUES ($1, $2, $3, $4, $5, $6, 'NEW', 0)`,
      [id, dayId, item.word.trim(), item.phonetic || '', item.partOfSpeech || '', item.meaning.trim()]
    );
    added++;
  }

  return { added, updated, skipped };
}

export async function getStatistics(): Promise<StatisticsData> {
  await initDb();
  const p = getPool();
  const today = new Date().toISOString().split('T')[0];

  const overallRes = await p.query(`
    SELECT 
      COUNT(id) as "totalWords",
      SUM(CASE WHEN status = 'LEARNED' THEN 1 ELSE 0 END) as "learnedWords",
      SUM(CASE WHEN status = 'LEARNING' THEN 1 ELSE 0 END) as "learningWords",
      SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END) as "unlearnedWords",
      COALESCE(SUM(listen_count), 0) as "totalListens"
    FROM vocabularies
  `);
  const overall = overallRes.rows[0] || {};

  const todayRes = await p.query(
    `SELECT 
       COUNT(v.id) as "todayWords",
       COALESCE(SUM(CASE WHEN v.last_listened_at::date = CURRENT_DATE THEN v.listen_count ELSE 0 END), 0) as "listenedToday"
     FROM vocabularies v
     JOIN vocabulary_days d ON v.day_id = d.id
     WHERE d.date = $1`,
    [today]
  );
  const todayStats = todayRes.rows[0] || {};

  const daysRes = await p.query('SELECT date FROM vocabulary_days ORDER BY date DESC');
  const days = daysRes.rows;
  let streak = 0;
  if (days.length > 0) {
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
    todayWords: parseInt(todayStats.todayWords, 10) || 0,
    learnedWords: parseInt(overall.learnedWords, 10) || 0,
    learningWords: parseInt(overall.learningWords, 10) || 0,
    unlearnedWords: parseInt(overall.unlearnedWords, 10) || 0,
    listenedToday: parseInt(todayStats.listenedToday, 10) || 0,
    totalListens: parseInt(overall.totalListens, 10) || 0,
    totalWords: parseInt(overall.totalWords, 10) || 0,
    streakDays: streak > 0 ? streak : (parseInt(overall.totalWords, 10) > 0 ? 1 : 0),
    todayDate: today,
  };
}

export async function getUserSettings(): Promise<UserSettings> {
  await initDb();
  const p = getPool();
  const res = await p.query('SELECT * FROM user_settings WHERE id = $1', ['default']);
  const row = res.rows[0];
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

export async function updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
  await initDb();
  const p = getPool();
  const current = await getUserSettings();
  const updated = { ...current, ...settings };

  await p.query(
    `UPDATE user_settings
     SET voice = $1, speed = $2, pitch = $3, volume = $4, repeat_count = $5,
         pause_between_words = $6, auto_mark_listened = $7, auto_mark_learned = $8, theme = $9
     WHERE id = 'default'`,
    [
      updated.voice,
      updated.speed,
      updated.pitch,
      updated.volume,
      updated.repeatCount,
      updated.pauseBetweenWords,
      updated.autoMarkListened,
      updated.autoMarkLearned,
      updated.theme,
    ]
  );

  return updated;
}
