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
  testId,
  children,
}: {
  testId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { data: session } = useSession();

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
}