import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { AppSettings } from '../../src/shared/types.js';

const DEFAULT_SETTINGS: AppSettings = {
  previewHotkey: 'Shift+BracketRight|ъ',
  replaceHotkey: 'CommandOrControl+Shift+Digit2|2',
};

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

export async function loadSettings(): Promise<AppSettings> {
  const filePath = getSettingsPath();

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content) as Partial<AppSettings>;

    return {
      previewHotkey: parsed.previewHotkey || DEFAULT_SETTINGS.previewHotkey,
      replaceHotkey: parsed.replaceHotkey || DEFAULT_SETTINGS.replaceHotkey,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const normalized: AppSettings = {
    previewHotkey: settings.previewHotkey.trim() || DEFAULT_SETTINGS.previewHotkey,
    replaceHotkey: settings.replaceHotkey.trim() || DEFAULT_SETTINGS.replaceHotkey,
  };

  await fs.mkdir(path.dirname(getSettingsPath()), { recursive: true });
  await fs.writeFile(getSettingsPath(), JSON.stringify(normalized, null, 2), 'utf8');

  return normalized;
}
