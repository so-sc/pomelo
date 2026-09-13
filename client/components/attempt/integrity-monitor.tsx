"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AUTO_SUBMIT_REASON,
  DISABLE_PROCTORING,
  MAX_VIOLATIONS,
  clearClipboard,
  obfuscateAttemptBody,
  persistViolationCount,
  readViolationCount,
  resetAttemptObfuscation,
} from "@/lib/attempt-integrity";
import { useTestCompletion } from "./use-test-completion";

type ViolationType =
  | "VISIBILITY_HIDDEN"
  | "WINDOW_BLUR"
  | "FULLSCREEN_EXIT"
  | "PRINT_SCREEN";

const WINDOW_BLUR_DEBOUNCE_MS = 500;
const VIOLATION_COOLDOWN_MS = 1000;
const SCREENSHOT_OBFUSCATION_MS = 500;
const FINAL_MODAL_DELAY_MS = 5000;

const violationMessages: Record<ViolationType, { title: string; description: string }> = {
  VISIBILITY_HIDDEN: {
    title: "Return to the test",
    description: "The test tab was hidden. Go back to the test and continue in full screen.",
  },
  WINDOW_BLUR: {
    title: "Stay on this window",
    description: "The browser window lost focus. Keep the test window active.",
  },
  FULLSCREEN_EXIT: {
    title: "Full screen required",
    description: "This test must stay in full screen. Re-enter full screen to continue.",
  },
  PRINT_SCREEN: {
    title: "Screenshot blocked",
    description: "Screenshots are not allowed during the test. A violation was recorded.",
  },
};

