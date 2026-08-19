import { createRequire } from 'node:module';
import koffi from 'koffi';

const require = createRequire(import.meta.url);
const { WinGlobalKeyLookup } = require('node-global-key-listener/build/ts/_data/WinGlobalKeyLookup.js');

export type WinKeyEvent = {
  name?: string;
  state: 'DOWN' | 'UP';
  vKey: number;
  scanCode: number;
};

export type WinKeyDownMap = Record<string, boolean>;

type KeyHandler = (event: WinKeyEvent, down: WinKeyDownMap) => boolean;

const WH_KEYBOARD_LL = 13;
const WM_KEYDOWN = 0x0100;
const WM_KEYUP = 0x0101;
const WM_SYSKEYDOWN = 0x0104;
const WM_SYSKEYUP = 0x0105;

const user32 = koffi.load('user32.dll');

const KBDLLHOOKSTRUCT = koffi.struct('KBDLLHOOKSTRUCT', {
  vkCode: 'uint32',
  scanCode: 'uint32',
  flags: 'uint32',
  time: 'uint32',
  dwExtraInfo: 'uintptr',
});

const LowLevelKeyboardProc = koffi.proto(
  'intptr __stdcall LowLevelKeyboardProc(int nCode, uintptr wParam, intptr lParam)',
);

const SetWindowsHookExW = user32.func(
  'void* __stdcall SetWindowsHookExW(int idHook, LowLevelKeyboardProc *lpfn, void* hMod, uint32 dwThreadId)',
);
const UnhookWindowsHookEx = user32.func('int __stdcall UnhookWindowsHookEx(void* hhk)');
const CallNextHookEx = user32.func(
  'intptr __stdcall CallNextHookEx(void* hhk, int nCode, uintptr wParam, intptr lParam)',
);

const DOWN_MAP_ALIASES: Record<number, string[]> = {
  0xdd: [']'],
  0xdb: ['['],
};

let hookHandle: unknown = null;
let hookCallback: unknown = null;
let isDown: WinKeyDownMap = {};
let onKeyEvent: KeyHandler | null = null;

function getKeyName(vkCode: number) {
  const entry = WinGlobalKeyLookup[vkCode];
  return entry?.standardName || entry?.name || undefined;
}

function setKeyState(vkCode: number, name: string | undefined, pressed: boolean) {
  if (name) {
    isDown[name] = pressed;
  }

  for (const alias of DOWN_MAP_ALIASES[vkCode] ?? []) {
    isDown[alias] = pressed;
  }
}

function getEventState(wParam: number): 'DOWN' | 'UP' | null {
  if (wParam === WM_KEYDOWN || wParam === WM_SYSKEYDOWN) {
    return 'DOWN';
  }

  if (wParam === WM_KEYUP || wParam === WM_SYSKEYUP) {
    return 'UP';
  }

  return null;
}

export function startWinKeyboardHook(handler: KeyHandler) {
  stopWinKeyboardHook();
  onKeyEvent = handler;
  isDown = {};

  hookCallback = koffi.register((nCode: number, wParam: number, lParam: number) => {
    if (nCode >= 0 && onKeyEvent) {
      const state = getEventState(wParam);

      if (state) {
        const info = koffi.decode(lParam, KBDLLHOOKSTRUCT);
        const name = getKeyName(info.vkCode);

        setKeyState(info.vkCode, name, state === 'DOWN');

        const suppress = onKeyEvent(
          {
            name,
            state,
            vKey: info.vkCode,
            scanCode: info.scanCode,
          },
          { ...isDown },
        );

        if (suppress) {
          return 1;
        }
      }
    }

    return CallNextHookEx(hookHandle, nCode, wParam, lParam);
  }, koffi.pointer(LowLevelKeyboardProc));

  hookHandle = SetWindowsHookExW(WH_KEYBOARD_LL, hookCallback, null, 0);

  if (!hookHandle) {
    hookCallback = null;
    onKeyEvent = null;
    isDown = {};
    throw new Error('Failed to install Windows keyboard hook');
  }
}

export function stopWinKeyboardHook() {
  if (hookHandle) {
    UnhookWindowsHookEx(hookHandle);
    hookHandle = null;
  }

  hookCallback = null;
  onKeyEvent = null;
  isDown = {};
}
