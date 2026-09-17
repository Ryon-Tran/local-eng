/**
 * Web Speech API Text-to-Speech Engine
 * Focuses exclusively on pronouncing English words accurately.
 */

export interface SpeechOptions {
  voiceURI?: string;
  rate?: number;    // Speed: 0.5 to 2.0 (default 1.0)
  pitch?: number;   // Pitch: 0.5 to 1.5 (default 1.0)
  volume?: number;  // Volume: 0.0 to 1.0 (default 1.0)
}

class SpeechEngine {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isLoaded = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  private loadVoices() {
    if (typeof window === 'undefined') return;
    this.voices = window.speechSynthesis.getVoices();
    if (this.voices.length > 0) {
      this.isLoaded = true;
    }
  }

  public getEnglishVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined') return [];
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    // Filter voices that speak English (lang starts with 'en')
    const englishVoices = this.voices.filter(v => v.lang.toLowerCase().startsWith('en'));
    // If no specific english voices found, return all available
    return englishVoices.length > 0 ? englishVoices : this.voices;
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  }

  /**
   * Pronounces an English word.
   * Strips IPA or any Vietnamese symbols to ensure only pristine English is spoken.
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

      // Select voice
      const enVoices = this.getEnglishVoices();
      if (options.voiceURI) {
        const found = enVoices.find(v => v.voiceURI === options.voiceURI);
        if (found) {
          utterance.voice = found;
        }
      }

      // If no matching voice selected, pick best en-US or en-GB default
      if (!utterance.voice && enVoices.length > 0) {
        const defaultEn = enVoices.find(v => v.lang === 'en-US') ||
                          enVoices.find(v => v.lang.startsWith('en')) ||
                          enVoices[0];
        utterance.voice = defaultEn;
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('TTS utterance error/interruption:', e);
        this.currentUtterance = null;
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }
}

export const speechEngine = new SpeechEngine();
