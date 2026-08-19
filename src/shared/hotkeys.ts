export interface HotkeyBinding {
  modifiers: string[];
  codes: string[];
  key: string;
}

const MODIFIERS = new Set(['CommandOrControl', 'Shift', 'Alt']);

const MODIFIER_LABELS: Record<string, string> = {
  CommandOrControl: 'Ctrl',
  Shift: 'Shift',
  Alt: 'Alt',
};

export function normalizeDisplayKey(key: string) {
  if (key.length === 1 && /[a-zA-Zа-яА-ЯёЁ]/.test(key)) {
    return key.toUpperCase();
  }

  return key;
}

export function serializeHotkey(binding: HotkeyBinding) {
  const parts = [...binding.modifiers, ...binding.codes];
  return `${parts.join('+')}|${normalizeDisplayKey(binding.key)}`;
}

export function parseHotkey(value: string): HotkeyBinding | null {
  if (!value.trim()) {
    return null;
  }

  if (value.includes('|')) {
    const separatorIndex = value.lastIndexOf('|');
    const left = value.slice(0, separatorIndex);
    const key = normalizeDisplayKey(value.slice(separatorIndex + 1));
    const parts = left.split('+').filter(Boolean);

    if (parts.length === 0) {
      return null;
    }

    const modifiers = parts.filter((part) => MODIFIERS.has(part));
    const codes = parts.filter((part) => !MODIFIERS.has(part));

    if (codes.length === 0) {
      return null;
    }

    return { modifiers, codes, key };
  }

  const parts = value.split('+').filter(Boolean);
  const last = parts.pop();

  if (!last) {
    return null;
  }

  return {
    modifiers: parts,
    codes: [legacyKeyToCode(last)],
    key: normalizeDisplayKey(last),
  };
}

export function formatHotkeyDisplay(value: string) {
  const binding = parseHotkey(value);

  if (!binding) {
    return value;
  }

  if (binding.key.includes('+')) {
    return binding.key.split('+').join(' + ');
  }

  const modifiers = binding.modifiers.map((modifier) => MODIFIER_LABELS[modifier] || modifier);
  return [...modifiers, binding.key].filter(Boolean).join(' + ');
}

export function codeToDisplayLabel(code: string) {
  if (code.startsWith('Key')) {
    return code.slice(3);
  }

  if (code.startsWith('Digit')) {
    return code.slice(5);
  }

  return code;
}

function legacyKeyToCode(key: string) {
  const normalized = normalizeDisplayKey(key);

  if (/^F\d{1,2}$/.test(normalized)) {
    return normalized;
  }

  if (normalized.length === 1 && /[0-9]/.test(normalized)) {
    return `Digit${normalized}`;
  }

  if (normalized.length === 1 && /[A-Z]/.test(normalized)) {
    return `Key${normalized}`;
  }

  const named: Record<string, string> = {
    Space: 'Space',
    Esc: 'Escape',
    Escape: 'Escape',
    Enter: 'Enter',
    Tab: 'Tab',
    Up: 'ArrowUp',
    Down: 'ArrowDown',
    Left: 'ArrowLeft',
    Right: 'ArrowRight',
    Delete: 'Delete',
    Backspace: 'Backspace',
    Insert: 'Insert',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    ']': 'BracketRight',
    '[': 'BracketLeft',
    ';': 'Semicolon',
    "'": 'Quote',
    ',': 'Comma',
    '.': 'Period',
    '/': 'Slash',
    '\\': 'Backslash',
    '`': 'Backquote',
    '-': 'Minus',
    '=': 'Equal',
    Ъ: 'BracketRight',
    Х: 'BracketLeft',
  };

  return named[normalized] || normalized;
}

export function createHotkeyFromKeyboardEvent(event: {
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  key: string;
  code: string;
}) {
  const blockedKeys = new Set(['Control', 'Shift', 'Alt', 'Meta']);
  if (blockedKeys.has(event.key)) {
    return null;
  }

  const modifiers: string[] = [];

  if (event.ctrlKey || event.metaKey) {
    modifiers.push('CommandOrControl');
  }

  if (event.altKey) {
    modifiers.push('Alt');
  }

  if (event.shiftKey) {
    modifiers.push('Shift');
  }

  const displayKey = normalizeDisplayKey(event.key);

  return serializeHotkey({
    modifiers,
    codes: [event.code],
    key: displayKey,
  });
}

export function createChordHotkey(codes: string[], labels: string[]) {
  if (codes.length === 0) {
    return null;
  }

  const key = labels.map((label) => normalizeDisplayKey(label)).join('+');

  return serializeHotkey({
    modifiers: [],
    codes,
    key,
  });
}
