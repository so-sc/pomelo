"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { submitMcq } from "@/actions/contest";
import { claimAttemptStorage } from "@/lib/attempt-integrity";

export type ExecutionAction = "run" | "submit";

export interface ExecutionResult {
  success: boolean;
  results?: TestCaseResult[];
  score?: number;
  overallStatus?: string;
  passedCount?: number;
  totalCount?: number;
  rateLimited?: boolean;
  systemFault?: boolean;
  error?: string;
  message?: string;
}

export interface TestCaseResult {
  testCase: number;
  passed: boolean;
  status: string;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  error?: string;
  isVisible: boolean;
}

export interface McqSaveResult {
  success: boolean;
  error?: string;
  rateLimited?: boolean;
}

export interface AttemptRuntime {
  mode: "contest" | "preview";
  execute(
    action: ExecutionAction,
    questionId: string,
    code: string,
    language: string,
    onExecuting: () => void
  ): Promise<ExecutionResult>;
  saveMcqAnswer(questionId: string, answers: string[]): Promise<McqSaveResult>;
  progress: Record<string, QuestionProgress>;
  /** A question registers how to flush its unsaved answer; returns the unregister function. */
  registerPendingSave(flush: () => Promise<void>): () => void;
  /** Lands every unsaved answer; awaited before the test is submitted. */
  flushPendingSaves(): Promise<void>;
}

export type QuestionProgress = "attempted" | "solved";

const AttemptRuntimeContext = createContext<AttemptRuntime | null>(null);

export function useAttemptRuntime(): AttemptRuntime {
  const runtime = useContext(AttemptRuntimeContext);
  if (!runtime) {
    throw new Error("useAttemptRuntime must be used within an attempt runtime provider");
  }
  return runtime;
}

function toBase64(str: string) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
}

async function streamExecution(
  url: string,
  questionId: string,
  code: string,
  language: string,
  onExecuting: () => void
): Promise<ExecutionResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      questionId,
      code: toBase64(code),
      language,
      isBase64: true,
    }),
  });

  // Errors (rate limits, validation, auth) come back as a plain JSON body, not as an
  // ndjson frame — parse them here or they fall through as an empty stream.
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return {
      success: false,
      rateLimited: res.status === 429,
      error: body?.error || (res.status === 429
        ? "Too many attempts.. wait a minute"
        : `Request failed (${res.status})`),
    };
  }

  if (!res.body) throw new Error("No response stream");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalData: ExecutionResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const msg = JSON.parse(line);
      // The server writes its first progress frame once it hands the code to the
      // engine, so it marks the move out of the queue.
      if (msg.type === "progress") onExecuting();
      else if (msg.type === "error") throw new Error(msg.error);
      else if (msg.type === "done") finalData = msg;
    }
  }

  return finalData ?? { success: false, error: "Execution ended without a result" };
}

export function ContestAttemptRuntime({
  contestId,
  userId,
  initialProgress,
  children,
}: {
  contestId: string;
  userId?: string;
  initialProgress: Record<string, QuestionProgress>;
  children: React.ReactNode;
}) {
  // Per user: on a shared machine, another account's tray must not leak in.
  const storageKey = `pomelo_progress_${contestId}_${userId ?? "anon"}`;
  // Runs during the first client render, before child effects (the integrity monitor's
  // violation count, the editor's draft) read this test's storage.
  useState(() => {
    if (userId) claimAttemptStorage(contestId, userId);
  });
  const [progress, setProgress] = useState<Record<string, QuestionProgress>>(initialProgress);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
      setProgress((prev) => ({ ...stored, ...prev }));
    } catch { /* localStorage unavailable */ }
  }, [storageKey]);

  const setQuestionProgress = useCallback((questionId: string, status: QuestionProgress | null) => {
    setProgress((prev) => {
      const next = { ...prev };
      if (status) next[questionId] = status;
      else delete next[questionId];
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* unavailable */ }
      return next;
    });
  }, [storageKey]);

  const pendingSaves = useRef(new Set<() => Promise<void>>());
  const registerPendingSave = useCallback((flush: () => Promise<void>) => {
    pendingSaves.current.add(flush);
    return () => { pendingSaves.current.delete(flush); };
  }, []);
  const flushPendingSaves = useCallback(async () => {
    await Promise.all([...pendingSaves.current].map((flush) => flush()));
  }, []);

  const runtime = useMemo<AttemptRuntime>(() => ({
    mode: "contest",
    progress,
    registerPendingSave,
    flushPendingSaves,
    execute: async (action, questionId, code, language, onExecuting) => {
      const result = await streamExecution(`/api/test/${contestId}/${action}`, questionId, code, language, onExecuting);
      if (result.success) {
        const solved = action === "submit" && result.overallStatus === "Accepted";
        if (solved || progress[questionId] !== "solved") setQuestionProgress(questionId, solved ? "solved" : "attempted");
      }
      return result;
    },
    saveMcqAnswer: async (questionId, answers) => {
      const result = await submitMcq(contestId, questionId, answers);
      if (result.success) setQuestionProgress(questionId, answers.length > 0 ? "solved" : null);
      return result;
    },
  }), [contestId, progress, setQuestionProgress, registerPendingSave, flushPendingSaves]);

  return (
    <AttemptRuntimeContext.Provider value={runtime}>
      {children}
    </AttemptRuntimeContext.Provider>
  );
}

export function PreviewAttemptRuntime({
  questionId,
  children,
}: {
  questionId: string;
  children: React.ReactNode;
}) {
  const runtime = useMemo<AttemptRuntime>(() => ({
    mode: "preview",
    progress: {},
    execute: (action, _questionId, code, language, onExecuting) =>
      streamExecution(
        `/api/admin/questions/${questionId}/preview/${action}`,
        questionId,
        code,
        language,
        onExecuting
      ),
    saveMcqAnswer: async () => ({ success: true }),
    registerPendingSave: () => () => {},
    flushPendingSaves: async () => {},
  }), [questionId]);

  return (
    <AttemptRuntimeContext.Provider value={runtime}>
      {children}
    </AttemptRuntimeContext.Provider>
  );
}
