import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

/**
 * Test-only resolver: the app is bundled by Vite, which resolves extensionless
 * imports (`./schema`). Node's ESM loader does not, so tests register this hook
 * to try the TypeScript/JavaScript extensions in order.
 *
 * Node >=22.15 provides synchronous `registerHooks`.
 */
const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs", ".json"];

registerHooks({
 resolve(specifier, context, nextResolve) {
 if (!specifier.startsWith(".") || !context.parentURL) {
 return nextResolve(specifier, context);
 }
 if (/\.[cm]?[jt]sx?$/i.test(specifier) || specifier.endsWith(".json")) {
 return nextResolve(specifier, context);
 }

 const candidates = [
 ...EXTENSIONS.map((extension) => `${specifier}${extension}`),
 ...EXTENSIONS.map((extension) => `${specifier}/index${extension}`),
 ];

 for (const candidate of candidates) {
 try {
 const url = new URL(candidate, context.parentURL);
 if (existsSync(fileURLToPath(url))) {
 return { url: url.href, shortCircuit: true };
 }
 } catch {
 // keep looking
 }
 }

 return nextResolve(specifier, context);
 },
});
