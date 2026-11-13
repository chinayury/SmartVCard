import test from "node:test";
import assert from "node:assert/strict";

import {
 countFilledFields,
 emptyVCard,
 FIELD_LIMITS,
 mergeWithDefaults,
 toVCardData,
 vcardSchema,
} from "../src/lib/schema.ts";

test("a name is the only required field", () => {
 assert.equal(vcardSchema.safeParse({ firstName: "Lin" }).success, true);
 const result = vcardSchema.safeParse({ firstName: "" });
 assert.equal(result.success, false);
 assert.equal(result.error?.issues[0]?.message, "firstNameRequired");
});

test("URLs must use http(s)", () => {
 for (const bad of ["javascript:alert(1)", "data:text/html,<b>x</b>", "ftp://x.test", "//x.test"]) {
 assert.equal(vcardSchema.safeParse({ firstName: "A", url: bad }).success, false, bad);
 }
 assert.equal(vcardSchema.safeParse({ firstName: "A", url: "https://example.com/a?b=1" }).success, true);
});

test("logo accepts https and base64 images but not html data URLs", () => {
 assert.equal(
 vcardSchema.safeParse({
 firstName: "A",
 logoUrl: "data:image/png;base64,iVBORw0KGgo=",
 }).success,
 true,
 );
 assert.equal(
 vcardSchema.safeParse({ firstName: "A", logoUrl: "data:text/html,<script>x</script>" }).success,
 false,
 );
 assert.equal(
 vcardSchema.safeParse({ firstName: "A", logoUrl: "https://example.com/a.svg" }).success,
 true,
 );
});

test("phone numbers reject letters and accept common separators", () => {
 assert.equal(vcardSchema.safeParse({ firstName: "A", cellPhone: "call me" }).success, false);
 assert.equal(vcardSchema.safeParse({ firstName: "A", cellPhone: "+86138-00000000" }).success, true);
 assert.equal(vcardSchema.safeParse({ firstName: "A", cellPhone: "(010)62562288" }).success, true);
});

test("dates must be real calendar days", () => {
 assert.equal(vcardSchema.safeParse({ firstName: "A", birthday: "2024-02-31" }).success, false);
 assert.equal(vcardSchema.safeParse({ firstName: "A", birthday: "2024-02-29" }).success, true);
 assert.equal(vcardSchema.safeParse({ firstName: "A", birthday: "1996-4-15" }).success, false);
});

test("length caps are enforced", () => {
 assert.equal(vcardSchema.safeParse({ firstName: "A".repeat(61) }).success, false);
 assert.equal(vcardSchema.safeParse({ firstName: "A", note: "x".repeat(1001) }).success, false);
 assert.equal(vcardSchema.safeParse({ firstName: "A", organization: "x".repeat(121) }).success, false);
});

test("empty strings pass optional validators", () => {
 assert.equal(
 vcardSchema.safeParse({ firstName: "A", email: "", url: "", birthday: "", photo: "" }).success,
 true,
 );
});

test("toVCardData drops blanks and only builds an address when needed", () => {
 const data = toVCardData({
 ...emptyVCard,
 firstName: " Lin ",
 lastName: "",
 workCity: " Shanghai ",
 });
 assert.equal(data.firstName, "Lin");
 assert.equal(data.lastName, undefined);
 assert.equal(data.workAddress?.city, "Shanghai");
 assert.equal(data.email, undefined);

 const empty = toVCardData(emptyVCard);
 assert.equal(empty.workAddress, undefined);
 assert.deepEqual(empty.socialUrls, { linkedIn: undefined, twitter: undefined, wechat: undefined });
});

test("countFilledFields ignores whitespace", () => {
 assert.equal(countFilledFields(emptyVCard),0);
 assert.equal(countFilledFields({ ...emptyVCard, firstName: "A", note: " " }),1);
});

test("mergeWithDefaults drops unknown keys and coerces non-strings", () => {
 const merged = mergeWithDefaults({
 firstName: "林 ",
 note:123 as unknown as string,
 unknownKey: "x",
 });
 assert.equal(merged.firstName, "林");
 assert.equal(merged.note, "");
 assert.equal(Object.prototype.hasOwnProperty.call(merged, "unknownKey"), false);
 assert.equal(mergeWithDefaults(null).firstName, "");
});

/**
 * Regression guard for the per-field cap defect.
 *
 * mergeWithDefaults used to slice every value at 2048 characters — far above
 * the schema's own caps (organisation 120, WeChat ID 64, …). An imported card
 * or a legacy draft with a long value therefore restored a value the form
 * rejects, and the user met "too long" errors on fields they never touched.
 */
test("mergeWithDefaults caps every value at its own schema limit", () => {
 const merged = mergeWithDefaults({
 organization: "O".repeat(300),
 wechat: "w".repeat(200),
 workPostal: "2".repeat(50),
 firstName: "N".repeat(100),
 note: "x".repeat(1500),
 });
 assert.equal(merged.organization.length, FIELD_LIMITS.organization);
 assert.equal(merged.wechat.length, FIELD_LIMITS.wechat);
 assert.equal(merged.workPostal.length, FIELD_LIMITS.workPostal);
 assert.equal(merged.firstName.length, FIELD_LIMITS.firstName);
 assert.equal(merged.note.length, FIELD_LIMITS.note);
 // A value at the limit round-trips untouched.
 assert.equal(mergeWithDefaults({ note: "x".repeat(FIELD_LIMITS.note) }).note.length, FIELD_LIMITS.note);
});

test("mergeWithDefaults strips control characters, keeping newlines", () => {
 const merged = mergeWithDefaults({
 firstName: "A\u0007B\u0009C",
 note: "line1\nline2",
 });
 assert.equal(merged.firstName, "ABC");
 assert.equal(merged.note, "line1\nline2");
});
