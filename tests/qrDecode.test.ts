import test from "node:test";
import assert from "node:assert/strict";
import jsQR from "jsqr";

import { createVCard, createVCardForQr } from "../src/lib/vcard.ts";
import { buildQrMatrix, renderQrSvg, type QrModuleStyle } from "../src/lib/qr.ts";
import { emptyVCard, toVCardData, type VCardFormValues } from "../src/lib/schema.ts";

/**
 * Pixel-level QR round-trip — borrowed from overtonlabs/qr-business-card,
 * whose e2e suite decodes the rendered canvas with jsQR and asserts the text
 * equals the page's vCard. That project once shipped for two years with a
 * defect where a single accented character produced no QR at all; only a
 * decode-level assertion catches that class of bug.
 *
 * The app emits geometry-only SVG (rects, circles, single-module paths), so
 * this file carries a small deterministic rasteriser for exactly that shape
 * vocabulary — no canvas dependency, same pixels a browser would paint.
 *
 * Known decoder boundary (recorded, not hidden): jsQR running in Node
 * reliably decodes the square and rounded SVG rasterizations, but its
 * block-based binariser cannot read the dots rasterization — verified across
 * raster scales 4–24 px/module, the dots image is structurally correct yet
 * always fails to locate. The dots style is therefore covered at matrix level
 * here, and its browser-canvas validation (270/270 combinations) is recorded
 * in the 2026-11-10 round of docs/BUG修复清单.
 */

const SCALE = 8; // px per module unit — comfortably above the 8px/module floor

interface Raster {
 data: Uint8Array;
 width: number;
 height: number;
}

function parseAttrs(source: string): Record<string, string> {
 const attrs: Record<string, string> = {};
 for (const match of source.matchAll(/([a-z-]+)="([^"]*)"/g)) {
 attrs[match[1]] = match[2];
 }
 return attrs;
}

function paintRect(
 raster: Raster,
 x: number,
 y: number,
 w: number,
 h: number,
 rgb: [number, number, number],
): void {
 const x0 = Math.max(0, Math.floor(x * SCALE));
 const y0 = Math.max(0, Math.floor(y * SCALE));
 const x1 = Math.min(raster.width, Math.ceil((x + w) * SCALE));
 const y1 = Math.min(raster.height, Math.ceil((y + h) * SCALE));
 for (let py = y0; py < y1; py += 1) {
 for (let px = x0; px < x1; px += 1) {
 const index = (py * raster.width + px) * 4;
 raster.data[index] = rgb[0];
 raster.data[index + 1] = rgb[1];
 raster.data[index + 2] = rgb[2];
 raster.data[index + 3] = 255;
 }
 }
}

function paintDisc(
 raster: Raster,
 cx: number,
 cy: number,
 r: number,
 rgb: [number, number, number],
): void {
 const centerX = (cx + 0.5) * SCALE;
 const centerY = (cy + 0.5) * SCALE;
 const radius = r * SCALE;
 for (let py = 0; py < raster.height; py += 1) {
 for (let px = 0; px < raster.width; px += 1) {
 const dx = px + 0.5 - centerX;
 const dy = py + 0.5 - centerY;
 if (dx * dx + dy * dy > radius * radius) continue;
 const index = (py * raster.width + px) * 4;
 raster.data[index] = rgb[0];
 raster.data[index + 1] = rgb[1];
 raster.data[index + 2] = rgb[2];
 raster.data[index + 3] = 255;
 }
 }
}

function hexToRgb(hex: string): [number, number, number] {
 return [
 parseInt(hex.slice(1, 3), 16),
 parseInt(hex.slice(3, 5), 16),
 parseInt(hex.slice(5, 7), 16),
 ];
}

/** Paint the SVG's geometry in document order onto an RGBA buffer. */
function rasterizeSvg(svg: string): Raster {
 const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1]?.split(" ").map(Number);
 const total = viewBox?.[2] ?? 0;
 const size = Math.round(total * SCALE);
 const raster: Raster = { data: new Uint8Array(size * size * 4), width: size, height: size };
 raster.data.fill(255); // start opaque white

 let groupFill: [number, number, number] = [0, 0, 0];
 const elementPattern = /<(rect|circle|path|g)\b([^>]*?)(\/?)>/g;

 for (const match of svg.matchAll(elementPattern)) {
 const [, tag, attrSource, selfClosed] = match;
 const attrs = parseAttrs(attrSource);
 if (tag === "g") {
 groupFill = attrs.fill ? hexToRgb(attrs.fill) : groupFill;
 continue;
 }
 const fill = attrs.fill ? hexToRgb(attrs.fill) : groupFill;

 if (tag === "rect") {
 paintRect(raster, Number(attrs.x), Number(attrs.y), Number(attrs.width), Number(attrs.height), fill);
 } else if (tag === "circle") {
 paintDisc(raster, Number(attrs.cx), Number(attrs.cy), Number(attrs.r), fill);
 } else if (tag === "path" && selfClosed === "/") {
 // The square style emits one path per module: `M x y h1 v1 h-1 z`.
 for (const move of (attrs.d ?? "").matchAll(/M\s*(-?[\d.]+)[,\s](-?[\d.]+)/g)) {
 paintRect(raster, Number(move[1]), Number(move[2]), 1, 1, fill);
 }
 }
 }

 return raster;
}

