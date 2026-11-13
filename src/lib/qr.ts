import QRCode from "qrcode";

import { MAX_QR_PAYLOAD_BYTES, QR_MIN_PIXELS_PER_MODULE } from "./constants";

export type QrModuleStyle = "square" | "rounded" | "dots";
export type QrErrorCorrection = "L" | "M" | "Q" | "H";

export interface QrRenderOptions {
  color?: string;
  style?: QrModuleStyle;
  /** Quiet zone in modules. The standard minimum is4. */
  margin?: number;
  errorCorrectionLevel?: QrErrorCorrection;
  /**
   * Intrinsic raster size (px) for the SVG's width/height attributes. The
   * viewBox stays module-based, so this only sets the resolution the vector is
   * rasterised at.
   *
   * Rasterising at the final size instead of upscaling a small bitmap keeps
   * every module the same width. Nearest-neighbour upscaling of a symbol whose
   * module count does not divide the target size evenly gives some modules
   * 28px and their neighbours 29px, which reliably breaks decoding — observed
   * on a 65-module vCard exported at2048px.
   */
  pixelSize?: number;
}

/** Thrown when the payload cannot fit a QR symbol at the selected ECC level. */
export class QrCapacityError extends Error {
 readonly bytes: number;

 constructor(bytes: number) {
 super("qr-payload-too-long");
 this.name = "QrCapacityError";
 this.bytes = bytes;
 }
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
export const DEFAULT_QR_INK = "#1b1a17";

export function normalizeQrColor(color: string | undefined): string {
 return color && HEX_COLOR.test(color) ? color.toLowerCase() : DEFAULT_QR_INK;
}

export function countPayloadBytes(text: string): number {
 return new TextEncoder().encode(text).byteLength;
}

interface QrMatrix {
 size: number;
 isDark(x: number, y: number): boolean;
}

/**
 * Generate the module matrix. `mode: "byte"` is forced: the library's
 * auto-detection would pick kanji/Shift-JIS mode for CJK text and mangle the
 * UTF-8 payload.
 */
export function buildQrMatrix(text: string, options: QrRenderOptions = {}): QrMatrix {
 if (!text) throw new QrCapacityError(0);
 const bytes = countPayloadBytes(text);
 if (bytes > MAX_QR_PAYLOAD_BYTES) throw new QrCapacityError(bytes);

 let size: number;
 let data: Uint8Array;
 try {
 // Explicit byte segments: the library's auto-detection can pick kanji
 // (Shift-JIS) mode for CJK text, which mangles the UTF-8 payload.
 const qr = QRCode.create([{ mode: "byte", data: new TextEncoder().encode(text) }], {
 errorCorrectionLevel: options.errorCorrectionLevel ?? "M",
 });
 size = qr.modules.size;
 data = qr.modules.data;
 } catch {
 throw new QrCapacityError(bytes);
 }

 return {
 size,
 isDark(x: number, y: number): boolean {
 return data[y * size + x] ===1;
 },
 };
}

function isFinderZone(x: number, y: number, size: number): boolean {
 const top = y <7;
 const bottom = y >= size -7;
 const left = x <7;
 const right = x >= size -7;
 return (top && left) || (top && right) || (bottom && left);
}

/**
 * Render a QR symbol as a standalone SVG string.
 *
 * Three module treatments are offered; the three finder patterns are always
 * drawn as solid nested squares because rounded "eyes" measurably reduce
 * detection on cheap phone cameras.
 *
 * Module geometry is a scannability constraint, not a taste question: every
 * module is drawn at its full 1×1 cell so adjacent dark modules stay
 * contiguous. Shrinking the module (e.g. 0.9×) or rounding its corners hard
 * removes roughly a third of the ink, which drops the symbol below the
 * contrast adaptive binarisers need — verified with an independent decoder,
 * a 57-module vCard stopped decoding at 26% ink but decodes again at 35%.
 * `rounded` therefore keeps the full cell and rounds only the corners; `dots`
 * overlaps neighbouring circles slightly (r = 0.62) to restore contiguity.
 */
export function renderQrSvg(text: string, options: QrRenderOptions = {}): string {
  const matrix = buildQrMatrix(text, options);
  const style = options.style ?? "rounded";
  const color = normalizeQrColor(options.color);
  const margin = Math.max(0, Math.min(8, options.margin ?? 4));
  const total = matrix.size + margin * 2;
  // Default to12px per module; callers doing a raster export override this with
  // the exact target size so the vector is rasterised at final resolution.
  const outputSize = options.pixelSize ?? total * 12;

  const modules: string[] = [];
  const squarePath: string[] = [];

  for (let y = 0; y < matrix.size; y += 1) {
    for (let x = 0; x < matrix.size; x += 1) {
      if (!matrix.isDark(x, y) || isFinderZone(x, y, matrix.size)) continue;
      const px = x + margin;
      const py = y + margin;

      if (style === "square") {
        squarePath.push(["M", px, py, "h1", "v1", "h-1", "z"].join(" "));
      } else if (style === "rounded") {
        modules.push(`<rect x="${px}" y="${py}" width="1" height="1" rx="0.25"/>`);
      } else {
        modules.push(`<circle cx="${px + 0.5}" cy="${py + 0.5}" r="0.62"/>`);
      }
    }
  }

 const finder = (x: number, y: number) => {
 const ox = x + margin;
 const oy = y + margin;
 const radius = style === "square" ?0 :1.4;
 return [
 `<rect x="${ox}" y="${oy}" width="7" height="7" rx="${radius}" fill="${color}"/>`,
 `<rect x="${ox +1}" y="${oy +1}" width="5" height="5" rx="${radius *0.7}" fill="#ffffff"/>`,
 `<rect x="${ox +2}" y="${oy +2}" width="3" height="3" rx="${radius *0.4}" fill="${color}"/>`,
 ].join("");
 };

 const finders =
 finder(0,0) +
 finder(matrix.size -7,0) +
 finder(0, matrix.size -7);

 const body =
 style === "square"
 ? `<path d="${squarePath.join(" ")}" fill="${color}"/>`
 : `<g fill="${color}">${modules.join("")}</g>`;

 const rendering = style === "square" ? "crispEdges" : "geometricPrecision";
 const viewBox = [0,0, total, total].join(" ");

 return [
 // A stable class on the root gives print CSS and tests something to target
 // (borrowed from rclement/business-card-generator's svgclass).
 `<svg xmlns="http://www.w3.org/2000/svg" class="svc-qr" width="${outputSize}" height="${outputSize}" viewBox="${viewBox}" shape-rendering="${rendering}" role="img" aria-label="QR code">`,
 `<rect width="${total}" height="${total}" fill="#ffffff"/>`,
 body,
 finders,
 "</svg>",
 ].join("");
}

/** Wrap SVG markup in a data URL usable as `<img src>`. */
export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Total modules including the quiet zone, for a given payload and margin. */
export function qrTotalModules(text: string, options: QrRenderOptions = {}): number {
  const margin = Math.max(0, Math.min(8, options.margin ?? 4));
  return buildQrMatrix(text, options).size + margin * 2;
}

/**
 * The raster size a PNG export will actually use for `pixelSize`.
 *
 * Exported separately from `renderQrPng` so the caller (and tests) can reason
 * about the density floor without a DOM/canvas.
 */
export function resolvePngRasterSize(
  text: string,
  options: QrRenderOptions,
  pixelSize: number,
): { size: number; raised: boolean } {
  const requested = Math.max(128, Math.min(4096, Math.round(pixelSize)));
  const scannable = qrTotalModules(text, options) * QR_MIN_PIXELS_PER_MODULE;
  const size = Math.min(4096, Math.max(requested, scannable));
  return { size, raised: size > requested };
}

export interface QrPngResult {
  dataUrl: string;
  /** The raster size actually used, which may exceed the requested one. */
  size: number;
  /** True when `size` was raised above the requested size to stay scannable. */
  raised: boolean;
}

/**
 * Rasterise the generated SVG through a canvas. Returns a PNG data URL.
 * Only available in the browser; callers must handle the rejection.
 *
 * The SVG is rasterised at exactly `size`, so the canvas copy is 1:1 and no
 * resampling can make modules uneven.
 *
 * `size` is treated as a minimum: if the symbol is too dense to give every
 * module `QR_MIN_PIXELS_PER_MODULE` pixels, the raster is enlarged so the
 * export stays scannable. `raised` tells the caller to say so.
 */
export async function renderQrPng(
  text: string,
  options: QrRenderOptions,
  pixelSize: number,
): Promise<QrPngResult> {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    throw new Error("png-unavailable");
  }

  // Module count comes from the matrix, so it is known before rasterising.
  const { size, raised } = resolvePngRasterSize(text, options, pixelSize);

  const svg = renderQrSvg(text, { ...options, pixelSize: size });
  const url = svgToDataUrl(svg);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("png-render-failed"));
    image.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas-unavailable");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, size, size);

  return { dataUrl: canvas.toDataURL("image/png"), size, raised };
}
