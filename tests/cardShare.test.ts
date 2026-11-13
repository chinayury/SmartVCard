import test from "node:test";
import assert from "node:assert/strict";

import { createVCard } from "../src/lib/vcard.ts";
import {
 base64UrlDecode,
 base64UrlEncode,
 buildShareUrl,
 decodeShareParam,
 decodeSharePayload,
 encodeSharePayload,
 readShareParam,
} from "../src/lib/cardShare.ts";
import { emptyVCard } from "../src/lib/schema.ts";

const SAMPLE = {
 ...emptyVCard,
 firstName: "志远",
 lastName: "林",
 organization: "示例科技",
 note: "中英 mixed 🚀",
 email: "hello@example.com",
 url: "https://example.com",
};

test("base64url round-trips ASCII, CJK and emoji at every padding length", () => {
 for (const length of [1,2,3,4,5,6,7,8,9,10]) {
 const value = "汉".repeat(length) + "x".repeat(length %3);
 assert.equal(base64UrlDecode(base64UrlEncode(value)), value);
 }
 assert.equal(base64UrlEncode("x".repeat(3)).includes("="), false);
});

test("share payload round-trips all non-empty fields", () => {
 const decoded = decodeSharePayload(encodeSharePayload(SAMPLE));
 assert.ok(decoded);
 assert.equal(decoded.firstName, "志远");
 assert.equal(decoded.lastName, "林");
 assert.equal(decoded.organization, "示例科技");
 assert.equal(decoded.note, "中英 mixed 🚀");
});

test("empty fields are omitted from the payload", () => {
 const encoded = encodeSharePayload(SAMPLE);
 const full = base64UrlEncode(JSON.stringify(SAMPLE));
 assert.ok(encoded.length < full.length);
 const decoded = decodeSharePayload(encoded);
 assert.ok(decoded);
 assert.equal(decoded.cellPhone, "");
});

test("share URL puts the parameter inside the hash so HashRouter sees it", () => {
 const url = buildShareUrl(SAMPLE, "https://example.com/app/index.html?x=1#/generator");
 assert.ok(url.startsWith("https://example.com/app/index.html#/?v="));
 assert.ok(!url.includes("?x=1"));
 assert.ok(!url.includes("#/generator"));
});

test("decoding rejects malformed, oversized and non-object payloads", () => {
 assert.equal(decodeSharePayload(""), null);
 assert.equal(decodeSharePayload("!!!!"), null);
 assert.equal(decodeSharePayload(base64UrlEncode("not json")), null);
 assert.equal(decodeSharePayload(base64UrlEncode("[]")), null);
 assert.equal(decodeSharePayload(base64UrlEncode('"text"')), null);
 assert.equal(decodeSharePayload("a".repeat(6001)), null);
});

test("untrusted links cannot inject non-http URLs or a logo", () => {
 const hostile = base64UrlEncode(
 '{"firstName":"A","url":"javascript:alert(1)","workUrl":"data:text/html,x","photo":"http://images.example.com/a.png","logoUrl":"data:image/png;base64,AAAA","__proto__":{"polluted":true}}',
 );
 const decoded = decodeSharePayload(hostile);
 assert.ok(decoded);
 assert.equal(decoded.url, "");
 assert.equal(decoded.workUrl, "");
 assert.equal(decoded.photo, "http://images.example.com/a.png");
 assert.equal(decoded.logoUrl, "");
 assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test("decodeShareParam returns render data and a vCard string", () => {
 const shared = decodeShareParam(encodeSharePayload(SAMPLE));
 assert.ok(shared);
 assert.equal(shared.vcard, createVCard(shared.data));
 assert.ok(shared.vcard.includes("FN:林志远"));
});

test("readShareParam understands both new and legacy links", () => {
 assert.equal(readShareParam({ search: "", hash: "#/?v=abc" }), "abc");
 assert.equal(readShareParam({ search: "?v=legacy", hash: "" }), "legacy");
 assert.equal(readShareParam({ search: "", hash: "#/generator" }), null);
 assert.equal(readShareParam({ search: "?other=1", hash: "#/?v=new" }), "new");
});
