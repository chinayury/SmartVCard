import type { Address, VCardData } from "./vcardTypes";

export type { Address, Photo, SocialUrls, VCardData } from "./vcardTypes";

/**
 * vCard3.0 writer.
 *
 * Why a hand-written serialiser instead of a library:
 * - vCard libraries add `;CHARSET=UTF-8` and unusual TYPE combinations that
 * some scanners reject. A minimal, conventional property order parses
 * everywhere.
 * - Chinese names must render family-name first with no inner space — the
 * library formatters get this wrong.
 *
 * Interoperability rules implemented here:
 * - CRLF line endings, one final CRLF (RFC2426 §2.1).
 * - Every logical line folded at75 octets, continuation prefixed by a space
 * (§2.6). Folding counts UTF-8 bytes, never characters.
 * - `\` `;` `,` and newlines escaped inside values (§2.4.2), which also makes
 * vCard injection impossible: a pasted "END:VCARD" cannot start a new line.
 * - BDAY uses the complete ISO8601 date required by vCard3.0.
 * - Phone numbers keep a leading `+` so international dialling still works.
 */
export function createVCard(data: VCardData): string {
 return foldAll(buildVCardLines(data)).join("\r\n") + "\r\n";
}

/**
 * The same card as `createVCard`, but shaped for a QR payload: lines joined
 * with LF and left unfolded.
 *
 * Borrowed from overtonlabs/qr-business-card and swiish (both deliberate,
 * tested deviations): folding inserts CRLF + a space (+3 octets) at every
 * break, and a long card accumulates enough of them to push the symbol up a
 * QR version — 20–60% more modules for the same data. Every mainstream phone
 * importer accepts LF, so the QR carries the compact form while the .vcf
 * download keeps the conservative CRLF + 75-octet folding.
 */
export function createVCardForQr(data: VCardData): string {
 return buildVCardLines(data).join("\n");
}

function foldAll(lines: string[]): string[] {
 return lines.flatMap((line) => foldLine(line).split("\r\n"));
}

