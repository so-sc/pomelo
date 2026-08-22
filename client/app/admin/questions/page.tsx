import type { Metadata } from "next";
import React from "react";
import { db } from "@/lib/db";
import { QuestionsList } from "@/components/admin/question/questions-list";
import { PAGE_SIZE } from "@/components/admin/pagination";

import { BaseProblem } from "@/types/problem/problem.types";

export const metadata: Metadata = {
  title: "Manage Questions",
  description: "View, edit, and create coding or multiple choice questions on Pomelo.",
};

export const dynamic = "force-dynamic";

// The URL carries lowercase values (matching the Select options); Mongo stores
// difficulty capitalised.
const DIFFICULTIES: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminQuestionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.q || "";
  const type = params.type && params.type !== "all" ? params.type : "";
  const difficulty =
    params.difficulty && params.difficulty !== "all" ? params.difficulty : "";

  const filter: Record<string, unknown> = {};
  if (type) filter.type = type;
  if (DIFFICULTIES[difficulty]) filter.difficulty = DIFFICULTIES[difficulty];

  let questions: BaseProblem[] = [];
  let total = 0;
  try {
    // Projection matters: without it every question's embedded testcases[] ships
    // to the browser just to render a summary card.
    const result = await db.findPage<BaseProblem>("questions", filter, {
      projection: {
        title: 1,
        description: 1,
        type: 1,
        difficulty: 1,
        marks: 1,
        questionType: 1,
      },
      sort: { createdAt: -1 },
      limit: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      search,
    });
    questions = result.data;
    total = result.total;
  } catch {
    // ignore
  }

  return (
    <QuestionsList
      questions={questions}
      total={total}
      page={page}
      search={search}
      type={type}
      difficulty={difficulty}
    />
  );
}
