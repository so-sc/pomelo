import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CodeScreen } from "@/components/attempt/code";
import MCQScreen from "@/components/attempt/mcq";
import { PreviewAttemptRuntime } from "@/components/attempt/attempt-runtime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchBackend } from "@/lib/fetch";
import { CodingProblem, MCQProblem } from "@/types/problem";
import { getQuestionPreviewBackUrl } from "@/lib/return-url";

const VALID_TYPES = ["coding", "mcq"] as const;

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Question Preview",
  robots: { index: false, follow: false },
};

export default async function QuestionPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ returnUrl?: string | string[] }>;
}) {
  const [{ type, id }, query] = await Promise.all([params, searchParams]);
  if (!VALID_TYPES.includes(type as "coding" | "mcq")) return notFound();
  const backUrl = getQuestionPreviewBackUrl(
    type,
    id,
    query.returnUrl,
  );

  const result = await fetchBackend(`/api/admin/questions/${id}/preview`);
  if (!result?.success || !result.problem) return notFound();

  const problem = result.problem as CodingProblem | MCQProblem;
  if (problem.type !== type) return notFound();

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--banner-h,0px)] z-50 flex flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={backUrl}>
            <Button variant="outline" size="icon" aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold">{problem.title}</h1>
              <Badge variant="secondary">Preview</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Showing the last saved version. Nothing is recorded.
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <PreviewAttemptRuntime questionId={id}>
          {problem.type === "coding" ? (
            <CodeScreen problem={problem as CodingProblem} draftKeyPrefix="pomelo_preview" />
          ) : (
            <MCQScreen problem={problem as MCQProblem} problems={[problem]} />
          )}
        </PreviewAttemptRuntime>
      </div>
    </div>
  );
}
