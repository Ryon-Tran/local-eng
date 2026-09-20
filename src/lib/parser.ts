import { ParsedVocabItem, ParseError, ParseResult } from '@/types';

interface VocabDraft {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaning: string;
  usage: string;
  exampleSentence: string;
  startLine: number;
  rawLine: string;
  lastField: 'header' | 'meaning' | 'usage' | 'example';
}

const MEANING_REGEX = /^(?:nghĩa\s*tiếng\s*việt|nghĩa|ý\s*nghĩa|giải\s*thích|meaning|definition)\s*[:：\-–—]\s*(.*)$/i;
const USAGE_REGEX = /^(?:cách\s*dùng\s*[\/\&]\s*collocations?|cách\s*dùng\s*[\/\&]\s*cụm\s*từ|cách\s*dùng|collocations?|collocation|cụm\s*từ\s*thường\s*gặp|cụm\s*từ|usage)\s*[:：\-–—]\s*(.*)$/i;
const EXAMPLE_REGEX = /^(?:ví\s*dụ\s*(?:\([^)]*\))?|câu\s*ví\s*dụ|vd|examples?|ex)\s*[:：\-–—]\s*(.*)$/i;
const TRANSLATION_REGEX = /^(?:dịch\s*nghĩa|dịch|bản\s*dịch|translation)\s*[:：\-–—]\s*(.*)$/i;

// Regex to detect purely Vietnamese text without English word pattern
const VIETNAMESE_CHAR_REGEX = /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i;

/**
 * Robust Multi-line and Single-line Regex Parser for Vocabulary entries.
 * Zero-AI dependency: Ultra-fast, deterministic, and handles edge cases.
 * 
 * Supports:
 * 1. Multi-line Block Format (New):
 *    Achieve /əˈtʃiːv/ (v)
 *    Nghĩa: Đạt được
 *    Cách dùng / Collocations: achieve a goal / target / success; achieve one's dream
 *    Ví dụ: She worked hard to achieve her dream of becoming a doctor. (Cô ấy đã làm việc chăm chỉ...)
 * 
 * 2. Single-line Format (Legacy):
 *    Abandon /əˈbændən/ (v): Từ bỏ
 *    Ability /əˈbɪləti/ (n): Khả năng
 * 
 * 3. Pipe-separated Format:
 *    Abandon /əˈbændən/ (v): Từ bỏ | Usage: abandon ship | Ex: They had to abandon the car.
 * 
 * 4. Simple separator Format:
 *    Book: Sách
 *    Apple - Quả táo
 */
