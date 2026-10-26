"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Check, Circle, Clock3 } from "lucide-react";
import { draftKeyPrefix as getDraftKeyPrefix } from "@/lib/attempt-integrity";
import type { QuestionProgress } from "./attempt-runtime";
import type { ProblemMeta } from "./question-nav";

type QuestionStatus = "answered" | "attempted" | "draft" | "unanswered";

interface SubmitConfirmDialogProps {
  open: boolean;
  isSubmitting: boolean;
  testId: string;
  questions: ProblemMeta[];
  progress: Record<string, QuestionProgress>;
  onConfirm: () => void;
  onCancel: () => void;
  onSelectQuestion: (id: string) => void;
}

export default function SubmitConfirmDialog({
  open,
  isSubmitting,
  testId,
  questions,
  progress,
  onConfirm,
  onCancel,
  onSelectQuestion,
}: SubmitConfirmDialogProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);
  const [editedDrafts, setEditedDrafts] = React.useState<Set<string>>(() => new Set());
  const questionIds = JSON.stringify(questions.map((question) => question.id));

  React.useEffect(() => {
    if (!open) return;
    try {
      const prefix = getDraftKeyPrefix(testId);
      const ids = JSON.parse(questionIds) as string[];
      setEditedDrafts(new Set(
        ids.filter((id) => localStorage.getItem(`${prefix}_edited_${id}`) === "true")
      ));
    } catch {
      setEditedDrafts(new Set());
    }
  }, [open, questionIds, testId]);

  React.useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>("button:not(:disabled)")
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocusedRef.current) previouslyFocusedRef.current.focus();
    };
  }, [open, isSubmitting, onCancel]);

  if (!open) return null;

  const getQuestionStatus = (question: ProblemMeta): QuestionStatus => {
    const status = progress[question.id];
    if (question.type.toLowerCase() === "coding") {
      if (status === "solved") return "answered";
      if (status === "attempted") return "attempted";
      return editedDrafts.has(question.id) ? "draft" : "unanswered";
    }
    return status === "solved" ? "answered" : "unanswered";
  };
  const statusLabel = (question: ProblemMeta, status: QuestionStatus) => {
    if (status === "answered" && question.type.toLowerCase() === "coding") return "Answered (accepted)";
    return {
      answered: "Answered",
      attempted: "Attempt recorded",
      draft: "Draft saved",
      unanswered: "Unanswered",
    }[status];
  };
  const answeredCount = questions.filter((question) => getQuestionStatus(question) === "answered").length;
  const attemptedCount = questions.filter((question) =>
    ["attempted", "draft"].includes(getQuestionStatus(question))
  ).length;
  const unansweredCount = questions.length - answeredCount - attemptedCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-confirm-title"
        aria-describedby="submit-confirm-description"
        className="w-full max-w-2xl max-h-[calc(100vh-2rem)] outline-none"
      >
        <Card className="max-h-full overflow-hidden">
          <CardHeader className="shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
              <CardTitle id="submit-confirm-title">Review your submission</CardTitle>
            </div>
            <CardDescription>
              Review your progress before submitting. You can return to any question below.
            </CardDescription>
            <div className="grid grid-cols-2 gap-2 px-6 text-sm sm:grid-cols-4">
              <div className="rounded-md bg-muted px-3 py-2">
                <span className="block font-semibold tabular-nums">{questions.length}</span>
                <span className="text-muted-foreground">Total questions</span>
              </div>
              <div className="rounded-md bg-emerald-500/10 px-3 py-2">
                <span className="block font-semibold tabular-nums">{answeredCount}</span>
                <span className="text-muted-foreground">Answered</span>
              </div>
              <div className="rounded-md bg-amber-500/10 px-3 py-2">
                <span className="block font-semibold tabular-nums">{attemptedCount}</span>
                <span className="text-muted-foreground">Attempted or drafted</span>
              </div>
              <div className="rounded-md bg-muted px-3 py-2">
                <span className="block font-semibold tabular-nums">{unansweredCount}</span>
                <span className="text-muted-foreground">Unanswered</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden">
            <ul aria-label="Question submission status" className="min-h-0 max-h-[45vh] flex-1 space-y-2 overflow-y-auto pr-1">
              {questions.map((question, index) => {
                const status = getQuestionStatus(question);
                const title = question.title?.trim() || `Question ${index + 1}`;
                const label = statusLabel(question, status);
                const icon = status === "answered"
                  ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  : status === "attempted" || status === "draft"
                    ? <Clock3 className="h-4 w-4 text-amber-600" aria-hidden="true" />
                    : <Circle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
                return (
                  <li key={question.id}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => onSelectQuestion(question.id)}
                      aria-label={`Review ${title}: ${label}`}
                      className="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="min-w-0 truncate font-medium">{title}</span>
                      <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                        {icon}
                        {label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p id="submit-confirm-description" className="text-sm text-muted-foreground">
              Are you sure you want to finish the test? You cannot change your answers after submission.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Keep working
              </Button>
              <Button onClick={onConfirm} disabled={isSubmitting}>
                {isSubmitting ? "Finishing..." : "Finish test"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
