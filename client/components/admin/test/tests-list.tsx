"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { TestHeader } from "@/components/admin/test/header";
import { TestCard } from "@/components/admin/test/test-card";
import { EmptyState } from "@/components/admin/empty-placeholder";

interface Props {
  initialTests: any[];
}

export function TestsList({ initialTests }: Props) {
  const [searchTerm, setSearchTerm] = useState("");

  // Map mongo objects if needed or assume they match what TestCard expects
  // TestCard expects 'Test' type. We might need mapping.
  // Map mongo objects if needed or assume they match what TestCard expects
  // TestCard expects 'Test' type. We might need mapping.
  const tests = initialTests.map(t => ({
    id: t.id || t._id,
    title: t.title,
    description: t.description,
    status: t.status || 'waiting',
    // Map other fields as necessary for TestCard
    questions: t.problemCount || t.questions?.length || 0,
    totalQuestions: t.problemCount || t.questions?.length || 0,
    problems: t.questions || [],
    duration: t.duration || "0",
    startsAt: t.startsAt || t.startTime,
    participantsInProgress: t.participants || 0,
    participantsCompleted: 0,
    createdAt: t.createdAt,
  }));

  const filteredTests = tests.filter(
    (test) =>
      test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full w-full overflow-y-scroll">
      <div className="max-w-none w-full p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        <TestHeader />

        <div className="max-w-full sm:max-w-lg">
          <Input
            placeholder="Search tests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-input border-border"
          />
        </div>

        {filteredTests.length > 0 ? (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {filteredTests.map((test) => (
              <TestCard key={test.id} test={test} />
            ))}
          </div>
        ) : (
          <EmptyState
            searchTerm={searchTerm}
            title="No tests found"
            entityName="test"
            createUrl="/admin/tests/new/edit"
            createLabel="Create Your First Test"
          />
        )}
      </div>
    </div>
  );
}
