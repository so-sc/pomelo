"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";

/**
 * Reads/writes list filter state in the URL. Every write drops `page`, so changing
 * a filter always lands on page 1 — keeping that here means no individual control
 * can forget it.
 */
export function useFilterParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const inFlight = useRef<{ from: string; to: string } | null>(null);

  const get = (key: string) => searchParams.get(key) ?? "";

  const set = (patch: Record<string, string | undefined>, replace = false) => {
    // Debounced callers run after later renders, so this render's searchParams can be stale,
    // and the address bar only updates once a navigation lands. Build on our own pending
    // navigation while it is in flight, or a second filter would undo the first.
    const live = window.location.search.replace(/^\?/, "");
    const base = inFlight.current?.from === live ? inFlight.current.to : live;
    const params = new URLSearchParams(base);

    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");

    const query = params.toString();
    inFlight.current = { from: live, to: query };
    const url = query ? `${pathname}?${query}` : pathname;

    // replace for debounced typing so each keystroke doesn't become a history entry.
    startTransition(() => (replace ? router.replace(url) : router.push(url)));
  };

  return { get, set, pending };
}
