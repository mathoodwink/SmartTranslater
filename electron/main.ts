import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  clipboard,
  Notification,
  screen,
} from 'electron';
import { captureClipboard, restoreClipboard } from './services/clipboard.js';
import { registerLayoutHotkeys, unregisterLayoutHotkeys } from './services/hotkeys.js';
import { getTrayIcon } from './services/icon.js';
import { loadSettings, saveSettings } from './services/settings.js';
import { translateSelection } from './services/translation.js';
import { checkForUpdates, setupAutoUpdater } from './services/updater.js';
import {
  triggerCopyShortcut,
  triggerCopyInsertShortcut,
  triggerPasteShortcut,
} from './services/windowsAutomation.js';
import type { AppSettings, PreviewPayload, TranslationPayload } from '../src/shared/types.js';

const APP_NAME = 'SmartTranslater';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;

let settingsWindow: BrowserWindow | null = null;
let previewWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let currentSettings: AppSettings;
let previewHideTimer: NodeJS.Timeout | null = null;
let previewReady = false;
let pendingPreviewPayload: PreviewPayload | null = null;
let isQuitting = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function getRendererIndexPath() {
  return path.join(__dirname, '../../renderer/index.html');
}

function getPreviewIndexPath() {
  return path.join(__dirname, '../../renderer/preview.html');
}

async function createSettingsWindow() {
  settingsWindow = new BrowserWindow({
    width: 460,
    height: 520,
    show: false,
    frame: true,
    resizable: true,
    transparent: false,
    backgroundColor: '#0d111c',
    skipTaskbar: false,
    alwaysOnTop: false,
    title: APP_NAME,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    try {
      await settingsWindow.loadURL('http://127.0.0.1:5173/');
    } catch {
      await settingsWindow.loadFile(getRendererIndexPath());
    }
  } else {
    await settingsWindow.loadFile(getRendererIndexPath());
  }

  settingsWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      settingsWindow?.hide();
    }
  });
}

