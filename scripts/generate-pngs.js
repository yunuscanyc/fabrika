import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, colorGenerator) {
  // Simple uncompressed or deflate PNG generator
  const rowSize = width * 4 + 1; // 1 filter byte per row + RGBA
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = colorGenerator(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA (6)
  ihdrData[10] = 0; // Compression method
  ihdrData[11] = 0; // Filter method
  ihdrData[12] = 0; // Interlace method

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const checksum = crc32(typeAndData);
  chunk.writeUInt32BE(checksum, 8 + len);
  return chunk;
}

// Brand color generator: Dark sleek slate background (#0f172a / #1e293b) with blue-indigo emblem in center
function rendeIconColor(x, y, w, h) {
  const nx = (x / w) * 2 - 1;
  const ny = (y / h) * 2 - 1;
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Rounded squircle background
  const p = 4; // squircle power
  const squircleDist = Math.pow(Math.abs(nx), p) + Math.pow(Math.abs(ny), p);

  // Background gradient: #0f172a to #1e293b
  const bgGrad = 0.5 + (nx * 0.3 + ny * 0.3);
  let r = Math.round(15 + bgGrad * 15);
  let g = Math.round(23 + bgGrad * 18);
  let b = Math.round(42 + bgGrad * 20);

  // Inner card squircle
  const innerSquircle = Math.pow(Math.abs(nx / 0.75), 4) + Math.pow(Math.abs(ny / 0.75), 4);
  if (innerSquircle < 1.0) {
    // Inner badge
    r = Math.round(30 + (1 - innerSquircle) * 20);
    g = Math.round(41 + (1 - innerSquircle) * 35);
    b = Math.round(70 + (1 - innerSquircle) * 60);

    // Center gear/circle
    const cDist = Math.sqrt(Math.pow(nx, 2) + Math.pow(ny + 0.15, 2));
    if (cDist < 0.28 && cDist > 0.16) {
      // Blue gear ring
      r = 59; g = 130; b = 246;
    } else if (cDist <= 0.16) {
      // Center indigo core
      r = 99; g = 102; b = 241;
    }

    // Industrial roof silhouette (ny between 0.05 and 0.45, nx between -0.45 and 0.45)
    if (ny > 0.15 && ny < 0.48 && Math.abs(nx) < 0.45) {
      // Factory bars
      r = 96; g = 165; b = 250;
    }

    // Base stripe
    if (ny >= 0.48 && ny <= 0.54 && Math.abs(nx) < 0.48) {
      r = 147; g = 197; b = 253;
    }
  }

  // Outer border glow
  if (squircleDist >= 0.85 && squircleDist <= 1.0) {
    r = Math.round(r * 1.3);
    g = Math.round(g * 1.3);
    b = Math.round(b * 1.4);
  }

  return [r, g, b, 255];
}

const sizes = [
  { file: './public/pwa-192x192.png', size: 192 },
  { file: './public/pwa-512x512.png', size: 512 },
  { file: './public/pwa-maskable-512x512.png', size: 512 },
  { file: './public/apple-touch-icon.png', size: 180 },
  { file: './public/favicon.ico', size: 64 },
];

sizes.forEach(({ file, size }) => {
  const buf = createPNG(size, size, rendeIconColor);
  fs.writeFileSync(file, buf);
  console.log(`Generated ${file} (${size}x${size})`);
});
