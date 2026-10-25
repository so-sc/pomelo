"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "@/components/ui/banner";
import {
  AUTO_SUBMIT_REASON,
  clearAttemptStorage,
} from "@/lib/attempt-integrity";

import { endTest } from "@/actions/contest";
import { useAttemptRuntime } from "./attempt-runtime";

interface CompleteTestOptions {
  forced?: boolean;
  autoSubmitReason?: string;
  replace?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

export function useTestCompletion() {
  const router = useRouter();
  const params = useParams();
  const { flushPendingSaves } = useAttemptRuntime();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const testId = String(params.testid ?? "");

  const completeTest = useCallback(async (options: CompleteTestOptions = {}) => {
    // No client-session check: endTest authenticates server-side, and waiting on
    // useSession would drop a timer auto-submit that fires while it is still loading.
    if (!testId) {
      toast.error("Unable to submit this test right now.");
      return { success: false as const };
    }

    setIsSubmitting(true);

    try {
      // Unsaved MCQ answers (debounced multi-select) must land before the attempt closes.
      await flushPendingSaves();
      const forced = Boolean(options.forced);
      const autoReason = options.forced ? options.autoSubmitReason ?? AUTO_SUBMIT_REASON : undefined;
      const data = await endTest(testId, forced, autoReason);

      if (!data.success) {
        toast.error(data.error || options.errorMessage || "Failed to submit test");
        return { success: false as const, data };
      }

      clearAttemptStorage(testId);

      // Remember that this session just submitted successfully, so the
      // landing page can show a persistent success panel instead of a
      // toast that disappears after a few seconds.
      try {
        sessionStorage.setItem(`pomelo_just_submitted_${testId}`, String(Date.now()));
      } catch (err) {
        console.error("Failed to record submission flag", err);
      }

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.error("Error exiting fullscreen:", err));
      }

      toast.success(
        options.successMessage ||
        (options.forced ? "Test auto-submitted after repeated violations." : "Test submitted successfully!")
      );

      const destination = `/test/${testId}/feedback`;
      const shouldReplace = options.replace ?? options.forced;

      if (shouldReplace) {
        router.replace(destination);
      } else {
        router.push(destination);
      }

      return { success: true as const, data };
    } catch {
      toast.error(
        options.errorMessage ||
        (options.forced ? "Auto submission failed. Please retry." : "Network error finishing test")
      );
      return { success: false as const };
    } finally {
      setIsSubmitting(false);
    }
  }, [router, testId, flushPendingSaves]);

  return {
    completeTest,
    isSubmitting,
    testId,
  };
}
