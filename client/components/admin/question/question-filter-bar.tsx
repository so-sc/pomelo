"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface QuestionFilters {
  search: string;
  type: string;
  difficulty: string;
}

interface Props extends QuestionFilters {
  onChange: (patch: Partial<QuestionFilters>) => void;
}

/**
 * Presentational only — callers own the state, so the same bar drives the
 * in-memory picker in the test form and the URL-backed questions list.
 */
export function QuestionFilterBar({ search, type, difficulty, onChange }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Input
        placeholder="Search questions..."
        value={search}
        onChange={(e) => onChange({ search: e.target.value })}
        className="bg-input border-border flex-1"
      />
      <Select value={type || "all"} onValueChange={(value) => onChange({ type: value })}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Filter by Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="mcq">MCQ</SelectItem>
          <SelectItem value="coding">Coding</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={difficulty || "all"}
        onValueChange={(value) => onChange({ difficulty: value })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Filter by Difficulty" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="easy">Easy</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="hard">Hard</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
