import React from "react";
import { notFound } from "next/navigation";
import { TestDetailHeader } from "@/components/admin/test/test-detail/header";
import { TestInformationCard } from "@/components/admin/test/test-detail/test-card";
import { ParticipationStatisticsCard } from "@/components/admin/test/test-detail/participation-card";
import { QuickActionsCard } from "@/components/admin/test/test-detail/actions-card";
import TestEditQuestions from "@/components/admin/test/questions-list";
import { db } from "@/lib/db";
import { Test } from "@/types/test/test.types";

export const dynamic = "force-dynamic";

interface IdParams {
  id: string;
}

export default async function AdminTestDetailPage({
  params,
}: {
  params: Promise<IdParams>;
}) {
  const { id } = await params;
  let test = null;

  try {
    const data = await db.findOne<Record<string, unknown>>("contests", { _id: id });
    // Fetch submissions to calculate stats
    const submissions = await db.find<Record<string, unknown>>("submissions", { contest: id }) || [];
    
    // Calculate stats
    const totalParticipants = submissions.length;
    const completed = submissions.filter(s => s.status === 'Completed').length;
    const inProgress = totalParticipants - completed;

    if (data) {
      const startTime = data.startTime as string;
      const endTime = data.endTime as string;
      const start = new Date(startTime);
      const end = new Date(endTime);
      const durationMinutes = (data.durationMinutes as number) || 0;
      const h = Math.floor(durationMinutes / 60);
      const m = durationMinutes % 60;

      // Dynamic stats
      const now = new Date();
      let computedStatus: "waiting" | "ongoing" | "completed" = "waiting";
      
      const manualStatus = ((data.status as string) || "").toLowerCase();
      if (manualStatus === "completed" || manualStatus === "ended" || now > end) {
        computedStatus = "completed";
      } else if (now >= start && now <= end) {
        computedStatus = "ongoing";
      }

      test = {
        id: data._id as string,
        title: data.title as string,
        description: data.description as string,
        duration: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        startsAt: startTime,
        endsAt: endTime,
        problems: ((data.questions as Record<string, unknown>[]) || []).map((q) => ({
          ...q,
          id: (q?._id as string) ?? (q?.id as string),
        })),
        status: computedStatus,
        participantsInProgress: inProgress,
        participantsCompleted: completed,
        totalQuestions: (data.questions as unknown[])?.length || 0,
        joinId: data.joinId as string,
        createdAt: data.createdAt as string,
      } as Test;
    }
  } catch (error) {
    console.error("Error fetching test detail:", error);
  }

  if (!test) {
    notFound();
  }

  return (
    <div className="flex-1 h-full bg-background text-foreground overflow-x-hidden">
      <div className="h-full w-full">
        <div className="max-w-none w-full p-4 sm:p-6 lg:p-8">
          <div className="space-y-6 sm:space-y-8">
            <TestDetailHeader test={test} />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
              <TestInformationCard test={test} />

              <ParticipationStatisticsCard test={test} />
            </div>

            <TestEditQuestions questions={test.problems} />
            <QuickActionsCard test={test} />
          </div>
        </div>
      </div>
    </div>
  );
}
