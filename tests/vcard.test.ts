import test from "node:test";
import assert from "node:assert/strict";

import { createVCard, createVCardForQr, foldLine, unfoldVCard, VCARD_LINE_OCTET_LIMIT } from "../src/lib/vcard.ts";
import { parseVCard } from "../src/lib/vcardParse.ts";

const encoder = new TextEncoder();

test("writes CRLF, conventional order and a final newline", () => {
 const out = createVCard({ firstName: "Jane", lastName: "Doe", email: "jane@example.com" });
 assert.ok(out.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n"));
 assert.ok(out.endsWith("END:VCARD\r\n"));
 assert.ok(out.includes("\r\nN:Doe;Jane;;;\r\n"));
 assert.ok(out.includes("\r\nFN:Jane Doe\r\n"));
 assert.ok(!out.includes("\n\n"));
});

test("Chinese names are family-name first with no inner space", () => {
 const out = createVCard({ firstName: "志远", lastName: "林" });
 assert.ok(out.includes("FN:林志远"));
 assert.ok(!out.includes("FN:林\u0020志远"));
});

test("escapes separators and newlines, preventing vCard injection", () => {
 const out = createVCard({
 firstName: "A",
 note: "line1\nline2, with; separators\r\nEND:VCARD",
 });
 assert.ok(out.includes("NOTE:line1\\nline2\\, with\\; separators\\nEND:VCARD"));
 // Only one real END:VCARD line exists.
 assert.equal(out.split("\r\n").filter((line) => line === "END:VCARD").length,1);
});

test("exports nickname, birthday, logo and social profiles", () => {
 const out = createVCard({
 firstName: "A",
 nickname: "Al",
 birthday: "1996-04-15",
 logoUrl: "https://example.com/logo.png",
 photo: { url: "https://example.com/me.png" },
 socialUrls: { linkedIn: "https://linkedin.com/in/a", wechat: "wxid_a" },
 });
 assert.ok(out.includes("NICKNAME:Al"));
 assert.ok(out.includes("BDAY:1996-04-15"));
 assert.ok(out.includes("LOGO;VALUE=URI:https://example.com/logo.png"));
 assert.ok(out.includes("PHOTO;VALUE=URI:https://example.com/me.png"));
 assert.ok(out.includes("X-SOCIALPROFILE;TYPE=linkedin:https://linkedin.com/in/a"));
 assert.ok(out.includes("X-SOCIALPROFILE;TYPE=wechat:wxid_a"));
});

test("the PGP public key travels as X-SMARTVCARD-PGP and survives folding", () => {
 const armour = [
 "-----BEGIN PGP PUBLIC KEY BLOCK-----",
 "mQINBGfZ".repeat(30),
 "-----END PGP PUBLIC KEY BLOCK-----",
 ].join("\n");
 const out = createVCard({ firstName: "A", pgpPublicKey: armour });
 assert.ok(out.includes("X-SMARTVCARD-PGP:"), "the property exists");
 // Long armour lines are folded at 75 octets; unfolding reassembles the value
 // with its newlines escaped as literal \n (vCard 3.0 escaping).
 const folded = out
 .split("\r\n")
 .filter((line) => line.startsWith("X-SMARTVCARD-PGP:") || line.startsWith(" "))
 .map((line) => (line.startsWith(" ") ? line.slice(1) : line))
 .join("");
 assert.ok(folded.includes("-----BEGIN PGP PUBLIC KEY BLOCK-----"));
 assert.ok(folded.includes("-----END PGP PUBLIC KEY BLOCK-----"));
 assert.ok(folded.includes("\\n"), "newlines are vCard-escaped inside the value");
 // The escaped value still occupies exactly one physical property line.
 assert.equal(
 out.split("\r\n").filter((line) => line.startsWith("X-SMARTVCARD-PGP:")).length,
 1,
 );
});

test("never exports base64 uploads or non-http image sources", () => {
 const out = createVCard({
 firstName: "A",
 logoUrl: "data:image/png;base64,AAAA",
 photo: { url: "javascript:alert(1)" },
 });
 assert.ok(!out.includes("LOGO"));
 assert.ok(!out.includes("PHOTO"));
});

test("preserves international phone prefix and strips formatting", () => {
  const out = createVCard({ firstName: "A", cellPhone: "+86138-0000-0000", workPhone: "01062562288" });
  assert.ok(out.includes("TEL;TYPE=CELL:+8613800000000"));
  assert.ok(out.includes("TEL;TYPE=WORK:01062562288"));
});

/**
 * Regression guard for the dropped-work-field defect fixed in v0.1.0.
 *
 * The writer emitted bare `TEL:` / `EMAIL:` / `URL:` with no TYPE parameter, so
 * the importer could not tell the mobile from the landline and silently threw
 * the second value of each pair away. A card could be exported and re-imported
 * with its work phone, work email and work website gone.
 */
test("every paired field carries a TYPE parameter so re-import keeps both", () => {
  const out = createVCard({
    firstName: "A",
    cellPhone: "+8613800000000",
    workPhone: "01062562288",
    email: "home@example.com",
    workEmail: "work@example.com",
    url: "https://example.com",
    workUrl: "https://work.example.com",
  });

  assert.ok(out.includes("TEL;TYPE=CELL:+8613800000000"));
  assert.ok(out.includes("TEL;TYPE=WORK:01062562288"));
  assert.ok(out.includes("EMAIL;TYPE=INTERNET:home@example.com"));
  assert.ok(out.includes("EMAIL;TYPE=WORK:work@example.com"));
  assert.ok(out.includes("URL:https://example.com"));
  assert.ok(out.includes("URL;TYPE=WORK:https://work.example.com"));

  // No untyped duplicates that would collapse onto the first slot.
  assert.ok(!/(^|\r\n)TEL:/.test(out));
  assert.ok(!/(^|\r\n)EMAIL:/.test(out));
});

test("address uses the seven ADR components with TYPE=WORK", () => {
 const out = createVCard({
 firstName: "A",
 workAddress: {
 street: "320 Wukang Road",
 city: "Shanghai",
 stateProvince: "Shanghai",
 postalCode: "200000",
 countryRegion: "China",
 },
 });
 assert.ok(out.includes("ADR;TYPE=WORK:;;320 Wukang Road;Shanghai;Shanghai;200000;China"));
});

/**
 * Regression guard for the partial-address defect (borrowed from
 * overtonlabs/qr-business-card): a lone country used to emit
 * `ADR:;;;;;;USA`, which contacts apps import as a junk row instead of as
 * no address. Street and city must both be present.
 */
test("a partial address is omitted instead of written broken", () => {
 const countryOnly = createVCard({
 firstName: "A",
 workAddress: { street: "", city: "", stateProvince: "", postalCode: "", countryRegion: "USA" },
 });
 assert.ok(!countryOnly.includes("ADR"));

 const streetOnly = createVCard({
 firstName: "A",
 workAddress: { street: "320 Wukang Road", city: "", stateProvince: "", postalCode: "", countryRegion: "" },
 });
 assert.ok(!streetOnly.includes("ADR"));

 const cityOnly = createVCard({
 firstName: "A",
 workAddress: { street: "", city: "Shanghai", stateProvince: "", postalCode: "", countryRegion: "" },
 });
 assert.ok(!cityOnly.includes("ADR"));
});

/**
 * The QR payload carries the same card with LF joins and no folding: every
 * fold costs 3 octets, and enough of them push the symbol up a QR version.
 */
test("the QR payload is the same card with LF joins and no folding", () => {
 const data = {
 firstName: "A",
 lastName: "B".repeat(40),
 note: "长备注".repeat(30),
 workAddress: { street: "320 Wukang Road", city: "Shanghai", stateProvince: "", postalCode: "", countryRegion: "" },
 };
 const forQr = createVCardForQr(data);
 assert.ok(!forQr.includes("\r"));
 assert.ok(forQr.startsWith("BEGIN:VCARD\nVERSION:3.0\n"));
 assert.ok(forQr.endsWith("END:VCARD"));
 // Unfolding the .vcf output yields exactly the QR payload.
 assert.equal(unfoldVCard(createVCard(data)).join("\n").replace(/\n$/, ""), forQr);
 // The compact form is strictly smaller for a card long enough to fold.
 assert.ok(forQr.length < createVCard(data).length);
 // And it parses back identically.
 assert.equal(parseVCard(forQr)?.values.firstName, "A");
});

test("drops invalid dates instead of writing garbage", () => {
 const out = createVCard({ firstName: "A", birthday: "2024-02-31" });
 assert.ok(!out.includes("BDAY"));
});

test("folds every logical line at75 UTF-8 octets", () => {
 const out = createVCard({ firstName: "A".repeat(80), note: "长备注".repeat(60) });
 for (const line of out.split("\r\n")) {
 assert.ok(
 encoder.encode(line).byteLength <= VCARD_LINE_OCTET_LIMIT,
 `line exceeds limit: ${line}`,
 );
 }
 assert.ok(out.split("\r\n").some((line) => line.startsWith(" ")));

 const unfolded = unfoldVCard(out).join("\n");
 assert.ok(unfolded.includes("A".repeat(80)));
 assert.ok(unfolded.includes("长备注".repeat(60)));
});

test("foldLine counts bytes, not characters", () => {
 const folded = foldLine(`NOTE:${"汉".repeat(40)}`);
 const lines = folded.split("\r\n");
 assert.ok(lines.length >1);
 for (const line of lines) {
 assert.ok(encoder.encode(line).byteLength <= VCARD_LINE_OCTET_LIMIT);
 }
 assert.equal(unfoldVCard(folded).join(""), `NOTE:${"汉".repeat(40)}`);
});

test("esc strips tabs so folded lines stay well-formed", () => {
 const out = createVCard({ firstName: "A", note: "col1\tcol2" });
 assert.ok(out.includes("NOTE:col1col2"));
 assert.ok(!out.includes("\t"));
});
