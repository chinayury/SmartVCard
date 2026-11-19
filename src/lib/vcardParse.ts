import { isHttpUrl } from "./safety";
import { mergeWithDefaults, type VCardFormValues } from "./schema";
import { toDateInputValue } from "./text";
import { unfoldVCard } from "./vcard";

export interface ParsedVCard {
 values: VCardFormValues;
 /** Number of vCard properties that were understood. */
 recognized: number;
}

/**
 * Largest .vcf text the parser accepts, in characters. Exported so the import
 * dialog can report "too large" instead of "no vCard found" when a file is
 * within its byte cap but beyond this one.
 */
export const MAX_IMPORT_CHARS = 65_536;

/**
 * How many cards a .vcf payload contains. Borrowed from kelseykm/vcard4's
 * `numberOfVcards`: a multi-card file must not be imported silently as one
 * card — the importer keeps its "first card wins" behaviour but the caller
 * can now say so.
 */
export function countVCards(text: string): number {
 return (text.match(/BEGIN:VCARD/gi) ?? []).length;
}

/** Split on unescaped `;` (vCard separates structured components with it). */
function splitUnescaped(value: string, separator: string): string[] {
 const parts: string[] = [];
 let current = "";
 for (let index = 0; index < value.length; index += 1) {
 const char = value[index];
 if (char === "\\" && index + 1 < value.length) {
 current += char + value[index + 1];
 index += 1;
 continue;
 }
 if (char === separator) {
 parts.push(current);
 current = "";
 continue;
 }
 current += char;
 }
 parts.push(current);
 return parts;
}

/**
 * Split a property's left side on `;`, but keep double-quoted runs intact.
 * Borrowed from kelseykm/vcard4's tokenizer: `TYPE="CELL;VOICE"` is one
 * parameter, not two — a naive split would cut the quoted value apart.
 */
function splitParams(value: string): string[] {
 const parts: string[] = [];
 let current = "";
 let inQuotes = false;
 for (let index = 0; index < value.length; index += 1) {
 const char = value[index];
 if (char === '"' && value[index - 1] !== "\\") {
 inQuotes = !inQuotes;
 current += char;
 continue;
 }
 if (char === ";" && !inQuotes) {
 parts.push(current);
 current = "";
 continue;
 }
 current += char;
 }
 parts.push(current);
 return parts;
}

/**
 * RFC 6868 parameter-value escapes: `^n` → LF, `^'` → `"`, `^^` → `^`.
 * vCard 4.0 writers use these inside parameter values.
 */
