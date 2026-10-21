"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "@/components/ui/banner";
import {
  AUTO_SUBMIT_REASON,
  clearAttemptIntegrityState,
} from "@/lib/attempt-integrity";

import { endTest } from "@/actions/contest";

interface CompleteTestOptions {
  forced?: boolean;
  autoSubmitReason?: string;
  redirectTo?: string;
  replace?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

export function useTestCompletion() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const testId = String(params.testid ?? "");

  const completeTest = useCallback(async (options: CompleteTestOptions = {}) => {
    if (!session?.backendToken || !testId) {
      toast.error("Unable to submit this test right now.");
      return { success: false as const };
    }

    setIsSubmitting(true);

    try {
      const forced = Boolean(options.forced);
      const autoReason = options.forced ? options.autoSubmitReason ?? AUTO_SUBMIT_REASON : undefined;
      const data = await endTest(testId, forced, autoReason);

      if (!data.success) {
        toast.error(data.error || data.message || options.errorMessage || "Failed to submit test");
        return { success: false as const, data };
      }

      clearAttemptIntegrityState(testId);

      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith("pomelo_draft_")) {
            localStorage.removeItem(key);
          }
        });
      } catch (err) {
        console.error("Failed to clear local storage drafts", err);
      }

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

      const destination = options.redirectTo ?? (options.forced ? "/" : `/test/${testId}`);
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
  }, [router, session?.backendToken, testId]);

  return {
    completeTest,
    isSubmitting,
    testId,
  };
}
