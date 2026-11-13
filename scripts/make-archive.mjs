import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { deflateRawSync } from "node:zlib";

/**
 * Dependency-free ZIP writer for release packaging.
 *
 * Windows' bsdtar writes non-ASCII entry names in the local ANSI codepage
 * without setting general-purpose bit11, which turns Chinese document names
 * into mojibake on extraction. This writer always stores names as UTF-8 and
 * sets bit11, so the archive behaves the same on every platform.
 *
 * Usage: npm run archive
 */

const ROOT = process.cwd();
const INCLUDE = [
 "src",
 "public",
 "scripts",
 "tests",
 "docs",
 ".env.example",
 "CHANGELOG.md",
 "README.md",
 "eslint.config.js",
 "index.html",
 "package.json",
 "package-lock.json",
 "tsconfig.json",
 "tsconfig.app.json",
 "tsconfig.node.json",
 "vite.config.ts",
];

const EXCLUDE = [/node_modules/, /(^|\/)\.git(\/|$)/, /\.log$/, /\.zip$/, /\.tmp$/];

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

function dosDateTime(date) {
 const year = Math.max(1980, date.getFullYear());
 const time =
 ((date.getHours() &0x1f) <<11) |
 ((date.getMinutes() &0x3f) <<5) |
 ((Math.floor(date.getSeconds() /2)) &0x1f);
 const day =
 (((year -1980) &0x7f) <<9) |
 (((date.getMonth() +1) &0x0f) <<5) |
 (date.getDate() &0x1f);
 return { time, day };
}

function walk(entryPath) {
 const absolute = join(ROOT, entryPath);
 const rel = relative(ROOT, absolute).split(sep).join("/");
 if (EXCLUDE.some((pattern) => pattern.test(rel))) return [];

 let info;
 try {
 info = statSync(absolute);
 } catch {
 return [];
 }
 if (info.isDirectory()) {
 return readdirSync(absolute).flatMap((child) => walk(join(entryPath, child)));
 }
 return info.isFile() ? [{ absolute, name: rel, mtime: info.mtime }] : [];
}

const files = INCLUDE.flatMap(walk).sort((a, b) => a.name.localeCompare(b.name));
if (!files.length) {
 console.error("No files matched; run from the project root.");
 process.exit(1);
}

const localParts = [];
const centralParts = [];
let offset =0;

for (const file of files) {
 const raw = readFileSync(file.absolute);
 const compressed = deflateRawSync(raw, { level:9 });
 const name = Buffer.from(file.name, "utf8");
 const crc = crc32(raw);
 const { time, day } = dosDateTime(file.mtime);

 const local = Buffer.alloc(30);
 local.writeUInt32LE(0x04034b50,0);
 local.writeUInt16LE(20,4); // version needed
 local.writeUInt16LE(0x0800,6); // UTF-8 name flag (bit11)
 local.writeUInt16LE(8,8); // deflate
 local.writeUInt16LE(time,10);
 local.writeUInt16LE(day,12);
 local.writeUInt32LE(crc,14);
 local.writeUInt32LE(compressed.length,18);
 local.writeUInt32LE(raw.length,22);
 local.writeUInt16LE(name.length,26);
 local.writeUInt16LE(0,28);

 localParts.push(local, name, compressed);

 const central = Buffer.alloc(46);
 central.writeUInt32LE(0x02014b50,0);
 central.writeUInt16LE(20,4); // version made by
 central.writeUInt16LE(20,6); // version needed
 central.writeUInt16LE(0x0800,8); // UTF-8 name flag
 central.writeUInt16LE(8,10);
 central.writeUInt16LE(time,12);
 central.writeUInt16LE(day,14);
 central.writeUInt32LE(crc,16);
 central.writeUInt32LE(compressed.length,20);
 central.writeUInt32LE(raw.length,24);
 central.writeUInt16LE(name.length,28);
 central.writeUInt16LE(0,30);
 central.writeUInt16LE(0,32);
 central.writeUInt16LE(0,34);
 central.writeUInt16LE(0,36);
 central.writeUInt32LE(0,38);
 central.writeUInt32LE(offset,42);

 centralParts.push(central, name);
 offset += local.length + name.length + compressed.length;
}

const centralDirectory = Buffer.concat(centralParts);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50,0);
end.writeUInt16LE(0,4);
end.writeUInt16LE(0,6);
end.writeUInt16LE(files.length,8);
end.writeUInt16LE(files.length,10);
end.writeUInt32LE(centralDirectory.length,12);
end.writeUInt32LE(offset,16);
end.writeUInt16LE(0,20);

const now = new Date();
const stamp = [
 now.getFullYear(),
 String(now.getMonth() +1).padStart(2, "0"),
 String(now.getDate()).padStart(2, "0"),
 "_",
 String(now.getHours()).padStart(2, "0"),
 String(now.getMinutes()).padStart(2, "0"),
 String(now.getSeconds()).padStart(2, "0"),
].join("");

const output = `app_${stamp}.zip`;
writeFileSync(output, Buffer.concat([...localParts, centralDirectory, end]));
console.log(`wrote ${output} (${files.length} files, ${(statSync(output).size /1024).toFixed(0)} KB)`);
