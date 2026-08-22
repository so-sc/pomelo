"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

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

  const get = (key: string) => searchParams.get(key) ?? "";

  const set = (patch: Record<string, string | undefined>, replace = false) => {
    const params = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");

    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;

    // replace for debounced typing so each keystroke doesn't become a history entry.
    startTransition(() => (replace ? router.replace(url) : router.push(url)));
  };

  return { get, set, pending };
}
