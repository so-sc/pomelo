"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAttemptRuntime } from "./attempt-runtime";
import type { ProblemMeta } from "./question-nav";

interface SubmitConfirmDialogProps {
  open: boolean;
  isSubmitting: boolean;
  problems: ProblemMeta[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SubmitConfirmDialog({
  open,
  isSubmitting,
  problems,
  onConfirm,
  onCancel,
}: SubmitConfirmDialogProps) {
  const router = useRouter();
  const params = useParams();
  const { progress } = useAttemptRuntime();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);

  // Mirror QuestionNav's grouping so chip labels match the sidebar numbering
  const mcqProblems = problems.filter((p) => p.type !== "coding");
  const codingProblems = problems.filter((p) => p.type === "coding");

  const labelFor = (id: string) => {
    const mcqIndex = mcqProblems.findIndex((p) => p.id === id);
    if (mcqIndex !== -1) return `Q${mcqIndex + 1}`;
    const codingIndex = codingProblems.findIndex((p) => p.id === id);
    if (codingIndex !== -1) return `Code ${codingIndex + 1}`;
    return "Question";
  };

  const attemptedCount = problems.filter((p) => progress[p.id]).length;
  const skipped = problems.filter((p) => !progress[p.id]);

  // Close before navigating so the summary doesn't cover the destination question
  const jumpToQuestion = (id: string) => {
    if (isSubmitting) return;
    onCancel();
    router.push(`/attempt/test/${params.testid}/question/${id}`);
  };

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200"
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
        className="w-full max-w-md outline-none animate-in fade-in zoom-in-95 duration-200"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
              <CardTitle id="submit-confirm-title">Finish the test?</CardTitle>
            </div>
            <CardDescription id="submit-confirm-description">
              Are you sure you want to finish the test? You cannot change your answers after this.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {problems.length > 0 && (
              <div className="mb-4 rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Attempted</span>
                  <span className="font-medium tabular-nums">
                    {attemptedCount} of {problems.length}
                  </span>
                </div>

                {/* Emerald = the app's solved/positive accent (matches sidebar checkmarks) */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500/80 transition-all duration-300"
                    style={{ width: `${(attemptedCount / problems.length) * 100}%` }}
                  />
                </div>

                {skipped.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      Skipped ({skipped.length}) — click a question to review it:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {skipped.map((p) => (
                        <Button
                          key={p.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          title={`Go to ${labelFor(p.id)}`}
                          onClick={() => jumpToQuestion(p.id)}
                          disabled={isSubmitting}
                          className={cn(
                            "h-9 border-amber-400/40 bg-amber-400/10 px-4 text-sm font-medium tabular-nums text-amber-700 dark:text-amber-400",
                            "hover:border-amber-400/60 hover:bg-amber-400/20 hover:text-amber-800 dark:hover:text-amber-300",
                            "focus-visible:ring-amber-400/50"
                          )}
                        >
                          {labelFor(p.id)}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    All questions attempted
                  </div>
                )}
              </div>
            )}

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
