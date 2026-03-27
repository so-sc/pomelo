"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const MAX_VIOLATIONS = 3;
const STORAGE_PREFIX = "pomelo:attempt-integrity";

type ViolationKind =
  | "focus_switch"
  | "fullscreen_exit"
  | "screenshot_attempt";

type ModalKind =
  | ViolationKind
  | "fullscreen_required"
  | "submission_error";

interface WarningState {
  kind: ModalKind;
  count: number;
  title: string;
  message: string;
  critical?: boolean;
}

interface SubmitExamOptions {
  forced?: boolean;
  autoSubmitReason?: string;
}

interface AttemptIntegrityContextValue {
  isSubmitting: boolean;
  violationCount: number;
  submitExam: (options?: SubmitExamOptions) => Promise<boolean>;
}

const AttemptIntegrityContext = createContext<AttemptIntegrityContextValue | null>(null);

const VIOLATION_COPY: Record<ViolationKind, { title: string; message: string }> = {
  focus_switch: {
    title: "Focus Lost",
    message: "You left the exam interface. Return to fullscreen mode to continue.",
  },
  fullscreen_exit: {
    title: "Fullscreen Required",
    message: "Exiting fullscreen is treated as a violation. Re-enter fullscreen to resume.",
  },
  screenshot_attempt: {
    title: "Screenshot Attempt Blocked",
    message: "Screenshot capture is not allowed during the exam. Re-enter fullscreen to continue.",
  },
};

function getStorageKey(testId: string, suffix: string) {
  return `${STORAGE_PREFIX}:${testId}:${suffix}`;
}

function clearAttemptStorage(testId: string) {
  if (typeof window === "undefined") return;

  [
    "violation-count",
    "last-violation",
    "pending-force-submit",
  ].forEach((suffix) => window.localStorage.removeItem(getStorageKey(testId, suffix)));
}

export function useAttemptIntegrity() {
  const context = useContext(AttemptIntegrityContext);
  if (!context) {
    throw new Error("useAttemptIntegrity must be used within AttemptIntegrityProvider");
  }
  return context;
}

export default function AttemptIntegrityProvider({
  testId
}: {
  testId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { data: session } = useSession();

  const [violationCount, setViolationCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warning, setWarning] = useState<WarningState | null>(null);
  const [needsFullscreen, setNeedsFullscreen] = useState(false);
  const [isObscured, setIsObscured] = useState(false);

  const violationCountRef = useRef(0);
  const warningRef = useRef<WarningState | null>(null);
  const submitInFlightRef = useRef(false);
  const pendingViolationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistViolationCount = useCallback(
    (nextCount: number, kind?: ViolationKind) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(getStorageKey(testId, "violation-count"), String(nextCount));
      if (kind) {
        window.localStorage.setItem(getStorageKey(testId, "last-violation"), kind);
      }
      if (nextCount >= MAX_VIOLATIONS) {
        window.localStorage.setItem(getStorageKey(testId, "pending-force-submit"), "true");
      }
    },
    [testId]
  );

  const clearPendingViolation = useCallback(() => {
    if (pendingViolationTimerRef.current) {
      clearTimeout(pendingViolationTimerRef.current);
      pendingViolationTimerRef.current = null;
    }
  }, []);

  const requestExamFullscreen = useCallback(async (showError = true) => {
    if (typeof document === "undefined") return false;
    if (document.fullscreenElement) {
      setNeedsFullscreen(false);
      return true;
    }

    if (!document.documentElement.requestFullscreen) {
      return true;
    }

    try {
      await document.documentElement.requestFullscreen();
      setNeedsFullscreen(false);
      return true;
    } catch {
      setNeedsFullscreen(true);
      if (showError) {
        toast.error("Fullscreen access is required to continue the exam.");
      }
      return false;
    }
  }, []);

  const submitExam = useCallback(
    async ({ forced = false, autoSubmitReason }: SubmitExamOptions = {}) => {
      if (!session?.backendToken || !testId || submitInFlightRef.current) {
        return false;
      }

      submitInFlightRef.current = true;
      setIsSubmitting(true);
      setWarning(null);
      setNeedsFullscreen(false);
      clearPendingViolation();

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/test/${testId}/end`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.backendToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            autoSubmitReason
              ? { auto_submit_reason: autoSubmitReason }
              : {}
          ),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || data.message || "Failed to submit exam");
        }

        clearAttemptStorage(testId);
        setIsObscured(false);

        if (typeof document !== "undefined" && document.fullscreenElement) {
          await document.exitFullscreen().catch(() => undefined);
        }

        toast.success(
          forced
            ? "The exam was submitted after reaching the violation limit."
            : "Test submitted successfully!"
        );

        router.replace(forced ? "/" : `/test/${testId}`);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to submit exam";
        setWarning({
          kind: "submission_error",
          count: violationCountRef.current,
          title: "Unable to Finalize Submission",
          message: `${message}. Retry submission to conclude the exam.`,
          critical: true,
        });
        toast.error(message);
        return false;
      } finally {
        submitInFlightRef.current = false;
        setIsSubmitting(false);
      }
    },
    [clearPendingViolation, router, session?.backendToken, testId]
  );
}