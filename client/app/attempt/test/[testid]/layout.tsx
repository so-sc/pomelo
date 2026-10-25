import type { Metadata } from "next";
import TestHeader from "@/components/attempt/test-header";
import QuestionNav from "@/components/attempt/question-nav";
import IntegrityMonitor from "@/components/attempt/integrity-monitor";
import { ContestAttemptRuntime, QuestionProgress } from "@/components/attempt/attempt-runtime";
import { Problem } from "@/types/problem";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import React from "react";
import { fetchBackend } from "@/lib/fetch";
import { DISABLE_PROCTORING } from "@/lib/attempt-integrity";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Test Attempt",
  description: "Test taking assessment environment on Pomelo.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function TestLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ testid: string }>;
}) {
  const { testid } = await params;
  const session = await auth();

  const result = await fetchBackend(`/api/test/${testid}/data`);

  /*
   * SECURITY CHECK:
   * If the user has completed the test, the middleware returns 403.
   * We must redirect them out of the attempt area immediately.
   */
  if (!result.success || result.isCompleted) {
    redirect(`/test/${testid}`);
  }

  const problems = result.data?.problems || [];

  const problemMeta = problems.map((q: { id: string; type: string }) => ({
    id: String(q.id),
    type: q.type
  }));
  const initialProgress: Record<string, QuestionProgress> = {};
  for (const q of problems as Problem[]) {
    if (q.savedAnswer?.length) initialProgress[String(q.id)] = "solved";
    else if (q.savedCode) initialProgress[String(q.id)] = "attempted";
  }

  const initialTimeRemaining = Number(result.data?.timeRemaining) || 0;

  return (
    <main className="w-screen h-screen pt-12 flex">
      <ContestAttemptRuntime contestId={testid} userId={session?.user?.id} initialProgress={initialProgress}>
        <IntegrityMonitor />
        <TestHeader initialTimeRemaining={initialTimeRemaining} />
        <QuestionNav problems={problemMeta} />
        <div className={cn("flex-1 min-w-0 h-full", !DISABLE_PROCTORING && "select-none")}>{children}</div>
      </ContestAttemptRuntime>
    </main>
  );
}
