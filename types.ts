export interface TarotCardData {
  id: string;
  name: string;
  description: string;
  uprightMeaning: string;
  reversedMeaning: string;
  visualPrompt: string;
  imageUrl?: string;
  isLoadingImage?: boolean;
  section: DeckSection; // e.g., "Major Arcana", "Cups"
}

export type DeckSection = 'Major Arcana' | 'Wands' | 'Cups' | 'Swords' | 'Pentacles';

export interface DeckTheme {
  name: string;
  description: string;
  artStyle: string;
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING_METADATA = 'GENERATING_METADATA',
  GENERATING_IMAGES = 'GENERATING_IMAGES',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}
