import React from "react";
import HeroSection, { DashboardStats } from "@/components/admin/hero-section";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

async function getAdminStats() {
  try {
    const session = await auth();
    const token = session?.backendToken;

    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Failed to fetch admin stats:", await res.text());
      return null;
    }

    return await res.json();
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
  let recentTests = [];

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
    recentTests = apiData.recentTests || [];
  }

  return (
    <div className="h-full w-full overflow-y-scroll">
      <div className="max-w-none w-full p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        <HeroSection stats={stats} recentTests={recentTests} />
      </div>
    </div>
  );
}
