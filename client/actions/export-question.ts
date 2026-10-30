"use server";

import { fetchBackend } from "@/lib/fetch";

// The export endpoint lives on the Express server, not the Next app, and needs the
// session's bearer token — so it cannot be fetched straight from the browser.
export async function exportQuestion(id: string) {
  try {
    const payload = await fetchBackend(`/api/admin/questions/${id}/export`);

    if (payload?.success === false) {
      return { success: false as const, message: payload.error || "Failed to export question" };
    }

    // fetchBackend's status field is not part of the exported file.
    delete payload.httpStatus;
    return { success: true as const, payload };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to export question",
    };
  }
}
