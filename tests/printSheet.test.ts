import test from "node:test";
import assert from "node:assert/strict";

import {
	buildCardSheetHtml,
	CARD_SHEET_HEIGHT_MM,
	CARD_SHEET_WIDTH_MM,
} from "../src/lib/printSheet.ts";
import { emptyVCard } from "../src/lib/schema.ts";
import { toVCardData } from "../src/lib/schema.ts";

const QR_SVG = '<svg class="svc-qr" viewBox="0 0 29 29"><rect width="29" height="29"/></svg>';

const DATA = toVCardData({
	...emptyVCard,
	firstName: "志远",
	lastName: "林",
	organization: "示例科技",
	title: "工程师",
	cellPhone: "+8613800138000",
	email: "hello@example.com",
	note: "备注不应出现在打印卡上",
});

test("the sheet is a CR80 page with exact physical units and forced colours", () => {
	const html = buildCardSheetHtml({ qrSvg: QR_SVG, data: DATA });
	assert.ok(html.includes(`size: ${CARD_SHEET_WIDTH_MM}mm ${CARD_SHEET_HEIGHT_MM}mm`));
	assert.ok(html.includes("print-color-adjust: exact"));
	assert.ok(html.includes("margin: 0"));
});

test("the sheet carries the QR symbol, name and affiliation — never unprinted fields", () => {
	const html = buildCardSheetHtml({ qrSvg: QR_SVG, data: DATA });
	assert.ok(html.includes('class="svc-qr"'), "the QR SVG is embedded verbatim");
	assert.ok(html.includes("林志远"), "full name follows CJK ordering");
	assert.ok(html.includes("示例科技 · 工程师"), "org and title join with a separator");
	assert.ok(html.includes("+8613800138000"));
	assert.ok(html.includes("hello@example.com"));
	assert.ok(!html.includes("备注不应出现在打印卡上"), "notes are not part of the card front");
});

test("user values are HTML-escaped", () => {
	const hostile = toVCardData({
		...emptyVCard,
		firstName: "<script>alert(1)</script>",
		organization: 'x" onmouseover="y',
	});
	const html = buildCardSheetHtml({ qrSvg: QR_SVG, data: hostile });
	assert.ok(!html.includes("<script>alert(1)</script>"), "script tags must not survive escaping");
	assert.ok(html.includes("&lt;script&gt;"), "dangerous input is escaped");
	assert.ok(!html.includes('onmouseover="y"'), "attribute injection is escaped");
});

test("optional blocks collapse when their fields are empty", () => {
	const minimal = toVCardData({ ...emptyVCard, firstName: "Solo" });
	const html = buildCardSheetHtml({ qrSvg: QR_SVG, data: minimal });
	assert.ok(html.includes("Solo"));
	assert.ok(!html.includes('class="org"'), "no org line without organisation");
	assert.ok(!html.includes('class="line"'), "no contact lines without contact fields");
});

test("the accent colour propagates to the card edge and org line", () => {
	const html = buildCardSheetHtml({ qrSvg: QR_SVG, data: DATA, accent: "#0e7a5f" });
	assert.ok(html.includes("border-top: 1.3mm solid #0e7a5f"));
	assert.ok(html.includes("color: #0e7a5f"));
});
