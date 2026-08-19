import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const projectRoot = process.cwd();
  const distDir = path.join(projectRoot, 'dist');
  const files = await fs.readdir(distDir);

  const candidates = [];

  for (const file of files) {
    if (!file.toLowerCase().endsWith('.exe')) continue;
    if (!file.toLowerCase().includes('setup')) continue;

    const fullPath = path.join(distDir, file);
    const stat = await fs.stat(fullPath);
    candidates.push({ file, fullPath, mtimeMs: stat.mtimeMs });
  }

  if (candidates.length === 0) {
    console.warn('[copy-installer] No installer .exe found in dist/');
    return;
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const latest = candidates[0];
  const targetPath = path.join(projectRoot, 'Setup.exe');

  await fs.copyFile(latest.fullPath, targetPath);
  console.log(`[copy-installer] Copied: ${latest.file} -> ${targetPath}`);
}

await main();
