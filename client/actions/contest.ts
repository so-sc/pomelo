"use server";

import { fetchBackend } from "@/lib/fetch";

export async function joinTest(joinId: string) {
  return fetchBackend("/api/test/join", {
    method: "POST",
    body: JSON.stringify({ joinId }),
  });
}

export async function getContestLanding(contestId: string) {
  return fetchBackend(`/api/test/${contestId}`);
}

export async function startTest(contestId: string) {
  return fetchBackend("/api/test/start", {
    method: "POST",
    body: JSON.stringify({ contestId }),
  });
}

export async function getContestData(contestId: string) {
  return fetchBackend(`/api/test/${contestId}/data`);
}

export async function endTest(contestId: string, forcedSubmission?: boolean, autoSubmitReason?: string) {
  return fetchBackend(`/api/test/${contestId}/end`, {
    method: "POST",
    body: JSON.stringify({ contestId, forcedSubmission, autoSubmitReason }),
  });
}

export async function submitFeedback(contestId: string, feedback: {
  difficulty: number;
  experience: number;
  comment?: string;
}) {
  return fetchBackend(`/api/test/${contestId}/feedback`, {
    method: "POST",
    body: JSON.stringify(feedback),
  });
}

export async function submitMcq(contestId: string, questionId: string, answer: any) {
  return fetchBackend(`/api/test/${contestId}/mcq`, {
    method: "POST",
    body: JSON.stringify({ questionId, answer }),
  });
}
