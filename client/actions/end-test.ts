"use server";

import { fetchBackend } from "@/lib/fetch";
import { revalidatePath } from "next/cache";

export async function endTestAction(id: string, force: boolean) {
    try {
        const json = await fetchBackend(`/api/admin/tests/${id}/${force ? "force-end" : "end"}`, {
            method: "POST",
        });

        if (!json.success) {
            throw new Error(json.error || "Failed to end test");
        }

        revalidatePath(`/admin/tests/${id}`);
        revalidatePath("/admin/tests");
        return { success: true as const, submittedCount: json.submittedCount as number | undefined };
    } catch (error) {
        return {
            success: false as const,
            message: error instanceof Error ? error.message : "Failed to end test",
        };
    }
}
