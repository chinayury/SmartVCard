import { sanitizeFilename } from "./text";

/** Trigger a browser download for a blob with a safe filename. */
export function downloadBlob(blob: Blob, filename: string): void {
 const url = URL.createObjectURL(blob);
 triggerDownload(url, sanitizeFilename(filename));
 // Revoke after the browser has had time to start the download.
 setTimeout(() => URL.revokeObjectURL(url),1000);
}

export function downloadText(
 content: string,
 filename: string,
 mime = "text/plain;charset=utf-8",
): void {
 downloadBlob(new Blob([content], { type: mime }), filename);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
 triggerDownload(dataUrl, sanitizeFilename(filename));
}

export function downloadSvg(svg: string, filename: string): void {
 downloadText(svg, filename, "image/svg+xml;charset=utf-8");
}

function triggerDownload(url: string, filename: string): void {
 const anchor = document.createElement("a");
 anchor.href = url;
 anchor.download = filename;
 anchor.rel = "noopener";
 anchor.style.display = "none";
 document.body.appendChild(anchor);
 anchor.click();
 document.body.removeChild(anchor);
}

/**
 * Copy text with a graceful fallback for browsers without the async clipboard
 * API (or non-secure contexts). Returns whether anything was copied.
 */
export async function copyText(text: string): Promise<boolean> {
 try {
 if (navigator.clipboard?.writeText) {
 await navigator.clipboard.writeText(text);
 return true;
 }
 } catch {
 // fall through to the legacy path
 }

 try {
 const area = document.createElement("textarea");
 area.value = text;
 area.setAttribute("readonly", "");
 area.style.position = "fixed";
 area.style.top = "-1000px";
 area.style.opacity = "0";
 document.body.appendChild(area);
 area.select();
 const copied = document.execCommand("copy");
 document.body.removeChild(area);
 return copied;
 } catch {
 return false;
 }
}

/**
 * Copy an image data URL to the clipboard as PNG — borrowed from
 * open-qr/openqr's export bar: one click puts the QR straight into WeChat,
 * a mail client or a document. Returns false when the browser has no
 * image-capable clipboard (then the caller falls back to a download).
 */
export async function copyImageDataUrl(dataUrl: string): Promise<boolean> {
 try {
 if (!navigator.clipboard || typeof ClipboardItem === "undefined") return false;
 const response = await fetch(dataUrl);
 const blob = await response.blob();
 await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
 return true;
 } catch {
 return false;
 }
}

/** Print only the finished card (the print stylesheet hides everything else). */
export function printCard(): void {
 window.print();
}
