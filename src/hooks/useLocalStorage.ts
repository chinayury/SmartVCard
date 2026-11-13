import { useCallback, useEffect, useState } from "react";

/**
 * Persist state in localStorage.
 *
 * `sanitize` is applied both to the stored value on read and to every write, so
 * a draft written by an older schema (or edited by hand) can never crash the
 * form. Storage errors (quota, private mode) are swallowed: the app keeps
 * working in memory.
 */
export function useLocalStorage<T>(
  key: string,
  initial: T,
  sanitize?: (raw: unknown, fallback: T) => T,
) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return initial;
      const parsed: unknown = JSON.parse(raw);
      return sanitize ? sanitize(parsed, initial) : (parsed as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota / serialisation errors
    }
  }, [key, value]);

  // Keep two open tabs in sync.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key || event.newValue === null) return;
      try {
        const parsed: unknown = JSON.parse(event.newValue);
        setValue(sanitize ? sanitize(parsed, initial) : (parsed as T));
      } catch {
        // ignore malformed payloads from other tabs
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // `initial` is a module-level constant in every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /**
   * Stable identity across renders.
   *
   * A caller that puts this setter in a `useEffect` dependency array would
   * otherwise re-run that effect on every render: the setter recreated itself
   * each render, so the effect saw a "changed" dependency, wrote state, which
   * re-rendered, which produced a new setter — an unbounded write/render loop
   * that fired every ~1.2s for as long as the page stayed open.
   */
  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(previous) : next;
        return sanitize ? sanitize(resolved, initial) : resolved;
      });
    },
    // `sanitize` and `initial` are module-level constants at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return [value, update] as const;
}
