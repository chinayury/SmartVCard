import type { VCardData } from "./vcardTypes";

/**
 * MeCard (DoCoMo) writer — the compact contact format some QR readers prefer
 * (borrowed from rclement/business-card-generator's dual-format idea).
 *
 * Wire format (verified against the DoCoMo field reference):
 *   MECARD:N:family,given;TEL:…;EMAIL:…;URL:…;ADR:,…;;    — the trailing
 *   `;;` terminates the last field and the card.
 *
 * Trade-off stated honestly: MeCard has no ORG/TITLE/company fields, so an
 * organisation cannot be represented — the payload only shrinks when the
 * caller accepts that. Escape rule: literal `,` `;` `\` inside a value are
 * backslash-escaped, and newlines are flattened (MeCard is single-line).
 */

/** Escape the MeCard structural characters and flatten line breaks. */
function escapeValue(value: string): string {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\r?\n/g, " ");
}

/** BDAY wants bare YYYYMMDD; the form stores ISO dates, so strip separators. */
function birthdayDigits(raw: string): string {
	const compact = raw.replace(/[^\d]/g, "");
	if (compact.length !== 8) return "";
	const year = Number(compact.slice(0, 4));
	const month = Number(compact.slice(4, 6));
	const day = Number(compact.slice(6, 8));
	if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return "";
	return compact;
}

/** Compose the compact MeCard payload for the QR symbol. */
export function createMeCard(data: VCardData): string {
	const parts: string[] = [];
	// MeCard is family-first, exactly the order the app already uses for CJK
	// names. The comma between family and given is structural: each half is
	// escaped on its own so literal commas inside a name stay safe.
	parts.push(`N:${escapeValue(data.lastName ?? "")},${escapeValue(data.firstName ?? "")};`);
	if (data.nickname) parts.push(`NICKNAME:${escapeValue(data.nickname)};`);
	for (const phone of [data.cellPhone, data.workPhone]) {
		if (phone) parts.push(`TEL:${escapeValue(phone)};`);
	}
	for (const email of [data.email, data.workEmail]) {
		if (email) parts.push(`EMAIL:${escapeValue(email)};`);
	}
	const url = data.url || data.workUrl;
	if (url) parts.push(`URL:${escapeValue(url)};`);
	// Address rides the vCard-style component order; only a complete address is
	// written, mirroring the vCard writer's discipline against junk ADR lines.
	const address = data.workAddress;
	if (address?.street && address.city) {
		const components = [
			"",
			"",
			address.street,
			address.city,
			address.stateProvince ?? "",
			address.postalCode ?? "",
			address.countryRegion ?? "",
		];
		parts.push(`ADR:${components.map(escapeValue).join(",")};`);
	}
	const birthday = data.birthday ? birthdayDigits(data.birthday) : "";
	if (birthday) parts.push(`BDAY:${birthday};`);
	if (data.note) parts.push(`NOTE:${escapeValue(data.note)};`);
	return `MECARD:${parts.join("")};`;
}
