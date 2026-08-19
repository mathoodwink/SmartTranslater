import koffi from 'koffi';
import { normalizeDisplayKey, parseHotkey } from '../../src/shared/hotkeys.js';
import { startWinKeyboardHook, stopWinKeyboardHook, type WinKeyDownMap } from './winKeyboardHook.js';

type HotkeyAction = 'preview' | 'replace';

interface RegisteredHotkey {
  action: HotkeyAction;
  value: string;
}

const user32 = koffi.load('user32.dll');
const GetKeyboardState = user32.func('bool GetKeyboardState(_Out_ uint8 *lpKeyState)');
const ToUnicodeEx = user32.func(
  'int ToUnicodeEx(uint32 wVirtKey, uint32 wScanCode, const uint8 *lpKeyState, uint16 *pwszBuff, int cchBuff, uint32 wFlags, void *dwhkl)',
);
const GetKeyboardLayout = user32.func('void *GetKeyboardLayout(uint32 idThread)');

let registeredHotkeys: RegisteredHotkey[] = [];
const actionHandlers: Partial<Record<HotkeyAction, () => void>> = {};
let lastTriggerAt = 0;
let hookActive = false;

function getActiveModifiers(down: WinKeyDownMap) {
  const modifiers: string[] = [];

  if (down['LEFT CTRL'] || down['RIGHT CTRL']) {
    modifiers.push('CommandOrControl');
  }

  if (down['LEFT SHIFT'] || down['RIGHT SHIFT']) {
    modifiers.push('Shift');
  }

  if (down['LEFT ALT'] || down['RIGHT ALT']) {
    modifiers.push('Alt');
  }

  return modifiers.sort();
}

function modifiersMatch(expected: string[], actual: string[]) {
  if (expected.length !== actual.length) {
    return false;
  }

  const left = [...expected].sort();
  const right = [...actual].sort();
  return left.every((value, index) => value === right[index]);
}

function getCharFromKey(vKey: number, scanCode: number) {
  const keyState = Buffer.alloc(256);
  const output = Buffer.alloc(8);

  if (!GetKeyboardState(keyState)) {
    return '';
  }

  const length = ToUnicodeEx(vKey, scanCode, keyState, output, 4, 0, GetKeyboardLayout(0));

  if (length <= 0) {
    return '';
  }

  return normalizeDisplayKey(output.toString('utf16le', 0, length * 2));
}

function codeToListenerName(code: string) {
  if (code.startsWith('Key')) {
    return code.slice(3);
  }

  if (code.startsWith('Digit')) {
    return code.slice(5);
  }

  if (code === 'BracketRight') {
    return ']';
  }

  if (code === 'BracketLeft') {
    return '[';
  }

  return code;
}

function isKeyDown(down: WinKeyDownMap, code: string) {
  const name = codeToListenerName(code);
  return Boolean(down[name]);
}

function listenerNameMatchesCode(rawName: string, code: string) {
  const expected = codeToListenerName(code).toUpperCase();
  const actual = rawName.replace(/\s+/g, '').toUpperCase();
  return actual === expected;
}

function matchesHotkey(
  storedValue: string,
  event: { name?: string; state: 'DOWN' | 'UP'; vKey?: number; scanCode?: number },
  down: WinKeyDownMap,
) {
  if (event.state !== 'DOWN') {
    return false;
  }

  const binding = parseHotkey(storedValue);

  if (!binding) {
    return false;
  }

  const activeModifiers = getActiveModifiers(down);

  if (!modifiersMatch(binding.modifiers, activeModifiers)) {
    return false;
  }

  if (binding.codes.length > 1) {
    return binding.codes.every((code) => isKeyDown(down, code));
  }

  const [code] = binding.codes;
  const keyName = event.name || '';
  const producedChar = getCharFromKey(event.vKey || 0, event.scanCode || 0);
  const expectedChar = normalizeDisplayKey(binding.key);

  if (listenerNameMatchesCode(keyName, code)) {
    return true;
  }

  if (producedChar && expectedChar.length === 1 && producedChar === expectedChar) {
    return true;
  }

  return normalizeDisplayKey(keyName) === expectedChar;
}

function triggerAction(action: HotkeyAction) {
  const now = Date.now();
  if (now - lastTriggerAt < 250) {
    return true;
  }

  lastTriggerAt = now;
  actionHandlers[action]?.();
  return true;
}

function handleKeyEvent(
  event: { name?: string; state: 'DOWN' | 'UP'; vKey?: number; scanCode?: number },
  down: WinKeyDownMap,
) {
  for (const hotkey of registeredHotkeys) {
    if (!matchesHotkey(hotkey.value, event, down)) {
      continue;
    }

    return triggerAction(hotkey.action);
  }

  return false;
}

export async function registerLayoutHotkeys(
  hotkeys: RegisteredHotkey[],
  handlers: Partial<Record<HotkeyAction, () => void>>,
) {
  registeredHotkeys = hotkeys;
  Object.assign(actionHandlers, handlers);

  if (!hookActive) {
    startWinKeyboardHook((event, down) => handleKeyEvent(event, down));
    hookActive = true;
  }
}

export function unregisterLayoutHotkeys() {
  registeredHotkeys = [];
  Object.keys(actionHandlers).forEach((key) => {
    delete actionHandlers[key as HotkeyAction];
  });

  if (hookActive) {
    stopWinKeyboardHook();
    hookActive = false;
  }

  lastTriggerAt = 0;
}
