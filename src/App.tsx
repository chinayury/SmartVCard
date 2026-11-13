import { lazy, Suspense } from "react";
import { Route, Routes, useSearchParams } from "react-router-dom";

import Layout from "./components/Layout";

// Route-level code splitting keeps the first paint small; the PWA precaches
// every chunk for offline use.
const Home = lazy(() => import("./pages/Home"));
const Generator = lazy(() => import("./pages/Generator"));
const About = lazy(() => import("./pages/About"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PublicCardView = lazy(() => import("./pages/PublicCardView"));

/**
 * `#/?v=…` is a shared card. The parameter is read from the router first and
 * from the raw query string second, because links created before v0.1.0 put
 * `?v=` before the hash.
 */
function IndexOrShare() {
 const [params] = useSearchParams();
 const fromRouter = params.get("v");
 const legacy =
 typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("v");
 const encoded = fromRouter ?? legacy;

 if (encoded) return <PublicCardView encoded={encoded} />;
 return <Home />;
}

function RouteFallback() {
 return (
 <div className="shell py-24" aria-busy="true" aria-live="polite">
 <span className="sr-only">Loading</span>
 <div className="h-3 w-28 bg-line" />
 <div className="mt-4 h-8 w-64 bg-line/70" />
 </div>
 );
}

export function App() {
 return (
 <Suspense fallback={<RouteFallback />}>
 <Routes>
 <Route path="/" element={<Layout />}>
 <Route index element={<IndexOrShare />} />
 <Route path="generator" element={<Generator />} />
 <Route path="about" element={<About />} />
 <Route path="*" element={<NotFound />} />
 </Route>
 </Routes>
 </Suspense>
 );
}

export default App;
