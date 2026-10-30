"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Circle, Clock3, FileCode2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/banner";
import SubmitConfirmDialog from "./submit-confirm-dialog";
import { useAttemptRuntime } from "./attempt-runtime";
import { useTestCompletion } from "./use-test-completion";
import type { ProblemMeta } from "./question-nav";
import { draftKeyPrefix } from "@/lib/attempt-integrity";
import { useIsClient } from "@/hooks/use-is-client";
import { getQuestionReviewStatus, summarizeReview, type ReviewStatus } from "@/lib/submission-review";

interface SubmissionReviewPageProps {
  testId: string;
  questions: ProblemMeta[];
  returnTo: string | null;
}

export default function SubmissionReviewPage({ testId, questions, returnTo }: SubmissionReviewPageProps) {
  const router = useRouter();
  const runtime = useAttemptRuntime();
  const { completeTest, isSubmitting } = useTestCompletion();
  const [editedDrafts, setEditedDrafts] = useState<Set<string>>(() => new Set());
  const isClient = useIsClient();
  const [loadedTestId, setLoadedTestId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const questionIds = useMemo(() => questions.map((question) => question.id), [questions]);
  if (isClient && loadedTestId !== testId) {
    setLoadedTestId(testId);
    try {
      const prefix = draftKeyPrefix(testId);
      setEditedDrafts(new Set(
        questionIds.filter((id) => localStorage.getItem(`${prefix}_edited_${id}`) === "true")
      ));
    } catch {
      setEditedDrafts(new Set());
    }
  }

  const getStatus = (question: ProblemMeta): ReviewStatus =>
    getQuestionReviewStatus(question, runtime.progress, editedDrafts);
  const summary = summarizeReview(questions, runtime.progress, editedDrafts);

  const fallbackQuestion = questions[0]?.id;
  const safeReturnTo = returnTo
    && questions.some((question) => returnTo === `/attempt/test/${testId}/question/${question.id}`)
    ? returnTo
    : fallbackQuestion
      ? `/attempt/test/${testId}/question/${fallbackQuestion}`
      : `/test/${testId}`;

  const navigateTo = async (destination: string) => {
    if (isNavigating || isSubmitting) return;
    setIsNavigating(true);
    try {
      await runtime.flushPendingSaves();
      router.push(destination);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save answers before leaving review.");
    } finally {
      setIsNavigating(false);
    }
  };

  const handleConfirm = async () => {
    await completeTest();
  };

  const statusText: Record<ReviewStatus, string> = {
    answered: "Answered",
    attempted: "Attempt recorded",
    draft: "Draft saved",
    unanswered: "Unanswered",
  };
  const StatusIcon = ({ status }: { status: ReviewStatus }) => {
    if (status === "answered") return <BadgeCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />;
    if (status === "attempted" || status === "draft") return <Clock3 className="h-4 w-4 text-amber-600" aria-hidden="true" />;
    return <Circle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
  };

  return (
    <section className="h-full min-h-0 overflow-y-auto bg-muted/20 px-4 py-6 sm:px-6 lg:px-10" aria-labelledby="submission-review-title">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ListChecks className="h-4 w-4" aria-hidden="true" /> Submission review
            </p>
            <h1 id="submission-review-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Review your answers
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Check each question before you finish. You can return to any question and make changes.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Submission summary">
          <SummaryCard label="Total questions" value={questions.length} icon={<ListChecks className="h-4 w-4" />} />
          <SummaryCard label="Answered" value={summary.answered} tone="success" icon={<BadgeCheck className="h-4 w-4" />} />
          <SummaryCard label="Coding attempted" value={summary.attempted} tone="warning" icon={<Clock3 className="h-4 w-4" />} />
          <SummaryCard label="Saved drafts" value={summary.draft} tone="warning" icon={<FileCode2 className="h-4 w-4" />} />
          <SummaryCard label="Unanswered" value={summary.unanswered} icon={<Circle className="h-4 w-4" />} />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Question breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No questions were found for this assessment.</p>
            ) : (
              <ol className="divide-y">
                {questions.map((question, index) => {
                  const status = getStatus(question);
                  const title = question.title?.trim() || `Question ${index + 1}`;
                  const type = question.type.toLowerCase() === "coding" ? "Coding" : "Multiple choice";
                  return (
                    <li key={question.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col gap-2 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between sm:px-3"
                        onClick={() => void navigateTo(`/attempt/test/${testId}/question/${question.id}`)}
                        disabled={isNavigating || isSubmitting}
                        aria-label={`Question ${index + 1}, ${type}, ${statusText[status]}: ${title}`}
                      >
                        <span className="min-w-0">
                          <span className="block text-xs text-muted-foreground">Question {index + 1} · {type} · ID {question.id}</span>
                          <span className="mt-1 block truncate font-medium">{title}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                          <StatusIcon status={status} />{statusText[status]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <footer className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => void navigateTo(safeReturnTo)} disabled={isNavigating || isSubmitting}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to assessment
          </Button>
          <Button onClick={() => setShowConfirmation(true)} disabled={isNavigating || isSubmitting}>
            Submit test
          </Button>
        </footer>
      </div>

      <SubmitConfirmDialog
        open={showConfirmation}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirmation(false)}
      />
    </section>
  );
}

function SummaryCard({ label, value, icon, tone = "neutral" }: {
  label: string;
  value: number;
  icon: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClass = tone === "success"
    ? "text-emerald-700 dark:text-emerald-400"
    : tone === "warning"
      ? "text-amber-700 dark:text-amber-400"
      : "text-foreground";
  return (
    <Card>
      <CardContent className="flex min-h-24 flex-col justify-between gap-3 p-4">
        <span className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">{icon}{label}</span>
        <span className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</span>
      </CardContent>
    </Card>
  );
}
