import { createRequire } from 'node:module';
import { Notification } from 'electron';

const require = createRequire(import.meta.url);
const APP_NAME = 'SmartTranslater';

type AutoUpdater = {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  checkForUpdates: () => Promise<unknown>;
};

let autoUpdater: AutoUpdater | null = null;
let notifyOnError = false;

function getAutoUpdater() {
  if (autoUpdater) {
    return autoUpdater;
  }

  const updaterModule = require('electron-updater') as { autoUpdater: AutoUpdater };
  autoUpdater = updaterModule.autoUpdater;
  return autoUpdater;
}

export function setupAutoUpdater() {
  try {
    const updater = getAutoUpdater();

    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;

    updater.on('update-available', () => {
      notify(`${APP_NAME}: доступно обновление, загружаем...`);
    });

    updater.on('update-downloaded', () => {
      notify(`${APP_NAME}: обновление загружено. Перезапустите приложение.`);
    });

    updater.on('error', (error) => {
      console.error('[updater]', error);
      if (notifyOnError) {
        notify(`${APP_NAME}: не удалось проверить обновления.`);
      }
    });
  } catch (error) {
    console.error('[updater] Failed to initialize:', error);
  }
}

export function checkForUpdates(manual = false) {
  notifyOnError = manual;

  try {
    void getAutoUpdater().checkForUpdates();
  } catch (error) {
    console.error('[updater] Failed to check updates:', error);
    if (manual) {
      notify(`${APP_NAME}: не удалось проверить обновления.`);
    }
  }
}

function notify(body: string) {
  if (Notification.isSupported()) {
    new Notification({ title: APP_NAME, body }).show();
  }
}
