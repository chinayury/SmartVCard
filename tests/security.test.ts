import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Static isolation guards — borrowed from overtonlabs/qr-business-card's
 * security suite. This app handles other people's contact details entirely
 * in the browser, so the shipped bundle must stay provably self-contained:
 * no third-party origins, no inline scripts, no console noise, and a CSP that
 * actually restricts what it claims to.
 *
 * The dist guards run against the real build output; CI builds before the
 * test job (see .github/workflows/actions.yml) so the artifacts exist. A local
 * run without a build skips them with a notice instead of failing.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const hasDist = existsSync(join(DIST, "index.html"));

function walk(directory: string): string[] {
 if (!existsSync(directory)) return [];
 return readdirSync(directory).flatMap((entry) => {
 const full = join(directory, entry);
 return statSync(full).isDirectory() ? walk(full) : [full];
 });
}

const distFiles = walk(DIST).filter((file) => /\.(html|js|css|webmanifest|txt)$/.test(file));

// ① No third-party origins anywhere in the shipped bundle.
const EXTERNAL_RESOURCE = [
 /(?:src|href)\s*=\s*["']https?:\/\//i,
 /@import\s+(?:url\s*\(\s*)?["']?https?:\/\//i,
 /url\(\s*["']?https?:\/\//i,
 /fetch\(\s*["']https?:\/\//i,
 /import\(\s*["']https?:\/\//i,
];

test(
 "no shipped file references a third-party origin",
 { skip: !hasDist && "run `npm run build` first — the guard needs dist/" },
 () => {
 const offenders: string[] = [];
 for (const file of distFiles) {
 const text = readFileSync(file, "utf8");
 for (const pattern of EXTERNAL_RESOURCE) {
 if (pattern.test(text)) offenders.push(`${file.replace(ROOT, "")}: ${pattern}`);
 }
 }
 assert.deepEqual(offenders, []);
 },
);

// ② No inline scripts or inline handlers — this is what lets the CSP forbid
// them in the first place.
test(
 "the built HTML has no inline script and no on* handlers",
 { skip: !hasDist && "run `npm run build` first — the guard needs dist/" },
 () => {
 const html = readFileSync(join(DIST, "index.html"), "utf8");
 const inlineScripts = html.match(/<script(?![^>]*\bsrc=)[^>]*>/gi) ?? [];
 assert.deepEqual(inlineScripts, []);
 const handlers = html.match(/\son[a-z]+\s*=/gi) ?? [];
 assert.deepEqual(handlers, []);
 },
);

// ③ The CSP meta must say what it means.
test(
 "the built HTML carries a restrictive CSP meta",
 { skip: !hasDist && "run `npm run build` first — the guard needs dist/" },
 () => {
 const html = readFileSync(join(DIST, "index.html"), "utf8");
 const meta = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html);
 assert.ok(meta, "CSP meta tag missing from the built HTML");
 // Vite escapes quotes inside HTML attributes; decode before asserting.
 const policy = meta[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"');

 const directive = (name: string): string | undefined =>
 policy.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name} `));

 assert.equal(directive("default-src"), "default-src 'self'");
 // The one place unsafe-inline is tolerated (Tailwind's runtime styles and
 // inline style attributes) — script-src must never carry it.
 assert.equal(directive("script-src"), "script-src 'self'");
 assert.equal(directive("style-src"), "style-src 'self' 'unsafe-inline'");
 assert.equal(directive("object-src"), "object-src 'none'");
 assert.equal(directive("frame-src"), "frame-src 'none'");
 assert.equal(directive("base-uri"), "base-uri 'self'");
 assert.equal(directive("form-action"), "form-action 'self'");
 assert.ok(!policy.includes("unsafe-eval"));
 },
);

// ④ No console noise in the source — logs are a privacy and noise liability.
test("src/ contains no console calls", () => {
 const offenders: string[] = [];
 for (const file of walk(join(ROOT, "src")).filter((file) => /\.(ts|tsx)$/.test(file))) {
 const text = readFileSync(file, "utf8");
 if (/console\.(log|info|debug|warn|error|trace)\s*\(/.test(text)) {
 offenders.push(file.replace(ROOT, ""));
 }
 }
 assert.deepEqual(offenders, []);
});

// ⑤ No dynamic code evaluation in the shipped bundle.
test(
 "the shipped bundle contains no eval or new Function",
 { skip: !hasDist && "run `npm run build` first — the guard needs dist/" },
 () => {
 const offenders: string[] = [];
 for (const file of distFiles.filter((file) => file.endsWith(".js"))) {
 const text = readFileSync(file, "utf8");
 if (/\beval\s*\(/.test(text) || /new\s+Function\s*\(/.test(text)) {
 offenders.push(file.replace(ROOT, ""));
 }
 }
 assert.deepEqual(offenders, []);
 },
);
