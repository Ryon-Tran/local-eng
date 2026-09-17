import { ParsedVocabItem, ParseError, ParseResult } from '@/types';

/**
 * Robust Regex Parser for Vocabulary entries.
 * Zero-AI dependency: Fast, deterministic, and handles edge cases.
 * 
 * Supports:
 * - Word /IPA/ (POS): Meaning
 * - Word [IPA] (POS): Meaning
 * - Word (POS): Meaning (without IPA)
 * - Word /IPA/: Meaning (without POS)
 * - Multi-word phrases: "According to /əˈkɔːrdɪŋ tuː/ (prep): Theo như"
 * - Multi-part-of-speech: "(n/v)", "(adj, adv)"
 * - Separators: ":", "-", "–", "—", or spaces
 * - Strips redundant whitespace
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

    // Case 1: Has phonetic brackets /.../ or [...]
    // Example: Abandon /əˈbændən/ (v): Từ bỏ
    const phoneticMatch = trimmed.match(/^(.*?)\s*([/\[]([^/\]]+)[/\]])\s*(.*)$/);
    if (phoneticMatch) {
      word = phoneticMatch[1].trim();
      phonetic = `/${phoneticMatch[3].trim()}/`;
      const remainder = phoneticMatch[4].trim();

      // Check if remainder has (POS): Meaning
      const posMatch = remainder.match(/^\(([^)]+)\)\s*[:\-–—]?\s*(.*)$/);
      if (posMatch) {
        partOfSpeech = posMatch[1].trim();
        meaning = posMatch[2].trim();
      } else {
        // No POS, could be: : Meaning or - Meaning or Meaning
        meaning = remainder.replace(/^[:\-–—]\s*/, '').trim();
      }
    } else {
      // Case 2: No phonetic, but has (POS)
      // Example: Abandon (v): Từ bỏ
      const posMatch = trimmed.match(/^(.*?)\s*\(([^)]+)\)\s*[:\-–—]?\s*(.*)$/);
      if (posMatch) {
        word = posMatch[1].trim();
        partOfSpeech = posMatch[2].trim();
        meaning = posMatch[3].trim();
      } else {
        // Case 3: Split by separator : or -
        // Example: Abandon: Từ bỏ
        const sepMatch = trimmed.match(/^(.*?)\s*[:\-–—]\s*(.*)$/);
        if (sepMatch) {
          word = sepMatch[1].trim();
          meaning = sepMatch[2].trim();
        } else {
          // Cannot parse
          errors.push({
            lineNumber,
            rawLine,
            reason: 'Định dạng không hợp lệ. Cần có dấu hai chấm (:), từ loại trong ngoặc (v) hoặc phiên âm /.../.',
          });
          continue;
        }
      }
    }

    // Clean up word: remove trailing colons or punctuation if any
    word = word.replace(/[:\-–—]+$/, '').trim();

    // Validate minimum requirements
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
