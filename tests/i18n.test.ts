import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const en = JSON.parse(readFileSync(join(ROOT, "src/i18n/locales/en.json"), "utf8")) as Json;
const zh = JSON.parse(readFileSync(join(ROOT, "src/i18n/locales/zh.json"), "utf8")) as Json;

function flatten(node: Json, prefix = "", out = new Map<string, string>()): Map<string, string> {
 if (typeof node === "string") {
 out.set(prefix, node);
 } else if (node && typeof node === "object" && !Array.isArray(node)) {
 for (const [key, value] of Object.entries(node)) {
 flatten(value, prefix ? `${prefix}.${key}` : key, out);
 }
 }
 return out;
}

const enKeys = flatten(en);
const zhKeys = flatten(zh);

test("both locales expose exactly the same keys", () => {
 assert.deepEqual([...enKeys.keys()].sort(), [...zhKeys.keys()].sort());
});

test("no translation is empty", () => {
 for (const [key, value] of [...enKeys, ...zhKeys]) {
 assert.ok(value.trim().length >0, `empty translation: ${key}`);
 }
});

test("interpolation placeholders match between locales", () => {
 const placeholders = (value: string) =>
 [...value.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((match) => match[1]).sort();

 for (const [key, value] of enKeys) {
 assert.deepEqual(placeholders(value), placeholders(zhKeys.get(key) ?? ""), key);
 }
});

function walk(directory: string): string[] {
 return readdirSync(directory).flatMap((entry) => {
 const full = join(directory, entry);
 return statSync(full).isDirectory() ? walk(full) : [full];
 });
}

test("every literal t() key used in source exists in both locales", () => {
 const sources = walk(join(ROOT, "src")).filter((file) => /\.(ts|tsx)$/.test(file));
 const pattern = /\bt\(\s*"([A-Za-z0-9_.]+)"\s*[,)]/g;
 const missing: string[] = [];

 for (const file of sources) {
 const source = readFileSync(file, "utf8");
 for (const match of source.matchAll(pattern)) {
 const key = match[1];
 if (!enKeys.has(key) || !zhKeys.has(key)) {
 missing.push(`${file.replace(ROOT, "")}: ${key}`);
 }
 }
 }

 assert.deepEqual(missing, []);
});
