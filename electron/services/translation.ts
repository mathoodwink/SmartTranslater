import { translate } from '@vitalets/google-translate-api';
import type { TranslationDirection, TranslationPayload } from '../../src/shared/types.js';

function detectDirection(text: string): TranslationDirection {
  const cyrillicMatches = text.match(/[А-Яа-яЁё]/g)?.length ?? 0;
  const latinMatches = text.match(/[A-Za-z]/g)?.length ?? 0;

  return cyrillicMatches > latinMatches ? 'ru-to-en' : 'en-to-ru';
}

export async function translateSelection(text: string): Promise<TranslationPayload> {
  const normalized = text.trim();

  if (!normalized) {
    throw new Error('Выделенный текст пуст.');
  }

  const direction = detectDirection(normalized);
  const to = direction === 'ru-to-en' ? 'en' : 'ru';
  const from = direction === 'ru-to-en' ? 'ru' : 'en';
  const result = await translate(normalized, { to });

  return {
    sourceText: normalized,
    translatedText: result.text,
    from,
    to,
    direction,
  };
}
