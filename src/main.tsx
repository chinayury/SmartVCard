import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { UnheadProvider, createHead } from "@unhead/react/client";
import { HashRouter } from "react-router-dom";

import "./index.css";
import "./i18n";
import App from "./App.tsx";
import { ToastHost } from "./components/ToastHost";
import { APP_VERSION } from "./lib/version";

if (import.meta.env.PROD) {
 import("virtual:pwa-register")
 .then(({ registerSW }) => registerSW({ immediate: true }))
 .catch(() => {
 /* offline support is optional */
 });
}

const head = createHead();

/** Last-resort overlay: a render crash must never leave a blank page. */
function showFatal(error: unknown) {
 const root = document.getElementById("root");
 if (!root) return;
 const panel = document.createElement("pre");
 panel.style.cssText =
 "position:fixed;inset:0;margin:0;padding:32px;background:#16213a;color:#f4f6fa;" +
 "font:13px/1.6 ui-monospace,Consolas,monospace;white-space:pre-wrap;overflow:auto;z-index:99999;";
 panel.textContent = `[Smart VCard ${APP_VERSION}] Render failed\n\n${
 error instanceof Error ? error.stack ?? error.message : String(error)
 }`;
 root.replaceChildren(panel);
}

window.addEventListener("error", (event) => showFatal(event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => showFatal(event.reason));

try {
 createRoot(document.getElementById("root")!).render(
 <StrictMode>
 <UnheadProvider value={head}>
 <ToastHost>
 <HashRouter>
 <App />
 </HashRouter>
 </ToastHost>
 </UnheadProvider>
 </StrictMode>,
 );
} catch (error) {
 showFatal(error);
}
