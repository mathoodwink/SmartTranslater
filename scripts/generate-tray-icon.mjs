import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

const size = 32;
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function createTrayIcon() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(rowSize * size);

  for (let y = 0; y < size; y += 1) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0;

    for (let x = 0; x < size; x += 1) {
      const pixelStart = rowStart + 1 + x * 4;
      const centerX = x - size / 2 + 0.5;
      const centerY = y - size / 2 + 0.5;
      const distance = Math.hypot(centerX, centerY);
      const inside = distance <= size * 0.42;

      raw[pixelStart] = inside ? 0x86 : 0x00;
      raw[pixelStart + 1] = inside ? 0x3b : 0x00;
      raw[pixelStart + 2] = inside ? 0xff : 0x00;
      raw[pixelStart + 3] = inside ? 0xff : 0x00;
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    pngSignature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outputPath = path.join(process.cwd(), 'build', 'tray.png');
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, createTrayIcon());
console.log(`[generate-tray-icon] Created ${outputPath}`);
