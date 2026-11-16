import { formatFullName } from "./text";
import type { VCardData } from "./vcardTypes";

/**
 * A print sheet for a real wallet card: ISO CR80 (85.6 × 54 mm — credit-card
 * size, borrowed from byzcard's print template idea). The sheet is a
 * self-contained HTML document printed through a hidden iframe, so its
 * `@page` rule is isolated from the app's own print stylesheet and the card
 * comes out at true physical size on printers that honour it.
 *
 * Layout is deliberately conservative for print: inline QR SVG, the name and
 * affiliation, up to three contact lines. No logo and no custom fonts — the
 * sheet must print identically on any printer, and base64 logos would double
 * the document for marginal benefit.
 */

/** ISO CR80 in millimetres (same size as a credit card). */
export const CARD_SHEET_WIDTH_MM = 85.6;
export const CARD_SHEET_HEIGHT_MM = 54;

export interface CardSheetOptions {
	/** The rendered QR symbol SVG (as produced by renderQrSvg). */
	qrSvg: string;
	data: VCardData;
	/** Accent colour for the QR ink and the card edge. Defaults to brand indigo. */
	accent?: string;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** Compose the CR80 card-front sheet as a standalone HTML document. */
export function buildCardSheetHtml({ qrSvg, data, accent = "#2b4acb" }: CardSheetOptions): string {
	const name = escapeHtml(formatFullName(data) || "Smart VCard");
	const org = [data.organization, data.title].filter(Boolean).map(String).map(escapeHtml).join(" · ");
	const contacts = [data.cellPhone, data.email, data.url].filter(Boolean).map(String).map(escapeHtml);
	const contactRows = contacts
		.map((line) => `<p class="line">${line}</p>`)
		.join("");
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Smart VCard · CR80</title>
<style>
  @page { size: ${CARD_SHEET_WIDTH_MM}mm ${CARD_SHEET_HEIGHT_MM}mm; margin: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  body {
    width: ${CARD_SHEET_WIDTH_MM}mm; height: ${CARD_SHEET_HEIGHT_MM}mm;
    overflow: hidden; background: #ffffff; color: #16213a;
    font-family: -apple-system, "Segoe UI", "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  .card { box-sizing: border-box; height: 100%; padding: 4mm 6mm 3mm; border-top: 1.3mm solid ${accent}; display: flex; gap: 5mm; }
  .qr { flex: 0 0 26mm; }
  .qr svg { width: 26mm; height: 26mm; display: block; }
  .info { flex: 1 1 auto; min-width: 0; padding-top: 1mm; }
  .name { margin: 0; font-size: 4.6mm; font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; }
  .org { margin: 1mm 0 0; font-size: 2.8mm; font-weight: 600; color: ${accent}; }
  .lines { margin: 2.2mm 0 0; }
  .line { margin: 0 0 0.8mm; font-size: 2.6mm; line-height: 1.3; color: #3d4a63; word-break: break-all; }
  .foot { margin-top: 1.6mm; font-size: 2.1mm; color: #8a93a8; letter-spacing: 0.14em; text-transform: uppercase; }
</style>
</head>
<body>
  <div class="card">
    <div class="qr">${qrSvg}</div>
    <div class="info">
      <p class="name">${name}</p>
      ${org ? `<p class="org">${org}</p>` : ""}
      ${contactRows ? `<div class="lines">${contactRows}</div>` : ""}
      <p class="foot">Smart VCard</p>
    </div>
  </div>
</body>
</html>`;
}

/** Print the sheet through a hidden iframe so its @page size applies. */
export function printCardSheet(html: string): boolean {
	const frame = document.createElement("iframe");
	frame.setAttribute("aria-hidden", "true");
	frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
	document.body.appendChild(frame);
	const doc = frame.contentWindow?.document;
	if (!doc) {
		frame.remove();
		return false;
	}
	doc.open();
	doc.write(html);
	doc.close();
	const win = frame.contentWindow;
	if (!win) {
		frame.remove();
		return false;
	}
	try {
		win.focus();
		win.print();
	} finally {
		// The print dialog blocks synchronously in every current browser, so the
		// frame is only removed once the user is done with it.
		setTimeout(() => frame.remove(), 1000);
	}
	return true;
}
