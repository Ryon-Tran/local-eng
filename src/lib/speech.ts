/**
 * Web Speech API Text-to-Speech Engine
 * Focuses exclusively on pronouncing English words accurately with customizable voices.
 */

export interface SpeechOptions {
  voiceURI?: string;
  rate?: number;    // Speed: 0.5 to 2.0 (default 1.0)
  pitch?: number;   // Pitch: 0.5 to 1.5 (default 1.0)
  volume?: number;  // Volume: 0.0 to 1.0 (default 1.0)
}

export interface FormattedVoice {
  voiceURI: string;
  name: string;
  lang: string;
  category: 'US' | 'UK' | 'AU' | 'Other';
  label: string;
}

class SpeechEngine {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private activeVoiceURI: string = '';

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  public loadVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    this.voices = window.speechSynthesis.getVoices();
    return this.voices;
  }

  public setActiveVoice(voiceURI: string) {
    this.activeVoiceURI = voiceURI;
  }

  public getActiveVoice(): string {
    return this.activeVoiceURI;
  }

  public getEnglishVoices(): FormattedVoice[] {
    if (typeof window === 'undefined') return [];
    if (this.voices.length === 0) {
      this.loadVoices();
    }

    // Filter English voices
    const en = this.voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    const list = en.length > 0 ? en : this.voices;

    return list.map((v) => {
      let category: 'US' | 'UK' | 'AU' | 'Other' = 'Other';
      const langLower = v.lang.toLowerCase();
      if (langLower.includes('us')) category = 'US';
      else if (langLower.includes('gb') || langLower.includes('uk')) category = 'UK';
      else if (langLower.includes('au')) category = 'AU';

      const flag = category === 'US' ? '🇺🇸' : category === 'UK' ? '🇬🇧' : category === 'AU' ? '🇦🇺' : '🌐';

      return {
        voiceURI: v.voiceURI,
        name: v.name,
        lang: v.lang,
        category,
        label: `${flag} ${v.name} (${v.lang})`,
      };
    });
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  }

  /**
   * Pronounces an English word.
   * Strips IPA or any non-English phonetic symbols to ensure only pristine English is spoken.
   */
  public speak(text: string, options: SpeechOptions = {}): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        console.warn('Web Speech API is not supported in this environment');
        resolve();
        return;
      }

      // Stop any ongoing speech
      this.stop();

      // Clean text: pronounce only the word, no slash symbols, no parens
      const cleanText = text.replace(/[/\\()[\]]/g, '').trim();
      if (!cleanText) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      this.currentUtterance = utterance;

      // Configure utterance
      utterance.rate = options.rate !== undefined ? options.rate : 1.0;
      utterance.pitch = options.pitch !== undefined ? options.pitch : 1.0;
      utterance.volume = options.volume !== undefined ? options.volume : 1.0;

      // Select voice: prioritize options.voiceURI, then activeVoiceURI, then browser default
      const chosenURI = options.voiceURI || this.activeVoiceURI;
      const allVoices = this.voices.length > 0 ? this.voices : window.speechSynthesis.getVoices();

      if (chosenURI) {
        const found = allVoices.find((v) => v.voiceURI === chosenURI);
        if (found) {
          utterance.voice = found;
        }
      }

      // If no matching voice selected, pick best en-US or en-GB default
      if (!utterance.voice && allVoices.length > 0) {
        const defaultEn =
          allVoices.find((v) => v.lang.toLowerCase() === 'en-us') ||
          allVoices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
          allVoices[0];
        utterance.voice = defaultEn;
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('TTS utterance event:', e);
        this.currentUtterance = null;
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }
}

export const speechEngine = new SpeechEngine();
