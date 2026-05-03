/**
 * Generates public/favicon.ico (16×16, BGRA) — тот же знак, что favicon.svg (рост + фокус).
 */
const fs = require("fs");
const path = require("path");

const W = 16;
const H = 16;

function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby || 1;
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * abx;
  const qy = ay + t * aby;
  return Math.hypot(px - qx, py - qy);
}

function inRoundRect(x, y, rw, rh, r) {
  if (x < 0 || y < 0 || x >= rw || y >= rh) return false;
  const rr = Math.min(r, rw / 2, rh / 2);
  const ix = x < rr ? rr - x : x >= rw - rr ? x - (rw - rr - 1) : 0;
  const iy = y < rr ? rr - y : y >= rh - rr ? y - (rh - rr - 1) : 0;
  if (ix > 0 && iy > 0) return ix * ix + iy * iy <= rr * rr;
  return true;
}

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

const curve = [
  [4.5, 12.5],
  [7.2, 7.0],
  [10.5, 5.2],
  [13.2, 12.8],
];
const cx = 8;
const cy = 5.2;

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (!inRoundRect(x, y, W, H, 3.5)) {
      setPixel(x, y, 0, 0, 0, 0);
      continue;
    }
    const gx = x / (W - 1);
    const gy = y / (H - 1);
    const br = Math.round(6 + gx * 45 + (1 - gy) * 35);
    const bg = Math.round(95 + gx * 80 + gy * 40);
    const bb = Math.round(70 + gx * 50 + gy * 55);

    let r = br;
    let g = bg;
    let b = bb;
    let a = 255;

    let dCurve = 99;
    for (let i = 0; i < curve.length - 1; i++) {
      const d = distToSegment(x + 0.5, y + 0.5, curve[i][0], curve[i][1], curve[i + 1][0], curve[i + 1][1]);
      if (d < dCurve) dCurve = d;
    }
    if (dCurve < 1.35) {
      r = 236;
      g = 253;
      b = 245;
      a = 245;
    }

    const dDot = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (dDot < 2.1) {
      r = 254;
      g = 243;
      b = 199;
      a = 255;
      if (dDot > 1.55) {
        r = 6;
        g = 95;
        b = 70;
      }
    }

    setPixel(x, y, r, g, b, a);
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
