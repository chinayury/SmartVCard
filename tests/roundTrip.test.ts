import test from "node:test";
import assert from "node:assert/strict";

import { createVCard } from "../src/lib/vcard.ts";
import { parseVCard } from "../src/lib/vcardParse.ts";
import { emptyVCard, mergeWithDefaults, toVCardData, type VCardFormValues } from "../src/lib/schema.ts";

/**
 * Export → import must round-trip.
 *
 * The vCard writer and the parser are two independent implementations of the
 * same format. A field can survive one direction and be silently dropped,
 * renamed or re-slotted on the way back — the LOGO/photo mix-up and the
 * dropped work fields fixed in v0.1.0 were exactly that. This suite is the
 * contract that keeps them aligned.
 *
 * Phone numbers are the one deliberate exception: the writer strips separators
 * and keeps a leading `+` (see `cleanPhone`), so a round-tripped number comes
 * back normalised rather than as typed.
 */
const FULL: VCardFormValues = {
  ...emptyVCard,
  firstName: "志远",
  lastName: "林",
  middleName: "",
  namePrefix: "",
  nameSuffix: "",
  nickname: "ZY",
  cellPhone: "+8613800000000",
  workPhone: "01062562288",
  email: "home@example.com",
  workEmail: "work@example.com",
  url: "https://example.com",
  workUrl: "https://work.example.com",
  organization: "示例科技",
  title: "设计总监",
  companyShortName: "示例",
  slogan: "一眼读懂的设计。",
  logoUrl: "https://example.com/logo.png",
  workStreet: "武康路320号",
  workCity: "上海",
  workState: "上海",
  workPostal: "200000",
  workCountry: "中国",
  birthday: "1996-04-15",
  note: "第一行\n第二行,带逗号;带分号\\带反斜杠",
  photo: "https://example.com/photo.png",
  linkedIn: "https://linkedin.com/in/lin",
  twitter: "https://x.com/lin",
  wechat: "lin_zhiyuan",
};


/** Structured name components the writer splits out of N and cannot rebuild. */
const NAME_COMPONENTS = new Set<keyof VCardFormValues>([
  "middleName",
  "namePrefix",
  "nameSuffix",
]);

/**
 * Address components ride on one ADR property, and the writer deliberately
 * omits a partial address (street && city required — a lone country would
 * import as a junk row). These are covered by the dedicated address test
 * below instead of the single-field loop.
 */
const ADDRESS_COMPONENTS = new Set<keyof VCardFormValues>([
  "workStreet",
  "workCity",
  "workState",
  "workPostal",
  "workCountry",
]);

test("a full card survives export → import unchanged", () => {
  const vcard = createVCard(toVCardData(FULL));
  const parsed = parseVCard(vcard);
  assert.ok(parsed, "the exported vCard must be re-importable");

  for (const [key, expected] of Object.entries(FULL)) {
    if (NAME_COMPONENTS.has(key as keyof VCardFormValues)) continue;
    assert.equal(
      parsed.values[key as keyof VCardFormValues],
      expected,
      `field ${key} did not round-trip`,
    );
  }
});

test("the writer's own output is always re-importable, for any field subset", () => {
  // Every single field on its own: catches a field that only breaks in
  // isolation (e.g. a property the parser never learned to read).
  const keys = Object.keys(emptyVCard) as (keyof VCardFormValues)[];
  for (const key of keys) {
    if (ADDRESS_COMPONENTS.has(key)) continue; // see the address test below
    const single = { ...emptyVCard, [key]: FULL[key] } as VCardFormValues;
    if (!String(FULL[key]).trim()) continue;
    const parsed = parseVCard(createVCard(toVCardData(single)));
    assert.ok(parsed, `exporting only ${key} produced an unimportable vCard`);
    assert.equal(
      parsed.values[key],
      FULL[key],
      `field ${key} alone did not round-trip`,
    );
  }
});

test("an address round-trips as a whole, and a partial one is not written", () => {
  const withAddress: VCardFormValues = { ...emptyVCard, ...FULL };
  const parsed = parseVCard(createVCard(toVCardData(withAddress)));
  assert.ok(parsed);
  assert.equal(parsed.values.workStreet, FULL.workStreet);
  assert.equal(parsed.values.workCity, FULL.workCity);
  assert.equal(parsed.values.workState, FULL.workState);
  assert.equal(parsed.values.workPostal, FULL.workPostal);
  assert.equal(parsed.values.workCountry, FULL.workCountry);

  // Street + city is the minimum for an ADR; anything less writes none.
  const streetOnly: VCardFormValues = { ...emptyVCard, firstName: "A", workStreet: "Wukang Road" };
  assert.ok(!createVCard(toVCardData(streetOnly)).includes("ADR"));
  const cityOnly: VCardFormValues = { ...emptyVCard, firstName: "A", workCity: "Shanghai" };
  assert.ok(!createVCard(toVCardData(cityOnly)).includes("ADR"));

  // Street + city round-trips even when the finer components are absent.
  const minimal: VCardFormValues = {
    ...emptyVCard,
    firstName: "A",
    workStreet: "Wukang Road",
    workCity: "Shanghai",
  };
  const minimalParsed = parseVCard(createVCard(toVCardData(minimal)));
  assert.ok(minimalParsed);
  assert.equal(minimalParsed.values.workStreet, "Wukang Road");
  assert.equal(minimalParsed.values.workCity, "Shanghai");
});

test("importing a card twice is idempotent", () => {
  const first = parseVCard(createVCard(toVCardData(FULL)));
  assert.ok(first);
  const second = parseVCard(createVCard(toVCardData(first.values)));
  assert.ok(second);
  assert.deepEqual(second.values, first.values);
});

test("a logo never migrates into the photo slot on re-import", () => {
  const withLogo: VCardFormValues = {
    ...emptyVCard,
    firstName: "测试",
    logoUrl: "https://example.com/logo.png",
  };
  const parsed = parseVCard(createVCard(toVCardData(withLogo)));
  assert.ok(parsed);
  assert.equal(parsed.values.logoUrl, "https://example.com/logo.png");
  assert.equal(parsed.values.photo, "");
});

test("mergeWithDefaults is a stable fixpoint for imported values", () => {
  const parsed = parseVCard(createVCard(toVCardData(FULL)));
  assert.ok(parsed);
  assert.deepEqual(mergeWithDefaults(parsed.values), parsed.values);
});
