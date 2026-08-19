import fs from 'node:fs';
import path from 'node:path';
import { app, nativeImage } from 'electron';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function firstExistingPath(candidates: string[]) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

export function getAppIconPath() {
  return firstExistingPath([
    path.join(process.resourcesPath, 'icon.png'),
    path.join(__dirname, '../../build/icon.png'),
    path.join(app.getAppPath(), 'build/icon.png'),
  ]);
}

export function getTrayIcon() {
  const icon = nativeImage.createFromPath(getAppIconPath());

  if (icon.isEmpty()) {
    return nativeImage.createEmpty();
  }

  return icon.resize({ width: 16, height: 16 });
}
