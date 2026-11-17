import { useEffect, useState } from "react";

import {
 QrCapacityError,
 countPayloadBytes,
 renderQrSvg,
 svgToDataUrl,
 type QrModuleStyle,
} from "../lib/qr";

export type QrPreviewStatus = "empty" | "ready" | "too-long" | "error";

export interface QrPreviewState {
 src: string | null;
 status: QrPreviewStatus;
 bytes: number;
}

/**
 * Render the QR preview with a short debounce. Generation is synchronous but
 * cheap; the debounce only exists to avoid re-encoding while the user types.
 *
 * All failures are captured and surfaced as a status — the previous
 * implementation used `void promise.then(...)`, so an over-capacity payload
 * became an unhandled rejection and the global error overlay took over the
 * page.
 */
export function useQrPreview(
 payload: string | null,
 color: string,
 style: QrModuleStyle,
 errorCorrectionLevel: "L" | "M" | "Q" | "H" = "M",
 debounceMs =220,
): QrPreviewState {
 const [state, setState] = useState<QrPreviewState>({ src: null, status: "empty", bytes:0 });

 useEffect(() => {
 if (!payload) {
 setState({ src: null, status: "empty", bytes:0 });
 return;
 }

 let cancelled = false;
 const timer = window.setTimeout(() => {
 try {
 const svg = renderQrSvg(payload, { color, style, margin:4, errorCorrectionLevel });
 if (cancelled) return;
 setState({
 src: svgToDataUrl(svg),
 status: "ready",
 bytes: countPayloadBytes(payload),
 });
 } catch (error) {
 if (cancelled) return;
 setState({
 src: null,
 status: error instanceof QrCapacityError ? "too-long" : "error",
 bytes: countPayloadBytes(payload),
 });
 }
 }, debounceMs);

 return () => {
 cancelled = true;
 window.clearTimeout(timer);
 };
 }, [payload, color, style, errorCorrectionLevel, debounceMs]);

 return state;
}
