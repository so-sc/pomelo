"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useTestCompletion } from "./use-test-completion";
import { getContestData } from "@/actions/contest";
import { toast } from "@/components/ui/banner";
import { readViolationCount, MAX_VIOLATIONS } from "@/lib/attempt-integrity";
import TestTimer from "./test-timer";
import SubmitConfirmDialog from "./submit-confirm-dialog";
import { useAttemptRuntime } from "./attempt-runtime";
import type { ProblemMeta } from "./question-nav";

interface TestHeaderProps {
  initialTimeRemaining: number;
  questions: ProblemMeta[];
}

export default function TestHeader({ initialTimeRemaining, questions }: TestHeaderProps) {
  const router = useRouter();
  const params = useParams();
  const { completeTest, isSubmitting } = useTestCompletion();
  const runtime = useAttemptRuntime();
  const [violations, setViolations] = React.useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [isPreparingReview, setIsPreparingReview] = React.useState(false);
  const preparingReviewRef = React.useRef(false);
  const [reviewProgress, setReviewProgress] = React.useState(runtime.progress);

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
    const interval = setInterval(verifyStatus, 60000);
    return () => clearInterval(interval);
  }, [params.testid, router]);

  const handleFinish = async () => {
    if (!params.testid || preparingReviewRef.current || isSubmitting || !runtime.beginReviewPreparation()) return;
    preparingReviewRef.current = true;
    setIsPreparingReview(true);
    try {
      const savedProgress = await runtime.flushPendingSaves();
      if (!runtime.isReviewPreparationActive() || runtime.isSubmissionInProgress()) return;
      setReviewProgress(savedProgress);
      setShowConfirmDialog(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save answers before review.");
    } finally {
      preparingReviewRef.current = false;
      runtime.endReviewPreparation();
      setIsPreparingReview(false);
    }
  };

  const handleConfirmFinish = async () => {
    const result = await completeTest({ replace: false });
    if (result.success) setShowConfirmDialog(false);
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
        disabled={isSubmitting || isPreparingReview}
      >
        {isPreparingReview ? "Preparing..." : isSubmitting ? "Finishing..." : "Submit"}
        {!isSubmitting && !isPreparingReview && <BadgeCheck className="h-4 w-4 ml-2" />}
      </Button>
      <SubmitConfirmDialog
        open={showConfirmDialog}
        isSubmitting={isSubmitting}
        testId={String(params.testid ?? "")}
        questions={questions}
        progress={reviewProgress}
        onConfirm={handleConfirmFinish}
        onCancel={() => setShowConfirmDialog(false)}
        onSelectQuestion={(id) => {
          setShowConfirmDialog(false);
          router.push(`/attempt/test/${params.testid}/question/${id}`);
        }}
      />
    </div>
  );
}
