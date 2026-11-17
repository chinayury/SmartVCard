import { formatFullName } from "./text";
import type { VCardData } from "./vcardTypes";

/**
 * Self-contained web card export (borrowed from OwnCardly's offline-card
 * idea): a single HTML file the recipient opens anywhere — it renders the
 * finished card, saves the contact via a data-URI download and shows the raw
 * vCard for manual copy. No JavaScript, no external resources, works offline
 * from a USB stick, an email attachment or any static hosting.
 */

export interface CardHtmlOptions {
	/** The rendered QR symbol SVG (as produced by renderQrSvg). */
	qrSvg: string;
	data: VCardData;
	/** The complete vCard text (CRLF, folded) embedded as the download payload. */
	vcard: string;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** Base64 of UTF-8 text in the browser (Buffer is unavailable there). */
function base64Utf8(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let binary = "";
	const chunkSize = 0x8000;
	for (let index = 0; index < bytes.length; index += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
	}
	return btoa(binary);
}

/** Compose the standalone web-card document. */
export function buildSelfContainedCardHtml({ qrSvg, data, vcard }: CardHtmlOptions): string {
	const name = escapeHtml(formatFullName(data) || "Smart VCard");
	const org = escapeHtml([data.organization, data.title].filter(Boolean).map(String).join(" · "));
	const contacts = [
		{ label: "TEL", value: data.cellPhone || data.workPhone || "" },
		{ label: "MAIL", value: data.email || data.workEmail || "" },
		{ label: "WEB", value: (data.url || data.workUrl || "").replace(/^https?:\/\//i, "") },
	]
		.filter((row) => row.value)
		.map((row) => `<p class="line"><span class="tag">${row.label}</span>${escapeHtml(row.value)}</p>`)
		.join("");
	const slogan = escapeHtml(data.slogan || "");
	const vcardBase64 = base64Utf8(vcard);
	const fileBase = escapeHtml(formatFullName(data) || "contact");
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" />
<title>${name} · Smart VCard</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #f4f6fa; color: #16213a;
    font-family: "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; }
  .card { width: min(420px, 100%); background: #ffffff; border: 1px solid #e2e7f0; border-radius: 20px;
    box-shadow: 0 14px 40px rgba(22, 33, 58, 0.10); padding: 30px 28px 26px; }
  .head { display: flex; align-items: center; gap: 12px; }
  .brand { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: #2b4acb;
    color: #ffffff; font-weight: 700; font-size: 15px; }
  .org { font-size: 15px; font-weight: 600; color: #16213a; }
  .name { margin-top: 26px; text-align: center; font-size: 30px; font-weight: 700; letter-spacing: -0.01em; }
  .contacts { margin-top: 18px; display: grid; gap: 8px; }
  .line { font-size: 12.5px; color: #3d4a63; word-break: break-all; }
  .tag { display: inline-block; min-width: 38px; margin-right: 10px; padding: 1px 6px; text-align: center;
    border: 1px solid #e2e7f0; border-radius: 6px; background: #f4f6fa; font-family: ui-monospace, monospace;
    font-size: 9px; font-weight: 600; letter-spacing: 0.12em; color: #6d7890; }
  .qrrow { margin-top: 20px; display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
  .slogan { font-size: 15px; font-weight: 700; color: #16213a; opacity: 0.7; line-height: 1.35; }
  .qr { flex: 0 0 auto; padding: 6px; border: 1px solid #e2e7f0; border-radius: 12px; background: #ffffff; }
  .qr svg { display: block; width: 96px; height: 96px; }
  .actions { margin-top: 22px; display: grid; gap: 8px; }
  .save { display: block; text-align: center; padding: 11px 16px; border-radius: 12px; background: #2b4acb;
    color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; }
  .save:hover { background: #2139a0; }
  details { border: 1px solid #e2e7f0; border-radius: 10px; padding: 10px 12px; background: #f4f6fa; }
  summary { cursor: pointer; font-size: 12px; color: #6d7890; }
  pre { margin-top: 8px; white-space: pre-wrap; word-break: break-all; font-size: 11px; line-height: 1.5; color: #3d4a63; }
  .foot { margin-top: 16px; text-align: center; font-family: ui-monospace, monospace; font-size: 9px;
    letter-spacing: 0.24em; text-transform: uppercase; color: #8a93a8; }
</style>
</head>
<body>
  <main class="card">
    <div class="head">
      <span class="brand">${escapeHtml(data.companyShortName || formatFullName(data).slice(0, 2) || "SV")}</span>
      <span class="org">${org}</span>
    </div>
    <h1 class="name">${name}</h1>
    <div class="contacts">${contacts}</div>
    <div class="qrrow">
      <p class="slogan">${slogan}</p>
      <div class="qr">${qrSvg}</div>
    </div>
    <div class="actions">
      <a class="save" download="${fileBase}.vcf" href="data:text/vcard;charset=utf-8;base64,${vcardBase64}">Save to contacts (.vcf)</a>
      <details>
        <summary>View the vCard text (copy manually if the download is blocked)</summary>
        <pre>${escapeHtml(vcard)}</pre>
      </details>
    </div>
    <p class="foot">Smart VCard · Generated locally · No tracking</p>
  </main>
</body>
</html>`;
}
