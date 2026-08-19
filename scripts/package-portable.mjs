import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function main() {
  const projectRoot = process.cwd();
  const releaseDir = path.join(projectRoot, 'release');
  const targetPath = path.join(projectRoot, 'SmartTranslater.zip');

  let files = [];
  try {
    files = await fs.readdir(releaseDir);
  } catch {
    console.warn('[package-portable] release/ folder not found');
    return;
  }

  const zipFile = files.find((file) => file.toLowerCase().endsWith('.zip'));

  if (zipFile) {
    await fs.copyFile(path.join(releaseDir, zipFile), targetPath);
    console.log(`[package-portable] Copied: ${zipFile} -> ${targetPath}`);
    return;
  }

  const unpackedDir = path.join(releaseDir, 'win-unpacked');
  try {
    await fs.access(unpackedDir);
  } catch {
    console.warn('[package-portable] No zip or win-unpacked found in release/');
    return;
  }

  if (process.platform === 'win32') {
    await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `Compress-Archive -Path '${unpackedDir}\\*' -DestinationPath '${targetPath}' -Force`,
      ],
      { windowsHide: true },
    );
    console.log(`[package-portable] Zipped win-unpacked -> ${targetPath}`);
  }
}

await main();
