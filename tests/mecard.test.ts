import test from "node:test";
import assert from "node:assert/strict";
import jsQR from "jsqr";

import { createMeCard } from "../src/lib/mecard.ts";
import { buildQrMatrix, type QrMatrix } from "../src/lib/qr.ts";
import { emptyVCard, toVCardData } from "../src/lib/schema.ts";

/**
 * Minimal binary rasteriser (square modules only). renderQrPng needs a canvas
 * that Node lacks — the pixel-faithful multi-style rasteriser lives in
 * qrDecode.test.ts; this one only proves the MeCard text survives the symbol.
 */
function rasterizeSquare(matrix: QrMatrix, scale = 8) {
	const quiet = 4;
	const size = (matrix.size + quiet * 2) * scale;
	const data = new Uint8ClampedArray(size * size * 4).fill(255);
	for (let y = 0; y < matrix.size; y++) {
		for (let x = 0; x < matrix.size; x++) {
			if (!matrix.isDark(x, y)) continue;
			for (let dy = 0; dy < scale; dy++) {
				for (let dx = 0; dx < scale; dx++) {
					const index = ((y + quiet) * scale + dy) * size * 4 + ((x + quiet) * scale + dx) * 4;
					data[index] = 0;
					data[index + 1] = 0;
					data[index + 2] = 0;
					data[index + 3] = 255;
				}
			}
		}
	}
	return { data, width: size, height: size };
}

const SAMPLE = toVCardData({
	...emptyVCard,
	firstName: "志远",
	lastName: "林",
	nickname: "ZY",
	cellPhone: "+8613800138000",
	workPhone: "+861066006600",
	email: "hello@example.com",
	workEmail: "work@example.com",
	url: "https://example.com",
	workStreet: "武康路 320 号",
	workCity: "上海",
	birthday: "1996-04-15",
	note: "MeCard 实测",
});

test("the payload follows the DoCoMo wire format with a ;; terminator", () => {
	const mecard = createMeCard(SAMPLE);
	assert.ok(mecard.startsWith("MECARD:"), "MECARD: prefix");
	assert.ok(mecard.endsWith(";;"), "the payload terminates with ;;");
	assert.ok(mecard.startsWith("MECARD:N:林,志远;"), "N is family-first");
	assert.ok(mecard.includes("NICKNAME:ZY;"));
	assert.ok(mecard.includes("TEL:+8613800138000;"));
	assert.ok(mecard.includes("TEL:+861066006600;"), "both phones ride their own TEL");
	assert.ok(mecard.includes("EMAIL:hello@example.com;"));
	assert.ok(mecard.includes("EMAIL:work@example.com;"));
	assert.ok(mecard.includes("URL:https://example.com;"));
	assert.ok(mecard.includes("BDAY:19960415;"), "BDAY is bare YYYYMMDD");
	assert.ok(mecard.includes("NOTE:MeCard 实测;"));
	assert.ok(mecard.includes("ADR:,,武康路 320 号,上海,,,;"), "vCard-order components, empties collapse");
});

test("org, title and slogan have no MeCard representation and are omitted", () => {
	const withOrg = toVCardData({ ...emptyVCard, firstName: "A", organization: "Corp", title: "CEO", slogan: "s" });
	const mecard = createMeCard(withOrg);
	assert.ok(!mecard.includes("Corp"));
	assert.ok(!mecard.includes("CEO"));
	assert.ok(!mecard.includes("s"));
});

test("structural characters are escaped, newlines are flattened", () => {
	const tricky = toVCardData({
		...emptyVCard,
		firstName: "名,字;测试\\反斜杠",
		note: "第一行\n第二行",
	});
	const mecard = createMeCard(tricky);
	// 名,字;测试\反斜杠 → 名\,字\;测试\\反斜杠 (backslash doubled first)
	assert.ok(mecard.includes("名\\,字\\;测试\\\\反斜杠"), "commas, semicolons and backslashes escaped");
	assert.ok(!mecard.includes("\n"), "MeCard is single-line");
	assert.ok(mecard.includes("NOTE:第一行 第二行;"));
});

test("a partial address is not written, mirroring the vCard discipline", () => {
	const partial = toVCardData({ ...emptyVCard, firstName: "A", workStreet: "只有街道" });
	const mecard = createMeCard(partial);
	assert.ok(!mecard.includes("ADR:"));
});

test("a minimal card is just the name plus the terminator", () => {
	const mecard = createMeCard(toVCardData({ ...emptyVCard, firstName: "Solo" }));
	assert.equal(mecard, "MECARD:N:,Solo;;");
});

test("the MeCard payload really scans: jsQR decodes the rendered symbol byte-for-byte", () => {
	const mecard = createMeCard(SAMPLE);
	const matrix = buildQrMatrix(mecard, { style: "square" });
	const raster = rasterizeSquare(matrix);
	const decoded = jsQR(raster.data, raster.width, raster.height);
	assert.ok(decoded, "the symbol decodes");
	assert.equal(decoded.data, mecard);
});
