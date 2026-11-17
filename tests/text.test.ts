import test from "node:test";
import assert from "node:assert/strict";

import {
 brandLabel,
 contactHref,
 formatAddressLine,
 formatFullName,
 hasCJK,
 maskEmail,
 maskPhone,
 monogram,
 sanitizeFilename,
 stripControlChars,
 toDateInputValue,
 truncateMiddle,
} from "../src/lib/text.ts";

test("detects CJK", () => {
 assert.equal(hasCJK("林"), true);
 assert.equal(hasCJK("Lin"), false);
 assert.equal(hasCJK(undefined), false);
});

test("formats names according to the name, not the UI language", () => {
 assert.equal(formatFullName({ firstName: "志远", lastName: "林" }), "林志远");
 assert.equal(formatFullName({ firstName: "Jane", lastName: "Doe" }), "Jane Doe");
 assert.equal(formatFullName({ firstName: "Jane", lastName: "林" }), "林Jane");
});

test("formats an address in one line", () => {
 const english = ["320 Wukang Road", ["Shanghai", "Shanghai", "200000"].join(", "), "China"].join(" · ");
 assert.equal(
 formatAddressLine(
 { street: "320 Wukang Road", city: "Shanghai", stateProvince: "Shanghai", postalCode: "200000", countryRegion: "China" },
 false,
 ),
 english,
 );
 const chinese = ["武康路320号", ["上海", "上海", "200000"].join(""), "中国"].join("\u0020");
 assert.equal(
 formatAddressLine(
 { street: "武康路320号", city: "上海", stateProvince: "上海", postalCode: "200000", countryRegion: "中国" },
 true,
 ),
 chinese,
 );
});

test("brand label prefers the short name and falls back to two glyphs", () => {
 assert.equal(brandLabel({ companyShortName: " Acme " }), "Acme");
 assert.equal(brandLabel({ organization: "示例科技有限公司" }), "示例");
 assert.equal(brandLabel({}), "");
 assert.equal(monogram({ firstName: "志远", lastName: "林" }), "林志");
 assert.equal(monogram({}), "SV");
});

test("sanitizeFilename removes path separators and reserved names", () => {
 assert.equal(sanitizeFilename("../../etc/passwd"), "etc-passwd");
 assert.equal(sanitizeFilename("林-名片"), "林-名片");
 assert.equal(sanitizeFilename("CON"), "smart-vcard");
 assert.equal(sanitizeFilename(" "), "smart-vcard");
 assert.equal(sanitizeFilename("a".repeat(200)), "a".repeat(60));
 assert.equal(sanitizeFilename("name.vcf"), "name.vcf");
 assert.equal(sanitizeFilename("a/b\\c:d*e?f"), "a-b-c-d-e-f");
});

test("toDateInputValue accepts only real8-digit dates", () => {
 assert.equal(toDateInputValue("19960415"), "1996-04-15");
 assert.equal(toDateInputValue("1996-04-15"), "1996-04-15");
 assert.equal(toDateInputValue("199604"), "");
 assert.equal(toDateInputValue("19961315"), "");
 assert.equal(toDateInputValue(""), "");
});

test("truncateMiddle keeps both ends", () => {
 assert.equal(truncateMiddle("short",10), "short");
 const value = truncateMiddle("a".repeat(50),11);
 assert.ok(value.includes("…"));
 assert.equal(Array.from(value).length,11);
});

test("stripControlChars removes tabs and keeps newlines", () => {
 assert.equal(stripControlChars("a\u0007b\u0009c"), "abc");
 assert.equal(stripControlChars("line1\nline2"), "line1\nline2");
});

test("maskPhone keeps the edges and hides the middle", () => {
 assert.equal(maskPhone("+8613800138000"), "+86*********00");
 assert.equal(maskPhone("123456"), "******");
 assert.equal(maskPhone("123"), "***");
});

test("maskEmail keeps the initial and the domain", () => {
 assert.equal(maskEmail("hello@example.com"), "h****@example.com");
 assert.equal(maskEmail("a@b.co"), "a*@b.co");
 assert.equal(maskEmail("not-an-email"), "********");
});

test("contactHref builds safe action links or returns null", () => {
 assert.equal(contactHref("TEL", "+86 138 0013 8000"), "tel:+8613800138000");
 assert.equal(contactHref("TEL", "ab"), null, "too short to dial");
 assert.equal(contactHref("MAIL", "hello@example.com"), "mailto:hello@example.com");
 assert.equal(contactHref("MAIL", "not-an-email"), null);
 assert.equal(contactHref("WEB", "https://example.com"), "https://example.com");
 assert.equal(contactHref("WEB", "example.com"), null, "scheme-less web rows stay text");
 assert.equal(contactHref("OTHER", "x"), null);
});