function buildVCardLines(data: VCardData): string[] {
 const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];

 // N: family;given;middle;prefix;suffix — always five components.
 lines.push(
 `N:${[data.lastName, data.firstName, data.middleName, data.namePrefix, data.nameSuffix]
 .map((part) => esc(part))
 .join(";")}`,
 );

 const fn = buildFormattedName(data);
 if (fn) lines.push(`FN:${fn}`);

 if (data.nickname) lines.push(`NICKNAME:${esc(data.nickname)}`);
 if (data.title) lines.push(`TITLE:${esc(data.title)}`);
 if (data.organization) lines.push(`ORG:${esc(data.organization)}`);

 // TYPE parameters are not decoration: without them a re-import cannot tell
 // which number is the mobile and which is the landline, and the second value
 // of each pair is silently dropped. They also make the card render correctly
 // in contacts apps that label rows by type.
 if (data.cellPhone) lines.push(`TEL;TYPE=CELL:${esc(cleanPhone(data.cellPhone))}`);
 if (data.workPhone) lines.push(`TEL;TYPE=WORK:${esc(cleanPhone(data.workPhone))}`);

 if (data.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(compact(data.email))}`);
 if (data.workEmail) lines.push(`EMAIL;TYPE=WORK:${esc(compact(data.workEmail))}`);

 if (data.url) lines.push(`URL:${esc(compact(data.url))}`);
 if (data.workUrl) lines.push(`URL;TYPE=WORK:${esc(compact(data.workUrl))}`);

 // A partial address imports as a broken address, not as no address: a
 // `ADR:;;;;;;USA` line lands in contacts apps as a junk row. Require street
 // and city together; country/state/postal may still be absent.
 if (data.workAddress && data.workAddress.street && data.workAddress.city) {
 lines.push(formatAddress(data.workAddress));
 }

 if (data.birthday) {
 const birthday = normalizeDate(data.birthday);
 if (birthday) lines.push(`BDAY:${birthday}`);
 }

 if (data.note) lines.push(`NOTE:${esc(data.note)}`);

 // Card-only presentation fields. vCard 3.0 has no property for a brand
 // shorthand or a slogan, and they matter only to this app's own preview, so
 // they travel as `X-` experimental properties: contacts apps ignore them,
 // but re-importing into this app restores the card exactly as it looked.
 if (data.companyShortName) {
 lines.push(`X-SMARTVCARD-SHORTNAME:${esc(data.companyShortName)}`);
 }
 if (data.slogan) lines.push(`X-SMARTVCARD-SLOGAN:${esc(data.slogan)}`);
 // ASCII-armoured OpenPGP public key: an X- property keeps the plain-text
 // armour intact (a standard KEY: property would demand base64 re-encoding),
 // and unknown X- properties are ignored by other contacts apps.
 if (data.pgpPublicKey) lines.push(`X-SMARTVCARD-PGP:${esc(data.pgpPublicKey)}`);

 const social = data.socialUrls ?? {};
 for (const [key, value] of Object.entries(social)) {
 if (value) lines.push(`X-SOCIALPROFILE;TYPE=${key.toLowerCase()}:${esc(value)}`);
 }

 // Only remote images are exported: embedding a base64 photo would make the
 // vCard (and any QR that carries it) explode in size.
 const photoUrl = data.photo?.url;
 if (photoUrl && isHttpUrl(photoUrl)) lines.push(`PHOTO;VALUE=URI:${esc(photoUrl)}`);
 if (data.logoUrl && isHttpUrl(data.logoUrl)) lines.push(`LOGO;VALUE=URI:${esc(data.logoUrl)}`);

 lines.push("END:VCARD");

 return lines;
}

export const VCARD_LINE_OCTET_LIMIT =75;

/** Fold one logical line at75 UTF-8 octets (RFC2426 §2.6). */
export function foldLine(line: string): string {
 const encoder = new TextEncoder();
 if (encoder.encode(line).byteLength <= VCARD_LINE_OCTET_LIMIT) return line;

 const chunks: string[] = [];
 let current = "";
 let octets =0;

 for (const char of line) {
 const size = encoder.encode(char).byteLength;
 // A continuation line starts with a space, which counts toward the limit.
 if (octets + size > VCARD_LINE_OCTET_LIMIT) {
 chunks.push(current);
 current = " ";
 octets =1;
 }
 current += char;
 octets += size;
 }
 chunks.push(current);
 return chunks.join("\r\n");
}

/** Undo RFC2426 line folding. Used by the importer and by tests. */
export function unfoldVCard(text: string): string[] {
 const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
 const logical: string[] = [];
 for (const line of normalized.split("\n")) {
 if ((line.startsWith(" ") || line.startsWith("\t")) && logical.length) {
 logical[logical.length -1] += line.slice(1);
 } else {
 logical.push(line);
 }
 }
 return logical;
}

// ─── helpers ─────────────────────────────────────────────────────────────

function compact(value: string | undefined | null): string {
 if (!value) return "";
 return String(value).replace(/[\s\u00a0\u2000-\u200b\u3000]+/g, "");
}

/**
 * Normalise a phone number: remove separators but preserve a leading `+`.
 * `+86138-0000-0000` → `+8613800000000`.
 */
export function cleanPhone(value: string | undefined | null): string {
 if (!value) return "";
 const trimmed = String(value).trim();
 const hasPlus = trimmed.startsWith("+");
 const digits = trimmed.replace(/[^\d]/g, "");
 return hasPlus ? `+${digits}` : digits;
}

/** Escape vCard reserved characters: comma, semicolon, backslash, newline. */
export function esc(value: string | undefined | null): string {
 if (!value) return "";
 return String(value)
 // eslint-disable-next-line no-control-regex
 .replace(/[\u0000-\u0008\u0009\u000b\u000c\u000e-\u001f\u007f]/g, "")
 .replace(/\\/g, "\\\\")
 .replace(/\r\n|\r|\n/g, "\\n")
 .replace(/,/g, "\\,")
 .replace(/;/g, "\\;");
}

/**
 * Full display name. CJK → family-name first with no separator;
 * Latin → given-name first, space separated.
 */
function buildFormattedName(d: VCardData): string {
 const chinese = hasCJK(d.lastName) || hasCJK(d.firstName);
 const order = chinese
 ? [d.lastName, d.firstName, d.middleName, d.nameSuffix]
 : [d.namePrefix, d.firstName, d.middleName, d.lastName, d.nameSuffix];
 return order
 .filter((part): part is string => Boolean(part && part.trim()))
 .map((part) => esc(part.trim()))
 .join(chinese ? "" : " ");
}

function hasCJK(value: string | undefined): boolean {
 return Boolean(value && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(value));
}

function isHttpUrl(value: string): boolean {
 return /^https?:\/\/[^\s]+$/i.test(value);
}

function formatAddress(address: Address): string {
 // ADR: po-box;extended;street;city;region;postal;country
 const parts = [
 "",
 "",
 esc(address.street),
 esc(address.city),
 esc(address.stateProvince),
 esc(address.postalCode),
 esc(address.countryRegion),
 ];
 // TYPE=WORK mirrors the TEL/EMAIL/URL pairs: contacts apps label the row,
 // and a re-import can tell this address from a home one.
 return `ADR;TYPE=WORK:${parts.join(";")}`;
}

/** ISO8601 complete date, e.g. `1996-04-15`. */
function normalizeDate(input: string): string | null {
 const compact = input.trim().replace(/[^\d]/g, "");
 if (compact.length !==8) return null;
 const iso = `${compact.slice(0,4)}-${compact.slice(4,6)}-${compact.slice(6,8)}`;
 const parsed = new Date(`${iso}T00:00:00Z`);
 if (Number.isNaN(parsed.getTime())) return null;
 if (parsed.toISOString().slice(0,10) !== iso) return null; // rejects2024-02-31
 return iso;
}
