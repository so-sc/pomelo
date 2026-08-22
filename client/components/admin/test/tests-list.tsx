"use client";

import React from "react";
import { TestHeader } from "@/components/admin/test/header";
import { TestCard } from "@/components/admin/test/test-card";
import { EmptyState } from "@/components/admin/empty-placeholder";
import { TestFilterBar } from "@/components/admin/test/test-filter-bar";
import { Pagination } from "@/components/admin/pagination";
import { useFilterParams } from "@/hooks/use-filter-params";
import { cn } from "@/lib/utils";

export interface MongoTestContent {
  id?: string;
  _id?: string;
  title: string;
  description: string;
  startsAt?: string;
  startTime?: string;
  endsAt?: string;
  endTime?: string;
  status?: string;
  problemCount?: number;
  questions?: unknown[];
  participants?: number;
  participantsInProgress?: number;
  participantsCompleted?: number;
  joinId?: string;
  createdAt?: string;
  duration?: string;
  durationMinutes?: number;
}

interface Props {
  initialTests: MongoTestContent[];
  total: number;
  page: number;
  search: string;
  status: string;
  from: string;
  to: string;
}

const PAGE_SIZE = 12;

export function TestsList({ initialTests, total, page, search, status, from, to }: Props) {
  const { pending } = useFilterParams();

  // Map mongo objects to the shape TestCard expects. Order comes from the
  // server (createdAt desc) — reversing here would only reverse one page.
  const tests = initialTests.map(t => {
    const totalMinutes = t.durationMinutes || 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    let durationStr = "";
    if (hours > 0) durationStr += `${hours}h `;
    if (minutes > 0) durationStr += `${minutes}m `;
    if (!durationStr) durationStr = "0m";

    return {
      id: (t.id || t._id || '') as string,
      title: t.title,
      description: t.description,
      status: (t.status || 'waiting') as "waiting" | "ongoing" | "completed",
      // Map other fields as necessary for TestCard
      questions: t.problemCount || t.questions?.length || 0,
      totalQuestions: t.problemCount || t.questions?.length || 0,
      problems: (t.questions || []) as string[],
      duration: t.duration || durationStr.trim(),
      startsAt: t.startsAt || t.startTime || '',
      endsAt: t.endsAt || t.endTime || '',
       participantsInProgress: t.participantsInProgress ?? t.participants ?? 0,
       participantsCompleted: t.participantsCompleted ?? 0,
       joinId: t.joinId || '',
      createdAt: t.createdAt || '',
    };
  });

  const isFiltered = Boolean(search || status || from || to);

  return (
    <div className="h-full w-full overflow-y-scroll">
      <div className="max-w-none w-full p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        <TestHeader />

        <TestFilterBar search={search} status={status} from={from} to={to} />

        <div className={cn("space-y-6", pending && "opacity-60 transition-opacity")}>
          {tests.length > 0 ? (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {tests.map((test) => (
                <TestCard key={test.id} test={test} />
              ))}
            </div>
          ) : (
            <EmptyState
              searchTerm={isFiltered ? search || "filter" : ""}
              title="No tests found"
              entityName="test"
              createUrl="/admin/tests/new/edit"
              createLabel="Create Your First Test"
            />
          )}

          <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
        </div>
      </div>
    </div>
  );
}
