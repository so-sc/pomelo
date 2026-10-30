"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { getContestData } from "@/actions/contest";
import { toast } from "@/components/ui/banner";
import { readViolationCount, MAX_VIOLATIONS } from "@/lib/attempt-integrity";
import { useIsClient } from "@/hooks/use-is-client";
import TestTimer from "./test-timer";
import { useAttemptRuntime } from "./attempt-runtime";

interface TestHeaderProps {
  initialTimeRemaining: number;
}

export default function TestHeader({ initialTimeRemaining }: TestHeaderProps) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const runtime = useAttemptRuntime();
  const isSubmitting = runtime.isSubmitting;
  const [violations, setViolations] = React.useState(0);
  const [isPreparingReview, setIsPreparingReview] = React.useState(false);
  const preparingReviewRef = React.useRef(false);

  const isClient = useIsClient();
  const storageTestId = isClient && params.testid ? String(params.testid) : null;
  const [loadedTestId, setLoadedTestId] = React.useState<string | null>(null);
  if (storageTestId !== loadedTestId) {
    setLoadedTestId(storageTestId);
    if (storageTestId) setViolations(readViolationCount(storageTestId));
  }

  // Sync with cross-tab/local violation updates
  React.useEffect(() => {
    const handleViolationUpdate = (e: Event) => {
      setViolations((e as CustomEvent<{ count: number }>).detail.count);
    };

    window.addEventListener("pomelo-violation-update", handleViolationUpdate);
    return () => window.removeEventListener("pomelo-violation-update", handleViolationUpdate);
  }, []);

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
    const interval = setInterval(verifyStatus, 60000);
    return () => clearInterval(interval);
  }, [params.testid, router]);

  const handleFinish = async () => {
    if (!params.testid || preparingReviewRef.current || isSubmitting || !runtime.beginReviewPreparation()) return;
    preparingReviewRef.current = true;
    setIsPreparingReview(true);
    try {
      await runtime.flushPendingSaves();
      if (!runtime.isReviewPreparationActive() || runtime.isSubmissionInProgress()) return;
      const returnTo = encodeURIComponent(pathname);
      router.push(`/attempt/test/${params.testid}/review?returnTo=${returnTo}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save answers before review.");
    } finally {
      preparingReviewRef.current = false;
      runtime.endReviewPreparation();
      setIsPreparingReview(false);
    }
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
      {!pathname.endsWith("/review") && <Button
        variant={"secondary"}
        className="text-sm bg-green-600 hover:bg-green-700 text-white border-none h-9 ml-2"
        onClick={handleFinish}
        disabled={isSubmitting || isPreparingReview}
      >
        {isPreparingReview ? "Preparing..." : isSubmitting ? "Finishing..." : "Submit"}
        {!isSubmitting && !isPreparingReview && <BadgeCheck className="h-4 w-4 ml-2" />}
      </Button>}
    </div>
  );
}
