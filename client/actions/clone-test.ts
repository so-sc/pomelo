"use server";

import { fetchBackend } from "@/lib/fetch";
import { revalidatePath } from "next/cache";

export async function cloneTestAction(id: string) {
    try {
        const json = await fetchBackend(`/api/admin/tests/${id}/clone`, {
            method: "POST",
        });

        if (!json.success) {
            throw new Error(json.error || "Failed to clone test");
        }

        revalidatePath("/admin/tests");
        return { success: true, message: "Test cloned successfully", newTestId: json.contestId };
    } catch (error) {
        console.error("Error cloning test:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to clone test",
        };
    }
}
