export type TranslationDirection = 'ru-to-en' | 'en-to-ru';
export type OverlayKind = 'translation' | 'success' | 'error' | 'info';

export interface TranslationPayload {
  sourceText: string;
  translatedText: string;
  from: 'ru' | 'en';
  to: 'ru' | 'en';
  direction: TranslationDirection;
}

export interface OverlayMessage {
  kind: OverlayKind;
  title: string;
  body: string;
  translation?: TranslationPayload;
}

export interface AppSettings {
  previewHotkey: string;
  replaceHotkey: string;
}

export interface PreviewPayload {
  title: string;
  text: string;
}

export interface TranslatorApi {
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<AppSettings>;
  onOverlayMessage: (callback: (message: OverlayMessage) => void) => () => void;
}
