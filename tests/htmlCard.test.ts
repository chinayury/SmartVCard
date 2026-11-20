import test from "node:test";
import assert from "node:assert/strict";

import { buildSelfContainedCardHtml } from "../src/lib/htmlCard.ts";
import { createVCard } from "../src/lib/vcard.ts";
import { emptyVCard, toVCardData } from "../src/lib/schema.ts";

const QR_SVG = '<svg class="svc-qr" viewBox="0 0 29 29"><rect width="29" height="29"/></svg>';

const VALUES = {
	...emptyVCard,
	firstName: "志远",
	lastName: "林",
	organization: "示例科技",
	title: "工程师",
	cellPhone: "+8613800138000",
	email: "hello@example.com",
	slogan: "一扫即存",
};

const DATA = toVCardData(VALUES);
const VCARD = createVCard(DATA);

test("the document is fully self-contained: inline QR, no scripts, no external resources", () => {
	const html = buildSelfContainedCardHtml({ qrSvg: QR_SVG, data: DATA, vcard: VCARD });
	assert.ok(html.includes('class="svc-qr"'), "QR SVG embedded verbatim");
	assert.ok(!html.includes("<script"), "zero JavaScript");
	for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
		assert.ok(!/^https?:\/\//i.test(match[1]), `no external resource: ${match[1]}`);
	}
});

test("the embedded vCard download round-trips byte-for-byte", () => {
	const html = buildSelfContainedCardHtml({ qrSvg: QR_SVG, data: DATA, vcard: VCARD });
	const href = /href="data:text\/vcard;charset=utf-8;base64,([^"]+)"/.exec(html)?.[1];
	assert.ok(href, "the download link carries a base64 vCard");
	// Base64 → UTF-8 bytes, back to text: the exact CRLF payload, folded lines and all.
	const decoded = Buffer.from(href!, "base64").toString("utf8");
	assert.equal(decoded, VCARD);
	assert.ok(decoded.includes("BEGIN:VCARD"));
});

test("user values are HTML-escaped", () => {
	const hostile = toVCardData({ ...emptyVCard, firstName: "<b>bold</b>", organization: 'x" onclick="y' });
	const html = buildSelfContainedCardHtml({ qrSvg: QR_SVG, data: hostile, vcard: VCARD });
	assert.ok(!html.includes("<b>bold</b>"), "markup must not survive escaping");
	assert.ok(html.includes("&lt;b&gt;bold&lt;/b&gt;"));
	assert.ok(!html.includes('onclick="y"'));
});

test("the raw vCard sits in a details block for manual copy", () => {
	const html = buildSelfContainedCardHtml({ qrSvg: QR_SVG, data: DATA, vcard: VCARD });
	assert.ok(html.includes("<details>"));
	assert.ok(html.includes(escapeProbe("BEGIN:VCARD")));
});

function escapeProbe(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

test("the download filename carries the card name", () => {
	const html = buildSelfContainedCardHtml({ qrSvg: QR_SVG, data: DATA, vcard: VCARD });
	assert.ok(/download="[^"]+\.vcf"/.test(html), "a .vcf download attribute exists");
	assert.ok(html.includes("林志远"), "the card name is rendered");
});

test("a complete address rides the web card; a partial or absent one does not", () => {
	const withAddress = toVCardData({
		...emptyVCard,
		firstName: "志远",
		lastName: "林",
		workStreet: "武康路320号",
		workCity: "上海",
		workCountry: "中国",
	});
	const html = buildSelfContainedCardHtml({ qrSvg: QR_SVG, data: withAddress, vcard: VCARD });
	assert.ok(html.includes('class="addr"'), "address line exists");
	assert.ok(html.includes("武康路320号"));
	const bare = toVCardData({ ...emptyVCard, firstName: "志远" });
	const bareHtml = buildSelfContainedCardHtml({ qrSvg: QR_SVG, data: bare, vcard: VCARD });
	assert.ok(!bareHtml.includes('class="addr"'), "no address row without an address");
	const hostile = toVCardData({
		...emptyVCard,
		firstName: "志远",
		workStreet: "<script>",
		workCity: "上海",
	});
	const hostileHtml = buildSelfContainedCardHtml({ qrSvg: QR_SVG, data: hostile, vcard: VCARD });
	assert.ok(!hostileHtml.includes("<script>"), "address content is escaped");
});

test("UI strings follow the exporter's locale and are escaped", () => {
	const html = buildSelfContainedCardHtml({
		qrSvg: QR_SVG,
		data: DATA,
		vcard: VCARD,
		strings: { save: "保存到通讯录 (.vcf)", detailsSummary: "查看 vCard 文本", footer: "Smart VCard · 本地生成 · 无追踪" },
	});
	assert.ok(html.includes("保存到通讯录 (.vcf)"));
	assert.ok(html.includes("查看 vCard 文本"));
	assert.ok(html.includes("本地生成 · 无追踪"));
	assert.ok(!html.includes("Save to contacts"), "English defaults are replaced when strings are given");
});