function unescapeParamValue(value: string): string {
 return value.replace(/\^([n^'])/g, (_match, token: string) =>
 token === "n" ? "\n" : token === "^" ? "^" : '"',
 );
}

/** Decode RFC2426 value escapes. */
function unescapeValue(value: string): string {
 return value.replace(/\\([\\,;nN])/g, (_match, token: string) =>
 token === "n" || token === "N" ? "\n" : token,
 );
}

function parseDate(value: string): string {
 return toDateInputValue(unescapeValue(value));
}

/**
 * Parse a pasted/downloaded .vcf file into form values.
 *
 * Handles vCard3.0 and4.0 input, folded lines, property groups (`item1.TEL`),
 * parameters and escaped separators. Unknown properties are ignored; the
 * result is normalised through the same defaults as a restored draft.
 */
export function parseVCard(text: string): ParsedVCard | null {
 if (!text || text.length > MAX_IMPORT_CHARS) return null;
 if (!/BEGIN:VCARD/i.test(text)) return null;

 const collected: Partial<Record<keyof VCardFormValues, string>> = {};
 let givenName = "";
 let familyName = "";
 let middleName = "";
 let prefix = "";
 let suffix = "";
 let formattedName = "";
 let recognized =0;

 const take = (key: keyof VCardFormValues, value: string) => {
 const trimmed = value.trim();
 if (!trimmed) return;
 if (!collected[key]) collected[key] = trimmed;
 recognized +=1;
 };

 for (const line of unfoldVCard(text)) {
 if (!line || /^BEGIN:VCARD/i.test(line)) continue;
 if (/^END:VCARD/i.test(line)) break;

 const colon = line.indexOf(":");
 if (colon <=0) continue;

 const left = line.slice(0, colon);
 const rawValue = line.slice(colon +1);

 // Strip an optional group prefix: `item1.TEL;TYPE=CELL` → `TEL;TYPE=CELL`.
 const withoutGroup = left.includes(".") ? left.slice(left.indexOf(".") + 1) : left;
 const [rawName, ...rawParams] = splitParams(withoutGroup);
 const name = rawName.trim().toUpperCase();
 const params = rawParams.map(unescapeParamValue).join(";").toUpperCase();
 const value = unescapeValue(rawValue);

 switch (name) {
 case "N": {
 const parts = splitUnescaped(rawValue, ";").map(unescapeValue);
 familyName = parts[0]?.trim() ?? "";
 givenName = parts[1]?.trim() ?? "";
 middleName = parts[2]?.trim() ?? "";
 prefix = parts[3]?.trim() ?? "";
 suffix = parts[4]?.trim() ?? "";
 recognized +=1;
 break;
 }
 case "FN":
 formattedName = value.trim();
 break;
 case "NICKNAME":
 take("nickname", value);
 break;
 case "TITLE":
 take("title", value);
 break;
 case "ORG":
 take("organization", splitUnescaped(rawValue, ";")[0] ?? value);
 break;
    case "TEL": {
      // CELL (or a plain/ HOME number) is the personal slot; WORK is the work
      // slot. A lone `TYPE=VOICE` says nothing about which line it is, so it
      // must not silently become the work phone — it used to.
      const phone = value.trim();
      if (params.includes("WORK") && !params.includes("CELL")) take("workPhone", phone);
      else take("cellPhone", phone);
      break;
    }
 case "EMAIL":
 if (params.includes("WORK")) take("workEmail", value);
 else take("email", value);
 break;
 case "URL":
 if (params.includes("WORK")) take("workUrl", value);
 else take("url", value);
 break;
 case "ADR": {
 const parts = splitUnescaped(rawValue, ";").map(unescapeValue);
 take("workStreet", parts[2] ?? "");
 take("workCity", parts[3] ?? "");
 take("workState", parts[4] ?? "");
 take("workPostal", parts[5] ?? "");
 take("workCountry", parts[6] ?? "");
 break;
 }
 case "BDAY":
 case "ANNIVERSARY": {
 const date = parseDate(rawValue);
 if (date) {
 collected.birthday = date;
 recognized +=1;
 }
 break;
 }
 case "NOTE":
 take("note", value);
 break;
    case "PHOTO": {
      // Only a remote image can be carried over: a base64 photo would be
      // hundreds of kilobytes and does not belong in the URL-shaped fields.
      if (isHttpUrl(value) && !collected.photo) {
        collected.photo = value;
        recognized += 1;
      }
      break;
    }
    case "LOGO": {
      // LOGO maps to the logo field, not the photo field, so a card exported
      // by this app round-trips into the same slot it came from.
      if (isHttpUrl(value) && !collected.logoUrl) {
        collected.logoUrl = value;
        recognized += 1;
      }
      break;
    }
    case "X-SOCIALPROFILE": {
      const lower = value.toLowerCase();
      if (params.includes("LINKEDIN")) take("linkedIn", value);
      else if (params.includes("TWITTER")) take("twitter", value);
      else if (params.includes("WECHAT")) take("wechat", value);
      else if (lower.includes("linkedin.com")) take("linkedIn", value);
      else if (lower.includes("twitter.com") || lower.includes("x.com")) take("twitter", value);
      break;
    }
    // Card-only presentation fields written by this app. See the writer for
    // why they are `X-` properties rather than standard vCard ones.
    case "X-SMARTVCARD-SHORTNAME":
      take("companyShortName", value);
      break;
    case "X-SMARTVCARD-SLOGAN":
      take("slogan", value);
      break;
    case "X-SMARTVCARD-PGP":
      take("pgpPublicKey", value);
      break;
 case "X-WECHAT":
 take("wechat", value);
 break;
 default:
 break;
 }
 }

 if (givenName) collected.firstName = givenName;
 if (familyName) collected.lastName = familyName;
 if (middleName) collected.middleName = middleName;
 if (prefix) collected.namePrefix = prefix;
 if (suffix) collected.nameSuffix = suffix;

 // Some exporters only write FN. Keep the form usable by treating it as the
 // given name when no structured name was present.
 if (!collected.firstName && formattedName) collected.firstName = formattedName;

 if (recognized ===0 && !formattedName) return null;

 return { values: mergeWithDefaults(collected), recognized };
}
