import { redirect } from "next/navigation";
import { fetchBackend } from "@/lib/fetch";
import SubmissionReviewPage from "@/components/attempt/submission-review-page";
import type { Problem } from "@/types/problem";

interface Props {
  params: Promise<{ testid: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}

export const dynamic = "force-dynamic";

export default async function TestSubmissionReview({ params, searchParams }: Props) {
  const { testid } = await params;
  const { returnTo } = await searchParams;
  const result = await fetchBackend(`/api/test/${testid}/data`);
  if (!result.success) redirect(`/test/${testid}`);

  const questions = ((result.data?.problems || []) as Problem[]).map((question) => ({
    id: String(question.id),
    type: question.type,
    title: question.title,
  }));

  return (
    <SubmissionReviewPage
      testId={testid}
      questions={questions}
      returnTo={Array.isArray(returnTo) ? returnTo[0] ?? null : returnTo ?? null}
    />
  );
}
