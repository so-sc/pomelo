"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilterParams } from "@/hooks/use-filter-params";

interface Props {
  search: string;
  status: string;
  from: string;
  to: string;
}

export function TestFilterBar({ search, status, from, to }: Props) {
  const { set } = useFilterParams();
  const [term, setTerm] = useState(search);

  // Debounced into the URL with replace, so typing doesn't fill the history stack.
  useEffect(() => {
    if (term === search) return;
    const timer = setTimeout(() => set({ q: term || undefined }, true), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  useEffect(() => setTerm(search), [search]);

  const dateClass =
    "bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground";

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Input
        placeholder="Search tests..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="bg-input border-border flex-1"
      />
      <Select
        value={status || "all"}
        onValueChange={(value) => set({ status: value === "all" ? undefined : value })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Filter by Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="waiting">Waiting</SelectItem>
          <SelectItem value="ongoing">Active</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>
      <input
        type="date"
        aria-label="Starts on or after"
        value={from}
        onChange={(e) => set({ from: e.target.value || undefined })}
        className={dateClass}
      />
      <input
        type="date"
        aria-label="Starts on or before"
        value={to}
        onChange={(e) => set({ to: e.target.value || undefined })}
        className={dateClass}
      />
    </div>
  );
}
