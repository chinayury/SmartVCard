/** Shared, framework-free text helpers used by the card, the vCard writer and exports. */
import type { Address, VCardData } from "./vcardTypes";

const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

export function hasCJK(value: string | undefined): boolean {
 return Boolean(value && CJK_RE.test(value));
}

export function isChineseLocale(language: string | undefined): boolean {
 return Boolean(language && language.toLowerCase().startsWith("zh"));
}

/**
 * Display name. The order follows the name itself: Chinese names read
 * family-name first with no inner space, Western names read given-name first.
 * Kept in one place so the card preview, the vCard FN line and the share page
 * can never disagree.
 */
export function formatFullName(data: VCardData): string {
 const chinese = hasCJK(data.lastName) || hasCJK(data.firstName);
 const parts = chinese
 ? [data.lastName, data.firstName, data.middleName, data.nameSuffix]
 : [data.namePrefix, data.firstName, data.middleName, data.lastName, data.nameSuffix];
 return parts.filter(Boolean).join(chinese ? "" : " ").trim();
}

export function formatAddressLine(address: Address | undefined, chinese: boolean): string {
 if (!address) return "";
 const locality = [address.city, address.stateProvince, address.postalCode]
 .filter(Boolean)
 .join(chinese ? "" : ", ");
 return [address.street, locality, address.countryRegion].filter(Boolean).join(chinese ? " " : " · ");
}

/** Brand text shown top-left when no logo image exists. */
export function brandLabel(data: VCardData): string {
 const short = data.companyShortName?.trim();
 if (short) return short;
 const org = data.organization?.trim();
 if (!org) return "";
 return Array.from(org).slice(0,2).join("");
}

/** One or two glyphs used inside the monogram seal. */
export function monogram(data: VCardData): string {
 const source = formatFullName(data);
 const graphemes = Array.from(source).filter((c) => c.trim() !== "");
 if (!graphemes.length) return "SV";
 return graphemes.slice(0, 2).join("").toUpperCase();
}

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * Make a user-supplied string safe for a browser download filename.
 * Strips path separators, control characters and Windows-reserved names.
 */
export function sanitizeFilename(input: string, fallback = "smart-vcard"): string {
 const cleaned = input
 .normalize("NFKC")
 // eslint-disable-next-line no-control-regex
 .replace(/[\u0000-\u001f\u007f]/g, "")
 .replace(/[<>:"/\\|?*]+/g, "-")
 .replace(/\s+/g, "-")
 .replace(/\.{2,}/g, "-")
 .replace(/-{2,}/g, "-")
 .replace(/^[.-]+|[.-]+$/g, "")
 .slice(0,60)
 .replace(/[.-]+$/g, "");

 if (!cleaned || cleaned === "." || cleaned === ".." || WINDOWS_RESERVED.test(cleaned)) {
 return fallback;
 }
 return cleaned;
}

/**
 * Remove invisible control characters from user input before it is stored.
 * Tab is stripped too: it carries no meaning in contact data and can confuse
 * line folding and third-party parsers. Newlines survive (NOTE values use them).
 */
export function stripControlChars(value: string): string {
 // eslint-disable-next-line no-control-regex
 return value.replace(/[\u0000-\u0008\u0009\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

/** Convert `1996-04-15` or `19960415` into the value a <input type="date"> accepts. */
export function toDateInputValue(raw: string | undefined): string {
 if (!raw) return "";
 const compact = raw.trim().replace(/[^\d]/g, "");
 if (compact.length !==8) return "";
 const year = Number(compact.slice(0,4));
 const month = Number(compact.slice(4,6));
 const day = Number(compact.slice(6,8));
 if (year <1900 || year >2200 || month <1 || month >12 || day <1 || day >31) return "";
 return `${compact.slice(0,4)}-${compact.slice(4,6)}-${compact.slice(6,8)}`;
}

export function truncateMiddle(value: string, max: number): string {
 if (value.length <= max) return value;
 const head = Math.ceil((max -1) /2);
 const tail = Math.floor((max -1) /2);
 return `${value.slice(0, head)}…${value.slice(value.length - tail)}`;
}
