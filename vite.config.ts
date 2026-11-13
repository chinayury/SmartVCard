import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Content-Security-Policy is injected into the production HTML only. It is a
 * defence-in-depth layer: the app has no inline scripts, no third-party
 * requests, and all images are either bundled, data URLs or user-supplied
 * https images.
 */
function contentSecurityPolicy(): Plugin {
 const policy = [
 "default-src 'self'",
 "script-src 'self'",
 "style-src 'self' 'unsafe-inline'",
 "img-src 'self' data: blob: https:",
 "font-src 'self' data:",
 "connect-src 'self'",
 "worker-src 'self' blob:",
 "manifest-src 'self'",
 "base-uri 'self'",
 "form-action 'self'",
 "object-src 'none'",
 "frame-src 'none'",
 ].join("; ");

 return {
 name: "smart-vcard-csp",
 apply: "build",
 transformIndexHtml() {
 return [
 {
 tag: "meta",
 attrs: { "http-equiv": "Content-Security-Policy", content: policy },
 injectTo: "head-prepend",
 },
 ];
 },
 };
}

// https://vite.dev/config/
export default defineConfig({
 plugins: [
 react(),
 tailwindcss(),
 contentSecurityPolicy(),
 VitePWA({
 registerType: "autoUpdate",
 injectRegister: false,
 includeAssets: ["favicon.svg", "robots.txt", "icons/apple-touch-icon.png"],
 manifest: {
 id: "./",
 name: "Smart VCard · Indigo Grid Edition",
 short_name: "Smart VCard",
 description: "Local-first bilingual vCard QR studio. Scan, save, print.",
 lang: "zh-CN",
 dir: "ltr",
 theme_color: "#2b4acb",
 background_color: "#f4f6fa",
 display: "standalone",
 orientation: "portrait",
 scope: "./",
 start_url: "./",
 categories: ["business", "productivity", "utilities"],
 icons: [
 { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
 { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
 { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
 { src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
 ],
 shortcuts: [
 {
 name: "Open the studio",
 short_name: "Studio",
 url: "./#/generator",
 icons: [{ src: "icons/icon-192.png", sizes: "192x192" }],
 },
 {
 name: "About the tool",
 short_name: "About",
 url: "./#/about",
 },
 ],
 },
 workbox: {
 globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
 navigateFallback: "index.html",
 cleanupOutdatedCaches: true,
 },
 devOptions: {
 enabled: false,
 },
 }),
 ],
 base: "./",
});
