import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

/**
 * Dependency-free PWA icon generator.
 *
 * Produces the raster icons the manifest needs (192/512 + Apple touch icon)
 * from the same geometry as public/favicon.svg. Run with `npm run icons`.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "icons");

const INDIGO = [43, 74, 203];
const PAPER = [255, 255, 255];
const INK = [22, 33, 58];

const CRC_TABLE = (() => {
 const table = new Uint32Array(256);
 for (let n =0; n <256; n +=1) {
 let c = n;
 for (let k =0; k <8; k +=1) c = c &1 ?0xedb88320 ^ (c >>>1) : c >>>1;
 table[n] = c >>>0;
 }
 return table;
})();

function crc32(buffer) {
 let crc =0xffffffff;
 for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) &0xff] ^ (crc >>>8);
 return (crc ^0xffffffff) >>>0;
}

function chunk(type, data) {
 const length = Buffer.alloc(4);
 length.writeUInt32BE(data.length,0);
 const typeBuffer = Buffer.from(type, "ascii");
 const crc = Buffer.alloc(4);
 crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])),0);
 return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
 const signature = Buffer.from([137,80,78,71,13,10,26,10]);
 const ihdr = Buffer.alloc(13);
 ihdr.writeUInt32BE(width,0);
 ihdr.writeUInt32BE(height,4);
 ihdr[8] =8; // bit depth
 ihdr[9] =6; // RGBA
 ihdr[10] =0;
 ihdr[11] =0;
 ihdr[12] =0;

 const stride = width *4;
 const raw = Buffer.alloc((stride +1) * height);
 for (let y =0; y < height; y +=1) {
 raw[y * (stride +1)] =0; // filter: none
 rgba.copy(raw, y * (stride +1) +1, y * stride, (y +1) * stride);
 }

 return Buffer.concat([
 signature,
 chunk("IHDR", ihdr),
 chunk("IDAT", deflateSync(raw, { level:9 })),
 chunk("IEND", Buffer.alloc(0)),
 ]);
}

function insideRoundedRect(x, y, rect) {
 const { left, top, width, height, radius } = rect;
 if (x < left || y < top || x > left + width || y > top + height) return false;
 const rx = Math.min(radius, width /2);
 const ry = Math.min(radius, height /2);
 if (rx <=0 || ry <=0) return true;
 const dx = Math.min(Math.max(x, left + rx), left + width - rx);
 const dy = Math.min(Math.max(y, top + ry), top + height - ry);
 const nx = (x - dx) / rx;
 const ny = (y - dy) / ry;
 return nx * nx + ny * ny <=1;
}

/** Paint the64-unit design into a supersampled RGBA buffer. */
function paint(size, padding) {
 const scale =3;
 const canvas = size * scale;
 const pixels = Buffer.alloc(canvas * canvas *4);
 const art =64 * (1 - padding *2);
 const offset =64 * padding;
 const toArt = (value) => (value - offset) / art; //0..1 in the art box

 const put = (x, y, color, alpha =1) => {
 const index = (y * canvas + x) *4;
 pixels[index] = color[0];
 pixels[index +1] = color[1];
 pixels[index +2] = color[2];
 pixels[index +3] = Math.round(alpha *255);
 };

 for (let y =0; y < canvas; y +=1) {
 for (let x =0; x < canvas; x +=1) {
 // Background is full-bleed indigo (safe for maskable icons).
 let color = INDIGO;
 let alpha = 1;

 const ux = toArt(((x + 0.5) / canvas) * 64);
 const uy = toArt(((y + 0.5) / canvas) * 64);

 if (ux >= 0 && ux <= 1 && uy >= 0 && uy <= 1) {
 const px = ux * 64;
 const py = uy * 64;

 if (insideRoundedRect(px, py, { left: 9, top: 11, width: 46, height: 42, radius: 6 })) {
 color = PAPER;

 // Avatar block
 if (insideRoundedRect(px, py, { left: 15, top: 17, width: 11, height: 11, radius: 2.5 })) {
 color = INDIGO;
 }

 // Two ruled lines
 if (py >=17 && py <=19.2 && px >=30 && px <=49) color = INK;
 if (py >=23 && py <=25.2 && px >=30 && px <=44) color = INK;

 // QR block, bottom right
 const qrX = px -36;
 const qrY = py -33;
 if (qrX >=0 && qrY >=0 && qrX <=18 && qrY <=18) {
 const cell =6;
 const cx = Math.floor(qrX / cell);
 const cy = Math.floor(qrY / cell);
 const on =
 (cx ===0 && cy ===0) ||
 (cx ===2 && cy ===0) ||
 (cx ===0 && cy ===2) ||
 (cx ===1 && cy ===1) ||
 (cx ===2 && cy ===2);
 if (on) color = INK;
 }
 }
 }

 put(x, y, color, alpha);
 }
 }

 // Downsample the supersampled buffer.
 const out = Buffer.alloc(size * size *4);
 for (let y =0; y < size; y +=1) {
 for (let x =0; x < size; x +=1) {
 let r =0;
 let g =0;
 let b =0;
 let a =0;
 for (let sy =0; sy < scale; sy +=1) {
 for (let sx =0; sx < scale; sx +=1) {
 const index = ((y * scale + sy) * canvas + (x * scale + sx)) *4;
 r += pixels[index];
 g += pixels[index +1];
 b += pixels[index +2];
 a += pixels[index +3];
 }
 }
 const count = scale * scale;
 const index = (y * size + x) *4;
 out[index] = Math.round(r / count);
 out[index +1] = Math.round(g / count);
 out[index +2] = Math.round(b / count);
 out[index +3] = Math.round(a / count);
 }
 }
 return out;
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
 { name: "icon-192.png", size:192, padding:0.06 },
 { name: "icon-512.png", size:512, padding:0.06 },
 { name: "icon-maskable-512.png", size:512, padding:0.16 },
 { name: "apple-touch-icon.png", size:180, padding:0.08 },
];

for (const target of targets) {
 const png = encodePng(target.size, target.size, paint(target.size, target.padding));
 writeFileSync(join(OUT_DIR, target.name), png);
 console.log(`wrote public/icons/${target.name} (${target.size}×${target.size})`);
}
