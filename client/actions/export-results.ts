"use server";

import { fetchBackend } from "@/lib/fetch";

// These endpoints live on the Express server and need the session's bearer
// token, so they can't be fetched straight from the browser.

export async function exportContestScores(contestId: string) {
  try {
    const result = await fetchBackend(`/api/admin/tests/${contestId}/export/scores`);

    if (result?.success === false) {
      return { success: false as const, message: result.error || "Failed to export scores" };
    }

    return { success: true as const, csv: result.message as string };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to export scores",
    };
  }
}

export async function exportContestSubmissions(contestId: string, verbose: boolean) {
  try {
    const payload = await fetchBackend(
      `/api/admin/tests/${contestId}/export/submissions?verbose=${verbose}`
    );

    if (payload?.success === false) {
      return { success: false as const, message: payload.error || "Failed to export submissions" };
    }

    return { success: true as const, payload };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to export submissions",
    };
  }
}
