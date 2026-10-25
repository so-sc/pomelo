import React from "react";
import HeroSection, { DashboardStats } from "@/components/admin/hero-section";
import { Test } from "@/types/test";
import { fetchBackend } from "@/lib/fetch";

export const dynamic = "force-dynamic";

async function getAdminStats() {
  try {
    const data = await fetchBackend("/api/admin/stats");
    if (!data.success) {
      console.error("Failed to fetch admin stats:", data.error);
      return null;
    }
    return data;
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return null;
  }
}

export default async function AdminAnalyticsPage() {
  const apiData = await getAdminStats();

  const defaultStats: DashboardStats = {
    activeContests: 0,
    draftedTests: 0,
    completedTests: 0,
    totalQuestions: 0,
    totalParticipants: 0,
    easyQuestions: 0,
    mediumQuestions: 0,
    hardQuestions: 0,
  };

  let stats = defaultStats;
  let recentTests: Test[] = [];

  const normalizeStatus = (
    status: unknown,
    startTime?: string,
    endTime?: string
  ): Test["status"] => {
    const manualStatus = typeof status === "string" ? status.toLowerCase() : "";
    const start = startTime ? new Date(startTime) : null;
    const end = endTime ? new Date(endTime) : null;
    const now = new Date();

    if (manualStatus === "completed" || manualStatus === "ended") return "completed";
    if (manualStatus === "ongoing" || manualStatus === "running") return "ongoing";
    if (manualStatus === "waiting" || manualStatus === "draft") return "waiting";

    if (start && end) {
      if (now > end) return "completed";
      if (now >= start && now <= end) return "ongoing";
      if (now < start) return "waiting";
    }

    return "waiting";
  };

  const formatDuration = (durationMinutes?: number, fallback?: unknown) => {
    if (typeof fallback === "string" && fallback.trim().length > 0) return fallback;
    if (!durationMinutes || durationMinutes <= 0) return "00:00";

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  if (apiData && apiData.success) {
    stats = {
      activeContests: apiData.activeContests || 0,
      draftedTests: apiData.draftTests || 0,
      completedTests: apiData.completedTests || 0,
      totalQuestions: apiData.totalQuestions || 0,
      totalParticipants: apiData.totalParticipants || 0,
      easyQuestions: apiData.questionBank?.easy || 0,
      mediumQuestions: apiData.questionBank?.medium || 0,
      hardQuestions: apiData.questionBank?.hard || 0,
    };
    recentTests = (apiData.recentTests || []).map((test: Record<string, unknown>) => {
      const startTime = (test.startTime as string) || (test.startsAt as string);
      const endTime = test.endTime as string | undefined;
      const totalQuestions =
        (test.totalQuestions as number | undefined) ||
        (test.problemCount as number | undefined) ||
        ((test.questions as unknown[]) || []).length ||
        0;
      const participantsCompleted = (test.participantsCompleted as number | undefined) ?? 0;
      const participantsInProgress =
        (test.participantsInProgress as number | undefined) ??
        Math.max(((test.participants as number | undefined) ?? 0) - participantsCompleted, 0);

      return {
        id: (test.id as string) || (test._id as string) || "",
        _id: test._id as string | undefined,
        title: (test.title as string) || "Untitled",
        description: (test.description as string) || "",
        duration: formatDuration(test.durationMinutes as number | undefined, test.duration),
        totalQuestions,
        startsAt: startTime || "",
        status: normalizeStatus(test.status, startTime, endTime),
        participantsInProgress,
        participantsCompleted,
        problems: (test.problems as string[]) || [],
        joinId: (test.joinId as string) || "",
        createdAt: (test.createdAt as string) || "",
      } as Test;
    });
  }

  return (
    <div className="max-w-none w-full p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      <HeroSection stats={stats} recentTests={recentTests} />
    </div>
  );
}
