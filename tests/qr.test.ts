import test from "node:test";
import assert from "node:assert/strict";

import {
  QrCapacityError,
  buildQrMatrix,
  countPayloadBytes,
  normalizeQrColor,
  qrTotalModules,
  renderQrSvg,
  resolvePngRasterSize,
  svgToDataUrl,
} from "../src/lib/qr.ts";
import { MAX_QR_PAYLOAD_BYTES, QR_MIN_PIXELS_PER_MODULE } from "../src/lib/constants.ts";

test("renders an SVG with a quiet zone and a white background", () => {
 const svg = renderQrSvg("hello");
 assert.ok(svg.startsWith("<svg "));
 assert.ok(svg.includes('fill="#ffffff"'));
 assert.ok(svg.includes('role="img"'));
 const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1]?.split(" ").map(Number);
 assert.ok(viewBox);
 const total = viewBox[2];
 assert.equal(viewBox[0],0);
 assert.equal(viewBox[1],0);
 assert.equal(viewBox[2], viewBox[3]);
 assert.ok(total >=21 +8);
});

test("supports square, rounded and dot modules", () => {
  const square = renderQrSvg("hello", { style: "square" });
  const rounded = renderQrSvg("hello", { style: "rounded" });
  const dots = renderQrSvg("hello", { style: "dots" });

  assert.ok(square.includes("<path d="));
  assert.ok(square.includes('shape-rendering="crispEdges"'));
  assert.ok(rounded.includes("<rect"));
  assert.ok(!rounded.includes("<circle"));
  assert.ok(dots.includes("<circle"));
});

/**
 * Regression guard for the scannability defect fixed in v0.1.0.
 *
 * The previous geometry drew modules at 0.9x with hard-rounded corners, which
 * removed about a third of the ink and made realistic vCards (57+ modules)
 * undecodable by phone scanners. These assertions pin the ink-preserving
 * geometry so the mistake cannot silently return.
 */
test("module geometry preserves ink coverage so scanners can read the symbol", () => {
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:林;致远;;;",
    "FN:林致远",
    "TITLE:品牌设计师",
    "ORG:纸本工坊",
    "TEL:+8613800000000",
    "EMAIL:zhiyuan@paper-atelier.com",
    "URL:https://paper-atelier.com",
    "END:VCARD",
    "",
  ].join("\r\n");

  // Rounded modules must fill their whole cell (width/height 1) and only round
  // the corners, so neighbouring dark modules stay contiguous.
  const rounded = renderQrSvg(vcard, { style: "rounded" });
  assert.ok(rounded.includes('<rect x="12" y="4" width="1" height="1" rx="0.25"/>'));
  assert.ok(!rounded.includes('width="0.9"'));

  // Dots must overlap neighbours (r > 0.5) instead of floating apart.
  const dots = renderQrSvg(vcard, { style: "dots" });
  assert.ok(dots.includes('r="0.62"'));
  assert.ok(!dots.includes('r="0.44"'));

  // Every style keeps the same quiet zone and a white plate.
  for (const svg of [rounded, dots]) {
    assert.ok(svg.includes('fill="#ffffff"'));
    assert.match(svg, /viewBox="0 0 \d+ \d+"/);
  }
});

test("always draws three finder patterns", () => {
 const svg = renderQrSvg("finder", { style: "rounded" });
 assert.equal(svg.split('width="7" height="7"').length -1,3);
});

test("applies the requested ink colour and rejects junk colours", () => {
 assert.ok(renderQrSvg("x", { color: "#b04a24" }).includes('fill="#b04a24"'));
 assert.ok(renderQrSvg("x", { color: "javascript:alert(1)" }).includes('fill="#1b1a17"'));
 assert.equal(normalizeQrColor("#ABCDEF"), "#abcdef");
 assert.equal(normalizeQrColor("red"), "#1b1a17");
});

test("throws a typed capacity error instead of failing later", () => {
 assert.throws(() => buildQrMatrix("x".repeat(MAX_QR_PAYLOAD_BYTES +1)), QrCapacityError);
 assert.throws(() => renderQrSvg(""), QrCapacityError);
});

