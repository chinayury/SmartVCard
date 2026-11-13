import test from "node:test";
import assert from "node:assert/strict";

import { parseVCard } from "../src/lib/vcardParse.ts";

const VCARD = [
 "BEGIN:VCARD",
 "VERSION:3.0",
 "N:林;志远;;;",
 "FN:林志远",
 "NICKNAME:ZY",
 "item1.TEL;TYPE=CELL:+8613800000000",
 "item2.TEL;TYPE=WORK:010-6256-2288",
 "EMAIL;TYPE=WORK:work@example.com",
 "EMAIL:home@example.com",
 "ORG:示例科技;设计部",
 "TITLE:设计总监",
 "URL:https://example.com",
 "ADR;TYPE=WORK:;;武康路320号;上海;上海;200000;中国",
 "BDAY:19960415",
 "NOTE:第一行",
 "\u0020续行",
 "X-SOCIALPROFILE;TYPE=linkedin:https://linkedin.com/in/lin",
 "END:VCARD",
].join("\r\n");

test("parses a folded vCard with groups and parameters", () => {
 const parsed = parseVCard(VCARD);
 assert.ok(parsed);
 assert.equal(parsed.values.firstName, "志远");
 assert.equal(parsed.values.lastName, "林");
 assert.equal(parsed.values.nickname, "ZY");
 assert.equal(parsed.values.cellPhone, "+8613800000000");
 assert.equal(parsed.values.workPhone, "010-6256-2288");
 assert.equal(parsed.values.workEmail, "work@example.com");
 assert.equal(parsed.values.email, "home@example.com");
 assert.equal(parsed.values.organization, "示例科技");
 assert.equal(parsed.values.title, "设计总监");
 assert.equal(parsed.values.url, "https://example.com");
 assert.equal(parsed.values.workStreet, "武康路320号");
 assert.equal(parsed.values.workCity, "上海");
 assert.equal(parsed.values.workPostal, "200000");
 assert.equal(parsed.values.workCountry, "中国");
 assert.equal(parsed.values.birthday, "1996-04-15");
 assert.equal(parsed.values.note, "第一行续行");
 assert.equal(parsed.values.linkedIn, "https://linkedin.com/in/lin");
 assert.ok(parsed.recognized >5);
});

test("falls back to FN when no structured name is present", () => {
 const parsed = parseVCard("BEGIN:VCARD\nVERSION:3.0\nFN:Solo Name\nEND:VCARD");
 assert.ok(parsed);
 assert.equal(parsed.values.firstName, "Solo Name");
});

test("unescapes separators and newlines in values", () => {
 const parsed = parseVCard(
 "BEGIN:VCARD\nVERSION:3.0\nN:;A;;;\nNOTE:a\\,b\\;c\\nd\nEND:VCARD",
 );
 assert.ok(parsed);
 assert.equal(parsed.values.note, "a,b;c\nd");
});

test("rejects text without a vCard", () => {
 assert.equal(parseVCard("hello world"), null);
 assert.equal(parseVCard(""), null);
 assert.equal(parseVCard("BEGIN:VCARD\nVERSION:3.0\nFOO:bar\nEND:VCARD"), null);
});

test("refuses oversized input", () => {
 assert.equal(parseVCard(`BEGIN:VCARD\nNOTE:${"x".repeat(70_000)}\nEND:VCARD`), null);
});

test("ignores non-http photos and logos", () => {
  const parsed = parseVCard(
    "BEGIN:VCARD\nVERSION:3.0\nN:;A;;;\nPHOTO:javascript:alert(1)\nLOGO:data:text/html,x\nEND:VCARD",
  );
  assert.ok(parsed);
  assert.equal(parsed.values.photo, "");
  assert.equal(parsed.values.logoUrl, "");
});

/**
 * A card exported by this app must come back into the same slots. `LOGO` is
 * written for `logoUrl` and `PHOTO` for `photo`; mapping both onto `photo`
 * silently moved a logo into the photo field on every re-import.
 */
test("LOGO restores the logo field and PHOTO restores the photo field", () => {
  const exported = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:;A;;;",
    "PHOTO;VALUE=URI:https://example.com/photo.png",
    "LOGO;VALUE=URI:https://example.com/logo.png",
    "END:VCARD",
    "",
  ].join("\r\n");

  const parsed = parseVCard(exported);
  assert.ok(parsed);
  assert.equal(parsed.values.photo, "https://example.com/photo.png");
  assert.equal(parsed.values.logoUrl, "https://example.com/logo.png");
});

/**
 * Regression guard for phone-type classification.
 *
 * `TYPE=VOICE` used to route a number into the work slot, so a plain voice
 * line imported as the work phone and the real mobile landed nowhere.
 */
test("a lone VOICE parameter is not treated as a work phone", () => {
 const parsed = parseVCard(
  "BEGIN:VCARD\nVERSION:3.0\nN:;A;;;\nTEL;TYPE=VOICE:+862112345678\nEND:VCARD",
 );
 assert.ok(parsed);
 assert.equal(parsed.values.cellPhone, "+862112345678");
 assert.equal(parsed.values.workPhone, "");
});

test("CELL+WORK together stays personal, WORK alone is the work slot", () => {
 const parsed = parseVCard(
  "BEGIN:VCARD\nVERSION:3.0\nN:;A;;;\nTEL;TYPE=CELL,WORK:+8613900000000\nTEL;TYPE=WORK:01062562288\nEND:VCARD",
 );
 assert.ok(parsed);
 assert.equal(parsed.values.cellPhone, "+8613900000000");
 assert.equal(parsed.values.workPhone, "01062562288");
});
