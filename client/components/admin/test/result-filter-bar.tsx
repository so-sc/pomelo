"use client";

import { useEffect, useRef, useState } from "react";
import { useFilterParams } from "@/hooks/use-filter-params";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface ResultFilterBarProps {
  maxScore: number;
}

const toNum = (s: string) => (s === "" ? NaN : Number(s));
const numOrEmpty = (n: number) => (Number.isFinite(n) ? String(n) : "");

export function ResultFilterBar({ maxScore }: ResultFilterBarProps) {
  const { get, set, pending } = useFilterParams();

  // Coerce missing params to "" so an absent URL param can never put
  // undefined into a value prop (that silently flips the input to
  // uncontrolled mid-session and desyncs the caret).
  const q = get("q") || "";
  const scoreMin = get("scoreMin") || "";
  const scoreMax = get("scoreMax") || "";
  const date = get("date") || "";
  const sort = get("sort") || "";

  // Local, debounced mirrors of the URL params. Render-time sync resets them
  // only when the URL changed by something other than our own push.
  const [searchInput, setSearchInput] = useState(q);
  const [seenQ, setSeenQ] = useState(q);
  const [lastPushedQ, setLastPushedQ] = useState(q);

  const [minInput, setMinInput] = useState(scoreMin);
  const [seenMin, setSeenMin] = useState(scoreMin);
  const [lastPushedMin, setLastPushedMin] = useState(scoreMin);

  const [maxInput, setMaxInput] = useState(scoreMax);
  const [seenMax, setSeenMax] = useState(scoreMax);
  const [lastPushedMax, setLastPushedMax] = useState(scoreMax);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (q !== seenQ) {
    setSeenQ(q);
    if (q !== lastPushedQ) setSearchInput(q);
  }
  if (scoreMin !== seenMin) {
    setSeenMin(scoreMin);
    if (scoreMin !== lastPushedMin) setMinInput(scoreMin);
  }
  if (scoreMax !== seenMax) {
    setSeenMax(scoreMax);
    if (scoreMax !== lastPushedMax) setMaxInput(scoreMax);
  }

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (minTimer.current) clearTimeout(minTimer.current);
      if (maxTimer.current) clearTimeout(maxTimer.current);
    };
  }, []);

  // Focus management lives entirely in <SearchFocusKeeper /> at the page
  // level. Do NOT add onBlur-based focus logic here - blur fires during
  // focus theft too, and disarming on it is what broke backspace.

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const t = value.trim();
      setLastPushedQ(t);
      set({ q: t || undefined }, true);
    }, 400);
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMinInput(value);
    if (minTimer.current) clearTimeout(minTimer.current);
    minTimer.current = setTimeout(() => {
      const n = toNum(value);
      const pushed = numOrEmpty(n);
      setLastPushedMin(pushed);
      set({ scoreMin: pushed || undefined }, true);
    }, 400);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMaxInput(value);
    if (maxTimer.current) clearTimeout(maxTimer.current);
    maxTimer.current = setTimeout(() => {
      const n = toNum(value);
      const pushed = numOrEmpty(n);
      setLastPushedMax(pushed);
      set({ scoreMax: pushed || undefined }, true);
    }, 400);
  };

  const updateParam = (key: string, value: string, defaultValue: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const t = searchInput.trim();
    setLastPushedQ(t);
    set({ [key]: value === defaultValue ? undefined : value, q: t || undefined });
  };

  const clearFilters = () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (minTimer.current) clearTimeout(minTimer.current);
    if (maxTimer.current) clearTimeout(maxTimer.current);
    setSearchInput("");
    setLastPushedQ("");
    setMinInput("");
    setLastPushedMin("");
    setMaxInput("");
    setLastPushedMax("");
    set({
      q: undefined,
      scoreMin: undefined,
      scoreMax: undefined,
      date: undefined,
      sort: undefined,
    });
  };

  const hasActiveFilters = !!(q || scoreMin || scoreMax || date || sort);

  return (
    <div className={`flex flex-col gap-4 transition-opacity ${pending ? "opacity-50" : ""}`}>
      <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-sm space-y-2">
          <label
            htmlFor="result-search"
            className="block text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground"
          >
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="result-search"
              placeholder="Name or email..."
              value={searchInput}
              onChange={handleSearchChange}
              autoComplete="off"
              spellCheck={false}
              className="pl-8"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="score-min"
            className="block text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground"
          >
            Min score
          </label>
          <Input
            id="score-min"
            type="number"
            min={0}
            max={maxScore}
            placeholder="0"
            value={minInput}
            onChange={handleMinChange}
            autoComplete="off"
            className="w-24"
            aria-label="Minimum score"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="score-max"
            className="block text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground"
          >
            Max score
          </label>
          <Input
            id="score-max"
            type="number"
            min={0}
            max={maxScore}
            placeholder={String(maxScore)}
            value={maxInput}
            onChange={handleMaxChange}
            autoComplete="off"
            className="w-24"
            aria-label="Maximum score"
          />
        </div>

        <div className="space-y-2 w-full sm:w-[160px]">
          <label
            htmlFor="date-select"
            className="block text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground"
          >
            Date
          </label>
          <Select value={date || "any"} onValueChange={(v) => updateParam("date", v, "any")}>
            <SelectTrigger id="date-select" className="w-full">
              <SelectValue placeholder="Any time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any time</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 w-full sm:w-[160px]">
          <label
            htmlFor="sort-select"
            className="block text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground"
          >
            Sort by
          </label>
          <Select value={sort || "highest"} onValueChange={(v) => updateParam("sort", v, "highest")}>
            <SelectTrigger id="sort-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="highest">Highest score</SelectItem>
              <SelectItem value="lowest">Lowest score</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <div className="self-end">
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
              <X className="mr-2 h-4 w-4" />
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
