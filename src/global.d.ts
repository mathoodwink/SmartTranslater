import type { PreviewPayload, TranslatorApi } from './shared/types';

declare global {
  interface Window {
    translatorApi: TranslatorApi;
    previewApi: {
      onPreview: (callback: (payload: PreviewPayload) => void) => () => void;
      close: () => void;
    };
  }
}

export {};
