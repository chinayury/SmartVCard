import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ToastContext, type ToastApi } from "../lib/toastContext";

/**
 * Renders the single live toast used across the app. Messages are polite
 * status updates, so they never steal focus.
 */
export function ToastHost({ children }: { children: ReactNode }) {
 const [message, setMessage] = useState<string | null>(null);
 const timer = useRef<number | null>(null);

 const push = useCallback((next: string) => {
 if (timer.current !== null) window.clearTimeout(timer.current);
 setMessage(next);
 timer.current = window.setTimeout(() => {
 setMessage(null);
 timer.current = null;
 }, 2600);
 }, []);

 useEffect(
 () => () => {
 if (timer.current !== null) window.clearTimeout(timer.current);
 },
 [],
 );

 const api = useMemo<ToastApi>(() => ({ push }), [push]);

 return (
 <ToastContext.Provider value={api}>
 {children}
 <div
 aria-live="polite"
 aria-atomic="true"
 className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
 >
 {message && (
 <div className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-ink px-4 py-2.5 text-[13px] font-medium text-white shadow-raise">
 <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo" aria-hidden="true" />
 {message}
 </div>
 )}
 </div>
 </ToastContext.Provider>
 );
}
