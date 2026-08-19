import { useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';
import {
  codeToDisplayLabel,
  createChordHotkey,
  createHotkeyFromKeyboardEvent,
  formatHotkeyDisplay,
  normalizeDisplayKey,
} from './shared/hotkeys';
import type { AppSettings, OverlayMessage } from './shared/types';

const emptyMessage: OverlayMessage = {
  kind: 'info',
  title: 'Готов к переводу',
  body: 'Используйте хоткеи, чтобы посмотреть перевод или сразу заменить текст.',
};

type HotkeyFieldName = keyof AppSettings;

export default function App() {
  const [message, setMessage] = useState<OverlayMessage>(emptyMessage);
  const [settings, setSettings] = useState<AppSettings>({
    previewHotkey: '',
    replaceHotkey: '',
  });
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [capturing, setCapturing] = useState<HotkeyFieldName | null>(null);
  const [chordCodes, setChordCodes] = useState<string[]>([]);
  const chordTimerRef = useRef<number | null>(null);
  const bridgeReady = typeof window !== 'undefined' && Boolean(window.translatorApi);

  useEffect(() => {
    if (!window.translatorApi) {
      return;
    }

    void window.translatorApi.getSettings().then(setSettings);

    return window.translatorApi.onOverlayMessage((nextMessage) => {
      setMessage(nextMessage);
      setSaveState('idle');
    });
  }, []);

  useEffect(() => {
    return () => {
      if (chordTimerRef.current) {
        window.clearTimeout(chordTimerRef.current);
      }
    };
  }, []);

  const directionLabel = useMemo(() => {
    if (!message.translation) {
      return 'RU <-> EN';
    }

    return message.translation.direction === 'ru-to-en' ? 'RU -> EN' : 'EN -> RU';
  }, [message.translation]);

  function applyHotkey(fieldName: HotkeyFieldName, hotkey: string) {
    setSettings((current) => ({
      ...current,
      [fieldName]: hotkey,
    }));
    setCapturing(null);
    setChordCodes([]);
    setSaveState('idle');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!window.translatorApi) {
      setSaveState('error');
      return;
    }

    try {
      const saved = await window.translatorApi.saveSettings(settings);
      setSettings(saved);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }

  function finalizeSingleKey(fieldName: HotkeyFieldName, code: string, label: string) {
    const hotkey = createChordHotkey([code], [label]);
    if (hotkey) {
      applyHotkey(fieldName, hotkey);
    }
  }

  function handleHotkeyKeyDown(
    fieldName: HotkeyFieldName,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    event.preventDefault();

    const hasModifier = event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;

    if (hasModifier) {
      if (chordTimerRef.current) {
        window.clearTimeout(chordTimerRef.current);
        chordTimerRef.current = null;
      }

      const nextHotkey = createHotkeyFromKeyboardEvent(event);
      if (nextHotkey) {
        applyHotkey(fieldName, nextHotkey);
      }
      return;
    }

    const label = normalizeDisplayKey(event.key);
    const code = event.code;

    if (chordCodes.length === 0) {
      setChordCodes([code]);

      if (chordTimerRef.current) {
        window.clearTimeout(chordTimerRef.current);
      }

      chordTimerRef.current = window.setTimeout(() => {
        finalizeSingleKey(fieldName, code, label);
      }, 650);
      return;
    }

    if (chordTimerRef.current) {
      window.clearTimeout(chordTimerRef.current);
      chordTimerRef.current = null;
    }

    const nextCodes = [...chordCodes, code];
    const labels = nextCodes.map((item) => normalizeDisplayKey(codeToDisplayLabel(item)));
    const hotkey = createChordHotkey(nextCodes, labels);

    if (hotkey) {
      applyHotkey(fieldName, hotkey);
    }
  }

  return (
    <main className={`app app--${message.kind}`}>
      <section className="card">
        <div className="eyebrow">
          <span>SmartTranslater</span>
          <span>{directionLabel}</span>
        </div>

        <h1>{message.title}</h1>
        <p className="lead">{message.body}</p>

        {!bridgeReady ? (
          <p className="status status--error">Не удалось подключить интерфейс приложения.</p>
        ) : null}

        {message.translation ? (
          <div className="translation-block">
            <div>
              <h2>Исходный текст</h2>
              <p>{message.translation.sourceText}</p>
            </div>
            <div>
              <h2>Перевод</h2>
              <p>{message.translation.translatedText}</p>
            </div>
          </div>
        ) : null}

        <form className="settings-form" onSubmit={handleSubmit}>
          <label>
            Хоткей просмотра
            <input
              value={formatHotkeyDisplay(settings.previewHotkey)}
              readOnly
              onFocus={() => {
                setCapturing('previewHotkey');
                setChordCodes([]);
              }}
              onBlur={() => {
                setCapturing((current) => (current === 'previewHotkey' ? null : current));
                setChordCodes([]);
              }}
              onKeyDown={(event) => handleHotkeyKeyDown('previewHotkey', event)}
              placeholder="Shift + Ъ или Q + R"
            />
            <span className="field-hint">
              {capturing === 'previewHotkey'
                ? chordCodes.length > 0
                  ? 'Нажмите вторую клавишу, например R'
                  : 'Нажмите сочетание: Shift + L, Q + R или Shift + Ъ'
                : 'Можно без Ctrl/Alt: Q + R. Буквы сохраняются только в верхнем регистре'}
            </span>
          </label>

          <label>
            Хоткей замены
            <input
              value={formatHotkeyDisplay(settings.replaceHotkey)}
              readOnly
              onFocus={() => {
                setCapturing('replaceHotkey');
                setChordCodes([]);
              }}
              onBlur={() => {
                setCapturing((current) => (current === 'replaceHotkey' ? null : current));
                setChordCodes([]);
              }}
              onKeyDown={(event) => handleHotkeyKeyDown('replaceHotkey', event)}
              placeholder="Ctrl + Shift + 2"
            />
            <span className="field-hint">
              {capturing === 'replaceHotkey'
                ? chordCodes.length > 0
                  ? 'Нажмите вторую клавишу'
                  : 'Нажмите сочетание клавиш'
                : 'Кликните в поле и нажмите нужные клавиши'}
            </span>
          </label>

          <button type="submit">Сохранить хоткеи</button>
        </form>

        {saveState === 'saved' ? <p className="status">Настройки сохранены.</p> : null}
        {saveState === 'error' ? (
          <p className="status status--error">Не удалось сохранить хоткеи.</p>
        ) : null}
      </section>
    </main>
  );
}
