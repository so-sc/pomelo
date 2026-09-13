"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTestCompletion } from "./use-test-completion";
import { getContestData } from "@/actions/contest";
import { toast } from "@/components/ui/banner";
import { readViolationCount, MAX_VIOLATIONS } from "@/lib/attempt-integrity";
import TestTimer from "./test-timer";

interface TestHeaderProps {
  initialTimeRemaining: number;
}

export default function TestHeader({ initialTimeRemaining }: TestHeaderProps) {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const { completeTest, isSubmitting } = useTestCompletion();
  const [violations, setViolations] = React.useState(0);

  // Sync with cross-tab/local violation updates
  React.useEffect(() => {
    if (params.testid) {
      setViolations(readViolationCount(params.testid as string));
    }

    const handleViolationUpdate = (e: any) => {
      setViolations(e.detail.count);
    };

    window.addEventListener("pomelo-violation-update", handleViolationUpdate);
    return () => window.removeEventListener("pomelo-violation-update", handleViolationUpdate);
  }, [params.testid]);

  // Handle BFCache (Back/Forward Cache)
  // If user presses back button after finishing, force a refresh to trigger server-side checks
  React.useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        router.refresh();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [router]);

  // Verify on mount (handles back navigation / stale cache) and keep polling
  // while the tab stays open — an admin can force-end the contest at any
  // point during an active attempt, and only a live check catches that.
  React.useEffect(() => {
    const verifyStatus = async () => {
      if (!params.testid) return;
      try {
        const data = await getContestData(params.testid as string);
        // If server says completed or prohibited, kick them out
        if (!data.success || data.isCompleted || data.data?.isCompleted) {
          toast.error("This test has ended", { description: "Your submission has already been recorded." });
          router.replace(`/test/${params.testid}`);
        }
      } catch {
        // network error etc, maybe safe to ignore or retry
      }
    };
    verifyStatus();
    const interval = setInterval(verifyStatus, 20000);
    return () => clearInterval(interval);
  }, [params.testid, router]);

  const handleFinish = async () => {
    if (!session?.backendToken || !params.testid) return;
    if (!confirm("Are you sure you want to finish the test? You cannot change your answers after this.")) return;

    await completeTest({ replace: false });
  };

  return (
    <div className="flex items-center justify-end gap-2 px-4 select-none h-12 absolute top-[var(--banner-h,0px)] w-screen bg-primary">
      <TestTimer initialSecondsRemaining={initialTimeRemaining} />
      <div
        className="flex items-center gap-1.5 px-3 h-8 bg-primary-foreground/10 text-primary-foreground/90 border border-primary-foreground/20 rounded-full text-xs font-medium hover:bg-primary-foreground/20 transition-colors"
        title={`${MAX_VIOLATIONS - violations} warnings left`}
      >
        <ShieldAlert className="h-3.5 w-3.5 text-primary-foreground/70" />
        <span>{MAX_VIOLATIONS - violations}</span>
      </div>
      <Button
        variant={"secondary"}
        className="text-sm bg-green-600 hover:bg-green-700 text-white border-none h-9 ml-2"
        onClick={handleFinish}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Finishing..." : "Submit"}
        {!isSubmitting && <BadgeCheck className="h-4 w-4 ml-2" />}
      </Button>
    </div>
  );
}