function decodeRaster(raster: Raster): string | null {
 const result = jsQR(raster.data, raster.width, raster.height);
 return result?.data ?? null;
}

/** Decode the rendered SVG — the full renderer path, pixels included. */
function decodeQrSvg(text: string, options: { color?: string; style?: QrModuleStyle; margin?: number }): string | null {
 return decodeRaster(rasterizeSvg(renderQrSvg(text, options)));
}

/**
 * Decode the module matrix painted as solid blocks — geometry-independent, so
 * it covers every module style (including dots) for encoding correctness.
 */
function decodeQrMatrix(text: string): string | null {
 const matrix = buildQrMatrix(text);
 const quiet = 4;
 const size = (matrix.size + quiet * 2) * SCALE;
 const raster: Raster = { data: new Uint8Array(size * size * 4), width: size, height: size };
 raster.data.fill(255);
 for (let y = 0; y < matrix.size; y += 1) {
 for (let x = 0; x < matrix.size; x += 1) {
 if (!matrix.isDark(x, y)) continue;
 paintRect(raster, x + quiet, y + quiet, 1, 1, [0, 0, 0]);
 }
 }
 return decodeRaster(raster);
}

const card = (patch: Partial<VCardFormValues>): string =>
 createVCardForQr(toVCardData({ ...emptyVCard, ...patch }));

/** Inputs chosen for the encoding traps that break naive generators. */
const SAMPLES: { name: string; text: string }[] = [
 { name: "ascii vCard", text: "BEGIN:VCARD\nVERSION:3.0\nFN:Jane Doe\nEND:VCARD" },
 {
 name: "CJK card",
 text: card({
 firstName: "志远",
 lastName: "林",
 cellPhone: "+8613800000000",
 email: "zhiyuan@example.com",
 organization: "靛格制签工作室",
 note: "一次填写，当场校样。",
 }),
 },
 { name: "emoji payload", text: "hello 🎉 world — 二维码" },
 { name: "accented latin", text: "FN:Zoë Müller;Straße" },
 { name: "escaped separators", text: "NOTE:a\\;b\\,c\\\\d" },
 {
 name: "long dense note",
 text: card({ firstName: "A", note: "备注内容".repeat(60) }),
 },
];

// Every sample must survive the byte-mode encoder, whatever the module style.
for (const sample of SAMPLES) {
 test(`matrix round-trip — ${sample.name}`, () => {
 assert.equal(decodeQrMatrix(sample.text), sample.text);
 });
}

// The shipped SVG renderer, end to end, for the styles jsQR can read in Node.
for (const style of ["square", "rounded"] as const) {
 for (const sample of SAMPLES) {
 test(`decodes the rendered SVG byte-for-byte — ${sample.name} (${style})`, () => {
 const svg = renderQrSvg(sample.text, { color: "#2b4acb", style, margin: 4 });
 assert.equal(decodeRaster(rasterizeSvg(svg)), sample.text);
 });
 }
}

test("the dots SVG rasterizes correctly (jsQR in Node cannot read it — see header)", () => {
 // Structural guard: the raster is a well-formed image with the expected ink
 // coverage; the dots style's decodability is covered at matrix level above
 // and by the browser-canvas validation recorded in the 2026-11-10 round.
 const svg = renderQrSvg("FN:Jane Doe", { color: "#2b4acb", style: "dots", margin: 4 });
 const raster = rasterizeSvg(svg);
 let dark = 0;
 for (let index = 0; index < raster.data.length; index += 4) {
 if (raster.data[index] < 128) dark += 1;
 }
 const coverage = dark / (raster.width * raster.height);
 assert.ok(coverage > 0.2 && coverage < 0.6, `unexpected ink coverage: ${coverage}`);
});

test("the CRLF .vcf payload also decodes, folded lines and all", () => {
 const vcard = createVCard(
 toVCardData({ ...emptyVCard, firstName: "志远", lastName: "林", note: "长备注".repeat(20) }),
 );
 assert.ok(vcard.includes("\r\n ")); // folding is present in the .vcf form
 assert.equal(decodeQrSvg(vcard, { color: "#16213a", style: "rounded", margin: 4 }), vcard);
});

test("the QR payload is the compact form, and it is what gets encoded", () => {
 const values = { ...emptyVCard, firstName: "志远", lastName: "林", note: "x".repeat(200) };
 const data = toVCardData(values);
 const qrForm = createVCardForQr(data);
 const vcfForm = createVCard(data);
 assert.ok(qrForm.length < vcfForm.length);
 assert.equal(decodeQrMatrix(qrForm), qrForm);
});

test("a junk colour still decodes (falls back to the default ink)", () => {
 const svg = renderQrSvg("FN:Jane", { color: "javascript:alert(1)", style: "rounded", margin: 4 });
 assert.ok(svg.includes('fill="#1b1a17"'));
 assert.equal(decodeRaster(rasterizeSvg(svg)), "FN:Jane");
});
