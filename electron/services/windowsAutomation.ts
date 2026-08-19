import { setTimeout as delay } from 'node:timers/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function sendKeys(keys: string) {
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    `[System.Windows.Forms.SendKeys]::SendWait('${keys}')`,
  ].join('; ');

  await execFileAsync('powershell.exe', ['-NoProfile', '-Command', script], {
    windowsHide: true,
  });
}

async function triggerShortcut(shortcut: string, settleMs: number) {
  await delay(120);
  await sendKeys(shortcut);
  await delay(settleMs);
}

export async function triggerCopyShortcut() {
  await triggerShortcut('^c', 180);
}

export async function triggerCopyInsertShortcut() {
  await triggerShortcut('^{INSERT}', 180);
}

export async function triggerPasteShortcut() {
  await triggerShortcut('^v', 180);
}

export async function triggerShiftInsertShortcut() {
  await triggerShortcut('+{INSERT}', 180);
}
