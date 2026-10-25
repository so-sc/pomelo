import { CodeScreen } from "@/components/attempt/code";
import React from "react";
import { CodingProblem, MCQProblem, Problem } from "@/types/problem";
import MCQScreen from "@/components/attempt/mcq";
import { redirect } from "next/navigation";
import { fetchBackend } from "@/lib/fetch";
import { draftKeyPrefix } from "@/lib/attempt-integrity";

interface Props {
  params: Promise<{
    testid: string;
    qid: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function TestContentPage(props: Props) {
  const params = await props.params;
  const { testid, qid } = params;

  // Fetch contest data via student API — ?qid trims every other question
  // down to {id, type} server-side, since only the current one is rendered.
  const result = await fetchBackend(`/api/test/${testid}/data?qid=${qid}`);
  if (!result.success) {
    redirect(`/test/${testid}`);
  }

  const allProblems = (result.data?.problems || []) as Problem[];
  const currentProblem = allProblems.find(p => String(p.id) === qid);

  if (!currentProblem) {
    redirect(`/test/${testid}`);
  }

  return (
    <div className="w-full h-full">
      {currentProblem.type.toLowerCase() === "coding" ? (
        <CodeScreen problem={currentProblem as CodingProblem} draftKeyPrefix={draftKeyPrefix(testid)} />
      ) : (
        <MCQScreen
          problem={currentProblem as MCQProblem}
          problems={allProblems}
        />
      )}
    </div>
  );
}
