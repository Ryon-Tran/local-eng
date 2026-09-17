import { ParsedVocabItem, ParseError, ParseResult } from '@/types';

/**
 * Robust Regex Parser for Vocabulary entries.
 * Zero-AI dependency: Fast, deterministic, and handles edge cases.
 * 
 * Supports:
 * - Word /IPA/ (POS): Meaning
 * - Word /IPA/ (POS): Meaning | Usage: collocation | Ex: Example sentence
 * - Multi-word phrases: "According to /əˈkɔːrdɪŋ tuː/ (prep): Theo như"
 * - Multi-part-of-speech: "(n/v)", "(adj, adv)"
 * - Separators: ":", "-", "–", "—", or spaces
 * - Discards empty lines cleanly
 * - Returns precise errors with line number and reason for unparseable lines
 */
export function parseVocabularyText(rawText: string): ParseResult {
  const lines = rawText.split(/\r?\n/);
  const items: ParsedVocabItem[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines
    if (!trimmed) {
      continue;
    }

    const lineNumber = i + 1;
    let word = '';
    let phonetic = '';
    let partOfSpeech = '';
    let meaning = '';
    let usage = '';
    let exampleSentence = '';

    // Check if line contains additional metadata separated by |
    // e.g. "Abandon /əˈbændən/ (v): Từ bỏ | Usage: abandon ship | Ex: They had to abandon the car."
    let mainPart = trimmed;
    if (trimmed.includes('|')) {
      const parts = trimmed.split('|').map((p) => p.trim());
      mainPart = parts[0];
      for (let p = 1; p < parts.length; p++) {
        const seg = parts[p];
        if (/^(usage|cách dùng|collocation):/i.test(seg)) {
          usage = seg.replace(/^(usage|cách dùng|collocation):\s*/i, '').trim();
        } else if (/^(ex|example|ví dụ):/i.test(seg)) {
          exampleSentence = seg.replace(/^(ex|example|ví dụ):\s*/i, '').trim();
        }
      }
    }

    // Case 1: Has phonetic brackets /.../ or [...]
    const phoneticMatch = mainPart.match(/^(.*?)\s*([/\[]([^/\]]+)[/\]])\s*(.*)$/);
    if (phoneticMatch) {
      word = phoneticMatch[1].trim();
      phonetic = `/${phoneticMatch[3].trim()}/`;
      const remainder = phoneticMatch[4].trim();

      const posMatch = remainder.match(/^\(([^)]+)\)\s*[:\-–—]?\s*(.*)$/);
      if (posMatch) {
        partOfSpeech = posMatch[1].trim();
        meaning = posMatch[2].trim();
      } else {
        meaning = remainder.replace(/^[:\-–—]\s*/, '').trim();
      }
    } else {
      // Case 2: No phonetic, but has (POS)
      const posMatch = mainPart.match(/^(.*?)\s*\(([^)]+)\)\s*[:\-–—]?\s*(.*)$/);
      if (posMatch) {
        word = posMatch[1].trim();
        partOfSpeech = posMatch[2].trim();
        meaning = posMatch[3].trim();
      } else {
        // Case 3: Split by separator : or -
        const sepMatch = mainPart.match(/^(.*?)\s*[:\-–—]\s*(.*)$/);
        if (sepMatch) {
          word = sepMatch[1].trim();
          meaning = sepMatch[2].trim();
        } else {
          errors.push({
            lineNumber,
            rawLine,
            reason: 'Định dạng không hợp lệ. Cần có dấu hai chấm (:), từ loại trong ngoặc (v) hoặc phiên âm /.../.',
          });
          continue;
        }
      }
    }

    word = word.replace(/[:\-–—]+$/, '').trim();

    if (!word) {
      errors.push({
        lineNumber,
        rawLine,
        reason: 'Thiếu từ tiếng Anh.',
      });
      continue;
    }

    if (!meaning) {
      errors.push({
        lineNumber,
        rawLine,
        reason: 'Thiếu nghĩa tiếng Việt.',
      });
      continue;
    }

    items.push({
      word,
      phonetic,
      partOfSpeech,
      meaning,
      usage: usage || undefined,
      exampleSentence: exampleSentence || undefined,
      rawLine,
      lineNumber,
    });
  }

  return {
    items,
    errors,
    totalLines: lines.length,
    validCount: items.length,
  };
}