export function parseVocabularyText(rawText: string): ParseResult {
  const lines = rawText.split(/\r?\n/);
  const items: ParsedVocabItem[] = [];
  const errors: ParseError[] = [];

  let current: VocabDraft | null = null;

  const finalizeCurrent = () => {
    if (!current) return;

    const trimmedWord = current.word.trim();
    const trimmedMeaning = current.meaning.trim();

    if (!trimmedWord) {
      errors.push({
        lineNumber: current.startLine,
        rawLine: current.rawLine,
        reason: 'Thiếu từ tiếng Anh.',
      });
    } else if (!trimmedMeaning) {
      errors.push({
        lineNumber: current.startLine,
        rawLine: current.rawLine,
        reason: 'Thiếu nghĩa tiếng Việt.',
      });
    } else {
      items.push({
        word: trimmedWord,
        phonetic: current.phonetic ? current.phonetic.trim() : '',
        partOfSpeech: current.partOfSpeech ? current.partOfSpeech.trim() : '',
        meaning: trimmedMeaning,
        usage: current.usage ? current.usage.trim() : undefined,
        exampleSentence: current.exampleSentence ? current.exampleSentence.trim() : undefined,
        rawLine: current.rawLine,
        lineNumber: current.startLine,
      });
    }

    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    const lineNumber = i + 1;

    // Skip empty lines without prematurely terminating the active draft
    if (!trimmed) {
      continue;
    }

    // 1. Check for Meaning property line
    const meaningMatch = trimmed.match(MEANING_REGEX);
    if (meaningMatch) {
      if (current) {
        current.meaning = meaningMatch[1].trim();
        current.lastField = 'meaning';
      } else {
        errors.push({
          lineNumber,
          rawLine,
          reason: 'Dòng nghĩa nằm ngoài mục từ vựng (chưa có từ tiếng Anh phía trước).',
        });
      }
      continue;
    }

    // 2. Check for Usage / Collocations property line
    const usageMatch = trimmed.match(USAGE_REGEX);
    if (usageMatch) {
      if (current) {
        current.usage = usageMatch[1].trim();
        current.lastField = 'usage';
      } else {
        errors.push({
          lineNumber,
          rawLine,
          reason: 'Dòng cách dùng/collocations nằm ngoài mục từ vựng.',
        });
      }
      continue;
    }

    // 3. Check for Example property line
    const exampleMatch = trimmed.match(EXAMPLE_REGEX);
    if (exampleMatch) {
      if (current) {
        current.exampleSentence = exampleMatch[1].trim();
        current.lastField = 'example';
      } else {
        errors.push({
          lineNumber,
          rawLine,
          reason: 'Dòng ví dụ câu nằm ngoài mục từ vựng.',
        });
      }
      continue;
    }

    // 4. Check for Translation property line (e.g. Dịch: ...)
    const transMatch = trimmed.match(TRANSLATION_REGEX);
    if (transMatch) {
      if (current) {
        const trans = transMatch[1].trim();
        if (current.exampleSentence) {
          current.exampleSentence += ` (${trans})`;
        } else if (current.meaning) {
          current.meaning += ` (${trans})`;
        }
      }
      continue;
    }

    // 5. Continuation lines: bullet points (- ...) or translations in parentheses ( ... )
    if (current) {
      // Line is entirely inside parentheses e.g. "(Cô ấy đã làm việc chăm chỉ...)"
      if (/^\([^)]+\)$/.test(trimmed)) {
        if (current.exampleSentence && current.lastField === 'example') {
          current.exampleSentence += ` ${trimmed}`;
          continue;
        } else if (current.meaning && current.lastField === 'meaning') {
          current.meaning += ` ${trimmed}`;
          continue;
        }
      }

      // Bullet points e.g. "- achieve a goal" or "* achieve success"
      if (/^[-*•]\s+/.test(trimmed)) {
        const bulletContent = trimmed.replace(/^[-*•]\s+/, '').trim();
        if (current.lastField === 'example') {
          current.exampleSentence += (current.exampleSentence ? '\n' : '') + bulletContent;
          continue;
        } else if (current.lastField === 'usage') {
          current.usage = (current.usage ? current.usage + '; ' : '') + bulletContent;
          continue;
        }
      }

      // Pure Vietnamese continuation note without any english pattern
      if (
        VIETNAMESE_CHAR_REGEX.test(trimmed) &&
        !trimmed.includes('/') &&
        !/\([^)]+\)/.test(trimmed) &&
        !/[:：]/.test(trimmed)
      ) {
        if (current.lastField === 'example') {
          current.exampleSentence += ` ${trimmed}`;
          continue;
        } else if (current.lastField === 'meaning') {
          current.meaning += `, ${trimmed}`;
          continue;
        }
      }
    }

    // 6. This is a NEW vocabulary entry header line
    // Finalize the previous entry if any
    finalizeCurrent();

    // Clean leading numbering like "1. ", "1/ ", "1) ", or "- "
    let cleanLine = trimmed.replace(/^\s*(?:\d+[\.\)\/]\s+|[-•*]\s+)/, '');

    // Check for inline pipes: "Word /IPA/ (POS): Meaning | Usage: ... | Ex: ..."
    let inlineUsage = '';
    let inlineExample = '';
    if (cleanLine.includes('|')) {
      const parts = cleanLine.split('|').map((p) => p.trim());
      cleanLine = parts[0];
      for (let p = 1; p < parts.length; p++) {
        const seg = parts[p];
        if (/^(?:usage|cách dùng|collocation):/i.test(seg)) {
          inlineUsage = seg.replace(/^(?:usage|cách dùng|collocation):\s*/i, '').trim();
        } else if (/^(?:ex|example|ví dụ):/i.test(seg)) {
          inlineExample = seg.replace(/^(?:ex|example|ví dụ):\s*/i, '').trim();
        }
      }
    }

    let word = '';
    let phonetic = '';
    let partOfSpeech = '';
    let inlineMeaning = '';

    // Header Case 1: Has phonetic brackets /.../ or [...]
    const phoneticMatch = cleanLine.match(/^(.*?)\s*([/\[]([^/\]]+)[/\]])\s*(.*)$/);
    if (phoneticMatch) {
      word = phoneticMatch[1].trim();
      phonetic = `/${phoneticMatch[3].trim()}/`;
      const remainder = phoneticMatch[4].trim();

      const posMatch = remainder.match(/^\(([^)]+)\)\s*[:：\-–—]?\s*(.*)$/);
      if (posMatch) {
        partOfSpeech = posMatch[1].trim().replace(/\.$/, '');
        inlineMeaning = posMatch[2].trim();
      } else {
        inlineMeaning = remainder.replace(/^[:：\-–—]\s*/, '').trim();
      }
    } else {
      // Header Case 2: No phonetic, but has (POS)
      const posMatch = cleanLine.match(/^(.*?)\s*\(([^)]+)\)\s*[:：\-–—]?\s*(.*)$/);
      if (posMatch) {
        word = posMatch[1].trim();
        partOfSpeech = posMatch[2].trim().replace(/\.$/, '');
        inlineMeaning = posMatch[3].trim();
      } else {
        // Header Case 3: Split by separator : or -
        const sepMatch = cleanLine.match(/^(.*?)\s*[:：\-–—]\s*(.*)$/);
        if (sepMatch) {
          word = sepMatch[1].trim();
          inlineMeaning = sepMatch[2].trim();
        } else {
          // Header Case 4: Plain word line (word only, meaning on subsequent lines)
          // Ensure it's not a misplaced Vietnamese sentence
          if (VIETNAMESE_CHAR_REGEX.test(cleanLine) && !cleanLine.includes('/')) {
            errors.push({
              lineNumber,
              rawLine,
              reason: 'Định dạng không hợp lệ. Cần có từ tiếng Anh, dấu hai chấm (:), từ loại trong ngoặc (v) hoặc phiên âm /.../.',
            });
            continue;
          }
          word = cleanLine.trim();
          inlineMeaning = '';
        }
      }
    }

    // Clean trailing punctuation from word
    word = word.replace(/[:：\-–—]+$/, '').trim();

    if (!word) {
      errors.push({
        lineNumber,
        rawLine,
        reason: 'Thiếu từ tiếng Anh.',
      });
      continue;
    }

    current = {
      word,
      phonetic,
      partOfSpeech,
      meaning: inlineMeaning,
      usage: inlineUsage,
      exampleSentence: inlineExample,
      rawLine,
      startLine: lineNumber,
      lastField: inlineMeaning ? 'meaning' : 'header',
    };
  }

  // Finalize the last pending vocabulary entry
  finalizeCurrent();

  return {
    items,
    errors,
    totalLines: lines.length,
    validCount: items.length,
  };
}
