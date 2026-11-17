import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_SETTINGS, sanitizeSettings } from "../src/lib/settings.ts";

test("returns defaults for anything that is not an object", () => {
 for (const raw of [null, undefined, "x",42, [], true]) {
 assert.deepEqual(sanitizeSettings(raw), DEFAULT_SETTINGS);
 }
});

test("keeps a fully valid settings object", () => {
 assert.deepEqual(
 sanitizeSettings({ mode: "vcard", payloadFormat: "mecard", ecLevel: "H", color: "#B04A24", style: "dots", size:2048 }),
 { mode: "vcard", payloadFormat: "mecard", ecLevel: "H", color: "#b04a24", style: "dots", size:2048 },
 );
});

test("an old settings object without payloadFormat falls back to vcard", () => {
 const result = sanitizeSettings({ mode: "vcard", color: "#16213a", style: "square", size:512 });
 assert.equal(result.payloadFormat, "vcard");
 assert.equal(result.ecLevel, "M");
});

test("an invalid error-correction level falls back to M", () => {
 assert.equal(sanitizeSettings({ ecLevel: "X" }).ecLevel, "M");
 assert.equal(sanitizeSettings({ ecLevel: 3 }).ecLevel, "M");
 assert.equal(sanitizeSettings({ ecLevel: "Q" }).ecLevel, "Q");
});

test("replaces each invalid field independently", () => {
 const result = sanitizeSettings({
 mode: "print",
 payloadFormat: "json",
 color: "red",
 style: "zigzag",
 size:999,
 });
 assert.deepEqual(result, DEFAULT_SETTINGS);
});

test("rejects colours that are not six-digit hex", () => {
 assert.equal(sanitizeSettings({ color: "#fff" }).color, DEFAULT_SETTINGS.color);
 assert.equal(sanitizeSettings({ color: "#12G456" }).color, DEFAULT_SETTINGS.color);
});
