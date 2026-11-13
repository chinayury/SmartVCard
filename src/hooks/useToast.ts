import { useContext } from "react";

import { ToastContext, type ToastApi } from "../lib/toastContext";

const NOOP: ToastApi = { push: () => undefined };

/** Access the toast queue. Safe to call outside a provider (no-op). */
export function useToast(): ToastApi {
 return useContext(ToastContext) ?? NOOP;
}
