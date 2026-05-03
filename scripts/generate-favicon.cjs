/**
 * Generates public/favicon.ico (16×16, BGRA) — dependency-free for static/Apache deploys.
 */
const fs = require("fs");
const path = require("path");

const W = 16;
const H = 16;

const biSize = 40;
const biWidth = W;
const biHeight = H * 2;
const biPlanes = 1;
const biBitCount = 32;
const biCompression = 0;
const biSizeImage = W * H * 4;

const header = Buffer.alloc(biSize);
header.writeUInt32LE(biSize, 0);
header.writeInt32LE(biWidth, 4);
header.writeInt32LE(biHeight, 8);
header.writeUInt16LE(biPlanes, 12);
header.writeUInt16LE(biBitCount, 14);
header.writeUInt32LE(biCompression, 16);
header.writeUInt32LE(biSizeImage, 20);

const xor = Buffer.alloc(W * H * 4);
function setPixel(x, y, r, g, b, a = 255) {
  const row = H - 1 - y;
  const o = (row * W + x) * 4;
  xor[o] = b;
  xor[o + 1] = g;
  xor[o + 2] = r;
  xor[o + 3] = a;
}

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const cx = x - W / 2 + 0.5;
    const cy = y - H / 2 + 0.5;
    const d = Math.sqrt(cx * cx + cy * cy);
    const t = Math.max(0, 1 - d / 6.8);
    if (t <= 0.001) setPixel(x, y, 0, 0, 0, 0);
    else {
      const edge = Math.min(1, t);
      setPixel(x, y, 6 + Math.floor(215 * edge), 35 + Math.floor(170 * edge), 24 + Math.floor(140 * edge), Math.min(255, Math.floor(255 * edge + 8)));
    }
  }
}

const andRowBytes = Math.ceil(W / 32) * 4;
const andMask = Buffer.alloc(andRowBytes * H);
andMask.fill(0);

const imageData = Buffer.concat([header, xor, andMask]);
const imageOffset = 6 + 16;

const iconDir = Buffer.alloc(6);
iconDir.writeUInt16LE(0, 0);
iconDir.writeUInt16LE(1, 2);
iconDir.writeUInt16LE(1, 4);

const entry = Buffer.alloc(16);
entry.writeUInt8(W, 0);
entry.writeUInt8(H, 1);
entry.writeUInt8(0, 2);
entry.writeUInt8(0, 3);
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(imageData.length, 8);
entry.writeUInt32LE(imageOffset, 12);

const ico = Buffer.concat([iconDir, entry, imageData]);
const out = path.join(__dirname, "..", "public", "favicon.ico");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, ico);
console.log("Wrote", out, ico.length, "bytes");
