// Renders the Aurum logo (neon-green rounded square + black hexagon outline) to PNG
// at the sizes Chrome needs. Dependency-free: rasterises with supersampling and
// encodes PNG with node:zlib. Run: node scripts/make-icons.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BG = [0x3c, 0xf2, 0x7a];
// Solid near-black stroke (kept as a gradient table for easy re-theming).
const STOPS = [[0, [0x03, 0x14, 0x0a]], [1, [0x03, 0x14, 0x0a]]];
function ice(t) {
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [a, ca] = STOPS[i];
    const [b, cb] = STOPS[i + 1];
    if (t <= b) return ca.map((c, k) => c + ((cb[k] - c) * (t - a)) / (b - a));
  }
  return STOPS.at(-1)[1];
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

// Geometry in a 32×32 design space (matches public/favicon.svg).
const hex = [[16, 6.5], [24, 11], [24, 21], [16, 25.5], [8, 21], [8, 11]];
const distToSeg = (px, py, [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
const inRoundRect = (x, y, r = 9) => {
  const cx = Math.min(Math.max(x, r), 32 - r);
  const cy = Math.min(Math.max(y, r), 32 - r);
  return Math.hypot(x - cx, y - cy) <= r;
};
const onHex = (x, y) => hex.some((p, i) => distToSeg(x, y, p, hex[(i + 1) % hex.length]) <= 1.3);

function render(size) {
  const ss = 4;
  return png(size, (x, y) => {
    let bg = 0, ink = 0;
    for (let i = 0; i < ss; i++) for (let j = 0; j < ss; j++) {
      const u = ((x + (i + 0.5) / ss) / size) * 32;
      const v = ((y + (j + 0.5) / ss) / size) * 32;
      if (inRoundRect(u, v)) (onHex(u, v) ? ink++ : bg++);
    }
    const n = ss * ss;
    const cover = (bg + ink) / n;
    if (!cover) return [0, 0, 0, 0];
    const stroke = ice((x + y) / (2 * size));
    const mix = (c) => Math.round((BG[c] * bg + stroke[c] * ink) / (bg + ink));
    return [mix(0), mix(1), mix(2), Math.round(cover * 255)];
  });
}

mkdirSync("extension/icons", { recursive: true });
for (const s of [16, 32, 48, 128]) writeFileSync(`extension/icons/icon-${s}.png`, render(s));
console.log("icons written to extension/icons");