async function ensurePreviewWindow() {
  if (previewWindow) {
    return previewWindow;
  }

  previewWindow = new BrowserWindow({
    width: 420,
    height: 180,
    show: false,
    frame: false,
    resizable: false,
    transparent: true,
    backgroundColor: '#00000000',
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    fullscreenable: false,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload-preview.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  previewWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (isDev) {
    try {
      await previewWindow.loadURL('http://127.0.0.1:5173/preview.html');
    } catch {
      await previewWindow.loadFile(getPreviewIndexPath());
    }
  } else {
    await previewWindow.loadFile(getPreviewIndexPath());
  }

  previewWindow.on('blur', () => {
    // Keep preview visible; it closes by timeout or close button.
  });

  previewWindow.on('closed', () => {
    previewWindow = null;
    previewReady = false;
    pendingPreviewPayload = null;
  });

  return previewWindow;
}

function getPreviewTitle(translation: TranslationPayload) {
  if (translation.direction === 'ru-to-en') {
    return 'Russian to English (Google)';
  }

  return 'English to Russian (Google)';
}

function positionPreviewWindow(width: number, height: number) {
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const padding = 12;
  let x = cursor.x + 16;
  let y = cursor.y + 16;

  if (x + width > display.workArea.x + display.workArea.width - padding) {
    x = cursor.x - width - 16;
  }

  if (y + height > display.workArea.y + display.workArea.height - padding) {
    y = cursor.y - height - 16;
  }

  x = Math.max(display.workArea.x + padding, x);
  y = Math.max(display.workArea.y + padding, y);

  previewWindow?.setPosition(Math.round(x), Math.round(y));
}

async function showPreviewPopup(translation: TranslationPayload) {
  const popup = await ensurePreviewWindow();
  const payload: PreviewPayload = {
    title: getPreviewTitle(translation),
    text: translation.translatedText,
  };

  const width = Math.min(460, Math.max(280, translation.translatedText.length * 7 + 80));
  const height = Math.min(320, Math.max(120, translation.translatedText.split('\n').length * 28 + 70));

  popup.setSize(width, height);
  positionPreviewWindow(width, height);

  const deliverPreview = () => {
    popup.webContents.send('preview:show', payload);
    pendingPreviewPayload = null;
  };

  if (previewReady && !popup.webContents.isLoading()) {
    deliverPreview();
  } else {
    pendingPreviewPayload = payload;
  }

  popup.showInactive();

  setTimeout(() => {
    if (!pendingPreviewPayload || !previewWindow) {
      return;
    }

    previewWindow.webContents.send('preview:show', pendingPreviewPayload);
    pendingPreviewPayload = null;
  }, 120);

  if (previewHideTimer) {
    clearTimeout(previewHideTimer);
  }

  previewHideTimer = setTimeout(() => {
    popup.hide();
  }, 12000);
}

function showSettingsWindow() {
  if (!settingsWindow) {
    return;
  }

  const display = screen.getPrimaryDisplay();
  const { width, height } = settingsWindow.getBounds();

  settingsWindow.setPosition(
    Math.round(display.workArea.x + (display.workArea.width - width) / 2),
    Math.round(display.workArea.y + (display.workArea.height - height) / 2),
  );
  settingsWindow.show();
  settingsWindow.focus();
}

function notifyUser(title: string, body: string) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

function showNotification(body: string) {
  if (Notification.isSupported()) {
    new Notification({ title: APP_NAME, body }).show();
  }
}

async function readSelectedText() {
  settingsWindow?.hide();
  await delay(120);

  const snapshot = captureClipboard();

  try {
    clipboard.clear();

    for (const copyAttempt of [triggerCopyShortcut, triggerCopyInsertShortcut]) {
      await copyAttempt();
      const selectedText = clipboard.readText().trim();

      if (selectedText) {
        return selectedText;
      }
    }

    return '';
  } finally {
    restoreClipboard(snapshot);
  }
}

async function replaceSelectedText(value: string) {
  const snapshot = captureClipboard();

  try {
    clipboard.writeText(value);
    await triggerPasteShortcut();
  } finally {
    restoreClipboard(snapshot);
  }
}

async function handleTranslationAction(mode: 'preview' | 'replace') {
  settingsWindow?.hide();

  try {
    await delay(150);
    const selectedText = await readSelectedText();

    if (!selectedText) {
      notifyUser(APP_NAME, 'Сначала выделите текст в любом приложении.');
      return;
    }

    const translation = await translateSelection(selectedText);

    if (mode === 'replace') {
      await replaceSelectedText(translation.translatedText);
      return;
    }

    await showPreviewPopup(translation);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось выполнить перевод.';
    notifyUser('Ошибка перевода', message);
  } finally {
    settingsWindow?.hide();
  }
}

async function registerHotkeys(settings: AppSettings) {
  unregisterLayoutHotkeys();

  if (!settings.previewHotkey || !settings.replaceHotkey) {
    return false;
  }

  try {
    await registerLayoutHotkeys(
      [
        { action: 'preview', value: settings.previewHotkey },
        { action: 'replace', value: settings.replaceHotkey },
      ],
      {
        preview: () => {
          void handleTranslationAction('preview');
        },
        replace: () => {
          void handleTranslationAction('replace');
        },
      },
    );
    return true;
  } catch (error) {
    console.error('[hotkeys] Failed to register:', error);
    showNotification('Не удалось запустить перехват клавиш.');
    return false;
  }
}

function createTray() {
  tray = new Tray(getTrayIcon());
  tray.setToolTip(APP_NAME);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Показать окно',
        click: () => {
          showSettingsWindow();
        },
      },
      {
        label: 'Проверить обновления',
        click: () => {
          checkForUpdates(true);
        },
      },
      {
        label: 'Выход',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );

  tray.on('double-click', () => {
    showSettingsWindow();
  });
}

function registerIpc() {
  ipcMain.handle('settings:get', async () => currentSettings);
  ipcMain.handle('settings:save', async (_event, nextSettings: AppSettings) => {
    const previousSettings = currentSettings;
    const hotkeysReady = await registerHotkeys(nextSettings);

    if (!hotkeysReady) {
      await registerHotkeys(previousSettings);
      throw new Error('Не удалось зарегистрировать хоткеи. Проверьте формат и занятость сочетаний.');
    }

    currentSettings = await saveSettings(nextSettings);
    showNotification('Хоткеи обновлены.');
    return currentSettings;
  });

  ipcMain.on('preview:close', () => {
    previewWindow?.hide();
  });

  ipcMain.on('preview:ready', () => {
    previewReady = true;

    if (pendingPreviewPayload && previewWindow) {
      previewWindow.webContents.send('preview:show', pendingPreviewPayload);
      pendingPreviewPayload = null;
      previewWindow.showInactive();
    }
  });
}

app.whenReady().then(async () => {
  currentSettings = await loadSettings();
  registerIpc();

  if (!(await registerHotkeys(currentSettings))) {
    showNotification('Часть хоткеев не удалось зарегистрировать. Проверьте настройки.');
  }

  await createSettingsWindow();
  createTray();

  if (app.isPackaged) {
    setupAutoUpdater();
  }
});

app.on('second-instance', () => {
  showSettingsWindow();
});

app.on('will-quit', () => {
  unregisterLayoutHotkeys();
});
