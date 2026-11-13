/**
 * Vector PDF export for the QR symbol.
 *
 * Borrowed from open-qr/openqr's svgToPdf: the QR SVG is converted straight
 * into a vector PDF, which is what print shops ask for — a raster PNG loses
 * edges at any size they blow it up to.
 *
 * Both libraries are heavy, so they are dynamically imported: the first paint
 * bundle never pays for them, and they load only when the user actually asks
 * for a PDF.
 */

/** A6 in millimetres — the same sheet the print stylesheet targets. */
const PAGE_WIDTH_MM = 105;
const PAGE_HEIGHT_MM = 148;

export interface CardPdfResult {
 blob: Blob;
 /** Millimetre edge of the square QR plate drawn on the page. */
 plateMm: number;
}

export async function renderCardPdf(svg: string): Promise<CardPdfResult> {
 const [{ jsPDF }, { svg2pdf }] = await Promise.all([import("jspdf"), import("svg2pdf.js")]);

 const pdf = new jsPDF({ unit: "mm", format: [PAGE_WIDTH_MM, PAGE_HEIGHT_MM], orientation: "portrait" });

 // Parse the standalone SVG markup into an element svg2pdf can walk.
 const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
 const element = parsed.documentElement as unknown as SVGSVGElement;
 if (!element || parsed.getElementsByTagName("parsererror").length > 0) {
 throw new Error("pdf-svg-parse-failed");
 }

 // Leave a 10mm margin on every side; the QR plate itself is square.
 const plateMm = Math.min(PAGE_WIDTH_MM, PAGE_HEIGHT_MM) - 20;
 await svg2pdf(element, pdf, {
 x: (PAGE_WIDTH_MM - plateMm) / 2,
 y: (PAGE_HEIGHT_MM - plateMm) / 2,
 width: plateMm,
 height: plateMm,
 });

 return { blob: pdf.output("blob"), plateMm };
}
