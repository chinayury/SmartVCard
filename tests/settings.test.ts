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
 sanitizeSettings({ mode: "vcard", color: "#B04A24", style: "dots", size:2048 }),
 { mode: "vcard", color: "#b04a24", style: "dots", size:2048 },
 );
});

test("replaces each invalid field independently", () => {
 const result = sanitizeSettings({
 mode: "print",
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