test("counts UTF-8 bytes, not characters", () => {
  assert.equal(countPayloadBytes("abc"), 3);
  assert.equal(countPayloadBytes("汉"), 3);
  assert.equal(countPayloadBytes("🚀"), 4);
});

/**
 * Regression guard for the PNG export defect fixed in v0.1.0.
 *
 * The export used to rasterise a 12px-per-module SVG and nearest-neighbour
 * upscale it to the requested size. When the module count does not divide that
 * size evenly, some modules ended up 28px wide and their neighbours 29px, and
 * the symbol stopped decoding. Rasterising at the requested size keeps every
 * module identical.
 */
test("pixelSize sets the raster resolution without changing the module grid", () => {
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:林;致远;;;",
    "FN:林致远",
    "TEL:+8613800000000",
    "END:VCARD",
    "",
  ].join("\r\n");

  const small = renderQrSvg(vcard);
  const large = renderQrSvg(vcard, { pixelSize: 2048 });

  // Same symbol, same module count — only the intrinsic resolution differs.
  const viewBoxOf = (svg: string) => /viewBox="0 0 (\d+) (\d+)"/.exec(svg)?.slice(1).map(Number);
  assert.deepEqual(viewBoxOf(small), viewBoxOf(large));

  assert.ok(small.includes(`width="${viewBoxOf(small)![0] * 12}"`));
  assert.ok(large.includes('width="2048"'));
  assert.ok(large.includes('height="2048"'));
  // The module geometry itself is untouched.
  assert.ok(large.includes('rx="0.25"'));
});

test("data URL wraps the SVG", () => {
  const url = svgToDataUrl(renderQrSvg("hi"));
  assert.ok(url.startsWith("data:image/svg+xml;charset=utf-8,"));
  assert.ok(decodeURIComponent(url.split(",",2)[1] ?? "").includes("<svg "));
});

/**
 * Regression guard for the unscannable-small-export defect fixed in v0.1.0.
 *
 * A dense card (long note, many fields) needs 100+ modules. Exported at 512px
 * that is under 5 pixels per module, below what any phone camera resolves, so
 * the file was produced but never scanned. The export size is now a floor, not
 * a ceiling: it is raised until every module has room.
 */
test("a dense symbol is exported larger so it still scans", () => {
  const dense = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:林;致远;;;",
    "FN:林致远",
    "TITLE:设计总监",
    "ORG:示例科技",
    "TEL:+8613800000000",
    "EMAIL:home@example.com",
    "URL:https://example.com",
    `NOTE:${"备注内容".repeat(120)}`,
    "END:VCARD",
    "",
  ].join("\r\n");

  const modules = qrTotalModules(dense);
  assert.ok(modules > 100, `expected a dense symbol, got ${modules} modules`);

  // 512px is too small for this symbol, so it must be raised.
  const small = resolvePngRasterSize(dense, { style: "rounded" }, 512);
  assert.equal(small.raised, true);
  assert.ok(small.size >= modules * QR_MIN_PIXELS_PER_MODULE);
  assert.equal(small.size / modules >= 6, true, "every module needs >= 6px to scan");

  // 2048px already has room, so it is honoured exactly.
  const large = resolvePngRasterSize(dense, { style: "rounded" }, 2048);
  assert.equal(large.raised, false);
  assert.equal(large.size, 2048);

  // A light card is never enlarged.
  const light = resolvePngRasterSize("hello", { style: "rounded" }, 512);
  assert.equal(light.raised, false);
  assert.equal(light.size, 512);
});

test("error-correction levels trade density for damage tolerance as specified", () => {
  const payload = "MECARD:N:林,志远;TEL:+8613800138000;EMAIL:hello@example.com;;";
  const sizes = (["L", "M", "Q", "H"] as const).map((level) => buildQrMatrix(payload, { style: "square", errorCorrectionLevel: level }).size);
  assert.ok(sizes[0] < sizes[1], "L is sparser than M");
  assert.ok(sizes[1] < sizes[2], "M is sparser than Q");
  assert.ok(sizes[2] <= sizes[3], "H is the densest");
  // The default level stays M, matching every historical symbol.
  assert.equal(buildQrMatrix(payload, { style: "square" }).size, sizes[1]);
});
