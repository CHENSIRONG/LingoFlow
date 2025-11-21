
export enum Tab {
  Explore = 'EXPLORE',
  Flashcards = 'FLASHCARDS',
}

export interface Flashcard {
  id: string;
  sourceText: string;
  
  // Explanation in Source Language
  definition: string;
  story: string;
  
  // Translations in Target Language
  translation: string;
  definitionTranslation: string;
  storyTranslation: string;

  targetLangCode: string;
  sourceLangCode: string;

  createdAt: number;
  visualType?: VisualType;
  visualContent?: string; // Base64 or SVG string
}

export interface TranslationResult {
  // Source Language Content
  definition?: string;
  story?: string;
  
  // Target Language Content
  translation?: string;
  definitionTranslation?: string;
  storyTranslation?: string;
}

export interface LanguageOption {
  code: string;
  label: string;
  defaultVoice: string;
  altVoice?: string; // For accents
}

export enum VisualType {
  Image = 'IMAGE',
  SVG = 'SVG',
  Video = 'VIDEO'
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', defaultVoice: 'Fenrir', altVoice: 'Puck' }, // Swapped: Fenrir (UK), Puck (US) based on user feedback
  { code: 'zh-CN', label: 'Chinese (Simplified)', defaultVoice: 'Zephyr' },
  { code: 'ja', label: 'Japanese', defaultVoice: 'Kore' },
  { code: 'es', label: 'Spanish', defaultVoice: 'Fenrir' },
  { code: 'fr', label: 'French', defaultVoice: 'Charon' },
  { code: 'de', label: 'German', defaultVoice: 'Fenrir' },
];
