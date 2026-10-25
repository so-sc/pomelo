"use server";

import { fetchBackend } from "@/lib/fetch";
import { revalidatePath } from "next/cache";

export async function deleteQuestion(id: string) {
    try {
        const json = await fetchBackend(`/api/admin/questions/${id}`, {
            method: "DELETE",
        });

        if (!json.success) {
            throw new Error(json.error || "Failed to delete question");
        }

        revalidatePath("/admin");
        revalidatePath("/admin/questions");

        return { success: true, message: "Question deleted successfully" };
    } catch (error) {
        console.error("Error deleting question:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to delete question",
        };
    }
}
