"use server";

import { fetchBackend } from "@/lib/fetch";
import { revalidatePath } from "next/cache";

export async function deleteTestAction(id: string) {
    try {
        const json = await fetchBackend(`/api/admin/tests/${id}`, {
            method: "DELETE",
        });

        if (!json.success) {
            throw new Error(json.error || "Failed to delete test");
        }

        revalidatePath("/admin/tests");
        return { success: true, message: "Test deleted successfully" };
    } catch (error) {
        console.error("Error deleting test:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to delete test",
        };
    }
}
