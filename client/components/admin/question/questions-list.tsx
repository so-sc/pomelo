"use client";

import React, { useEffect, useState } from "react";
import { EmptyState } from "@/components/admin/empty-placeholder";
import { QuestionHeader } from "@/components/admin/question/header";
import QuestionCard from "@/components/admin/question/question-card";
import { QuestionFilterBar } from "@/components/admin/question/question-filter-bar";
import { Pagination, PAGE_SIZE } from "@/components/admin/pagination";
import { useFilterParams } from "@/hooks/use-filter-params";
import { cn } from "@/lib/utils";

import { BaseProblem } from "@/types/problem/problem.types";

interface Props {
  questions: BaseProblem[];
  total: number;
  page: number;
  search: string;
  type: string;
  difficulty: string;
}

export function QuestionsList({ questions, total, page, search, type, difficulty }: Props) {
  const { set, pending } = useFilterParams();
  const [term, setTerm] = useState(search);

  // Debounce typing into the URL; replace (not push) so each keystroke isn't
  // a history entry. Skipped when term already matches the committed value,
  // so the server round-trip doesn't re-fire this.
  useEffect(() => {
    if (term === search) return;
    const timer = setTimeout(() => set({ q: term || undefined }, true), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  useEffect(() => setTerm(search), [search]);

  const isFiltered = Boolean(search || type || difficulty);

  return (
    <div className="h-full w-full overflow-y-scroll">
      <div className="max-w-none w-full p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        <QuestionHeader />

        <QuestionFilterBar
          search={term}
          type={type}
          difficulty={difficulty}
          onChange={(patch) => {
            if (patch.search !== undefined) {
              setTerm(patch.search);
              return;
            }
            set({
              type: patch.type === "all" ? undefined : patch.type,
              difficulty: patch.difficulty === "all" ? undefined : patch.difficulty,
            });
          }}
        />

        <div className={cn("space-y-6", pending && "opacity-60 transition-opacity")}>
          {questions.length > 0 ? (
            <div className="space-y-3">
              {questions.map((problem) => (
                <QuestionCard
                  key={problem._id || problem.id}
                  problem={{ ...problem, id: problem._id || problem.id }}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              searchTerm={isFiltered ? search || "filter" : ""}
              title="No questions found"
              entityName="question"
              createUrl="/admin/questions"
              createLabel="Create Your First Question"
            />
          )}

          <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
        </div>
      </div>
    </div>
  );
}