async function requestTestFullscreen() {
  if (typeof document === "undefined") return false;
  if (document.fullscreenElement) return true;

  const root = document.documentElement;
  if (!root.requestFullscreen) return false;

  try {
    await root.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}

async function exitTestFullscreen() {
  if (typeof document === "undefined") return true;
  if (!document.fullscreenElement) return true;
  if (!document.exitFullscreen) return false;

  try {
    await document.exitFullscreen();
    return true;
  } catch {
    return false;
  }
}

export default function IntegrityMonitor() {
  const { completeTest, isSubmitting, testId } = useTestCompletion();
  const [violationCount, setViolationCount] = useState(0);
  const [activeViolation, setActiveViolation] = useState<ViolationType | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(Math.ceil(FINAL_MODAL_DELAY_MS / 1000));

  const blurTimeoutRef = useRef<number | null>(null);
  const screenshotTimeoutRef = useRef<number | null>(null);
  const autoSubmitTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const lastViolationAtRef = useRef(0);
  const isAutoSubmittingRef = useRef(false);
  const isGracePeriodRef = useRef(true);

  const remainingWarnings = useMemo(
    () => Math.max(0, MAX_VIOLATIONS - violationCount),
    [violationCount]
  );

  const clearTimers = useCallback(() => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    if (screenshotTimeoutRef.current) {
      window.clearTimeout(screenshotTimeoutRef.current);
      screenshotTimeoutRef.current = null;
    }

    if (autoSubmitTimeoutRef.current) {
      window.clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }

    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const forceSubmitTest = useCallback(async () => {
    if (isAutoSubmittingRef.current) return;

    isAutoSubmittingRef.current = true;
    setActiveViolation(null);
    setResumeError(null);
    setSubmissionError(null);

    const result = await completeTest({
      forced: true,
      autoSubmitReason: AUTO_SUBMIT_REASON,
      redirectTo: "/",
      replace: true,
      successMessage: "Test submitted after 3 violations.",
      errorMessage: "Submission failed. Try again to finish the test.",
    });

    if (!result.success) {
      isAutoSubmittingRef.current = false;
      setSubmissionError("The test is locked after 3 violations. Try submitting again.");
    }
  }, [completeTest]);

  const registerViolation = useCallback(async (type: ViolationType) => {
    if (!testId || isAutoSubmittingRef.current || isGracePeriodRef.current) return;

    const storedCount = readViolationCount(testId);
    if (storedCount >= MAX_VIOLATIONS) {
      return;
    }

    const now = Date.now();
    if (now - lastViolationAtRef.current < VIOLATION_COOLDOWN_MS) {
      return;
    }

    lastViolationAtRef.current = now;

    const nextCount = storedCount + 1;
    persistViolationCount(testId, nextCount);
    setViolationCount(nextCount);

    if (type === "PRINT_SCREEN") {
      obfuscateAttemptBody();

      if (screenshotTimeoutRef.current) {
        window.clearTimeout(screenshotTimeoutRef.current);
      }

      screenshotTimeoutRef.current = window.setTimeout(() => {
        resetAttemptObfuscation();
        screenshotTimeoutRef.current = null;
      }, SCREENSHOT_OBFUSCATION_MS);
    }

    if (nextCount >= MAX_VIOLATIONS) {
      setActiveViolation(null);
      setResumeError(null);
      setSubmissionError(null);
      return;
    }

    setSubmissionError(null);
    setResumeError(null);
    setActiveViolation(type);
  }, [testId]);

  const handleResume = useCallback(async () => {
    const enteredFullscreen = await requestTestFullscreen();

    if (!enteredFullscreen) {
      setResumeError("Full-screen access is required before the test can continue.");
      return;
    }

    resetAttemptObfuscation();
    setResumeError(null);
    setActiveViolation(null);
  }, []);

  const handleSubmitNow = useCallback(async () => {
    if (autoSubmitTimeoutRef.current) {
      window.clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }

    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    await exitTestFullscreen();
    await forceSubmitTest();
  }, [forceSubmitTest]);

  useEffect(() => {
    if (!testId) return;
    if (DISABLE_PROCTORING) return;

    const storedCount = readViolationCount(testId);
    setViolationCount(storedCount);

    void clearClipboard();
    void requestTestFullscreen();
    setCountdown(Math.ceil(FINAL_MODAL_DELAY_MS / 1000));

    const graceTimer = setTimeout(() => {
      isGracePeriodRef.current = false;
    }, 2500);

    return () => {
      clearTimeout(graceTimer);
      clearTimers();
      resetAttemptObfuscation();
    };
  }, [clearTimers, testId]);

  useEffect(() => {
    if (!testId) return;
    if (DISABLE_PROCTORING) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void registerViolation("VISIBILITY_HIDDEN");
      }
    };

    const handleBlur = () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }

      blurTimeoutRef.current = window.setTimeout(() => {
        blurTimeoutRef.current = null;
        void registerViolation("WINDOW_BLUR");
      }, WINDOW_BLUR_DEBOUNCE_MS);
    };

    const handleFocus = () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        void registerViolation("FULLSCREEN_EXIT");
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "PrintScreen" || event.keyCode === 44) {
        void registerViolation("PRINT_SCREEN");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const usesSystemModifier = event.ctrlKey || event.metaKey;

      if (event.key === "F12" || (usesSystemModifier && event.shiftKey && key === "i")) {
        event.preventDefault();
        return;
      }

      if (event.altKey && key === "tab") {
        event.preventDefault();
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      clearTimers();
    };
  }, [clearTimers, registerViolation, testId]);

  const warningCopy = activeViolation ? violationMessages[activeViolation] : null;
  const showLockedModal = violationCount >= MAX_VIOLATIONS;
  const showWarningModal = Boolean(activeViolation) && !showLockedModal;

  useEffect(() => {
    if (!showLockedModal || isSubmitting || submissionError || isAutoSubmittingRef.current) {
      return;
    }

    setCountdown(Math.ceil(FINAL_MODAL_DELAY_MS / 1000));

    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((current) => (current > 1 ? current - 1 : 1));
    }, 1000);

    autoSubmitTimeoutRef.current = window.setTimeout(() => {
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      autoSubmitTimeoutRef.current = null;
      void handleSubmitNow();
    }, FINAL_MODAL_DELAY_MS);

    return () => {
      if (autoSubmitTimeoutRef.current) {
        window.clearTimeout(autoSubmitTimeoutRef.current);
        autoSubmitTimeoutRef.current = null;
      }

      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [handleSubmitNow, isSubmitting, showLockedModal, submissionError]);

  if (!showWarningModal && !showLockedModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg rounded-2xl border-border py-0 shadow-2xl">
        <CardHeader className="space-y-3 border-b px-6 py-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
              Test Rules
            </p>
            <CardTitle>
              {showLockedModal
                ? isSubmitting
                  ? "Submitting test"
                  : "Test ended"
                : warningCopy?.title}
            </CardTitle>
            <CardDescription className={`leading-6 ${!showLockedModal && warningCopy ? "text-foreground" : ""}`}>
              {showLockedModal
                ? isSubmitting
                  ? "Please wait while your test is submitted."
                  : submissionError
                    ? submissionError
                    : `You have used all ${MAX_VIOLATIONS} violations. Your test will be submitted in ${countdown} second${countdown === 1 ? "" : "s"}.`
                : warningCopy?.description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-6 py-5">
          {(resumeError || submissionError) && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {submissionError || resumeError}
            </div>
          )}

          <div className="flex justify-end gap-3">
            {showLockedModal ? (
              !isSubmitting && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    void handleSubmitNow();
                  }}
                >
                  Submit and exit full screen
                </Button>
              )
            ) : (
              <Button onClick={() => void handleResume()}>
                Re-enter full screen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
