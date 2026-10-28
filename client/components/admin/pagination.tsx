"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PAGE_SIZE = 20;

interface Props {
  page: number;
  total: number;
  pageSize?: number;
  pageParam?: string;
}

export function Pagination({ page, total, pageSize = PAGE_SIZE, pageParam = "page" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  // An out-of-range ?page= still renders the last page, so label it as that.
  const current = Math.min(page, pages);

  const goTo = (next: number) => {
    const params = new URLSearchParams(searchParams);
    if (next <= 1) params.delete(pageParam);
    else params.set(pageParam, String(next));

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <span className="text-sm text-muted-foreground">{total} total</span>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goTo(current - 1)}
          disabled={current <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <span className="text-sm text-muted-foreground tabular-nums">
          Page {current} of {pages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => goTo(current + 1)}
          disabled={current >= pages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
