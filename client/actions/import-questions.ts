"use server";

import { fetchBackend } from "@/lib/fetch";
import { revalidatePath } from "next/cache";

export async function importQuestions(type: "mcq" | "coding", formData: FormData) {
    try {
        const file = formData.get("file") as File;
        if (!file) {
            return { success: false, message: "No file provided" };
        }

        const uploadFormData = new FormData();
        uploadFormData.append("file", file);

        const json = await fetchBackend(`/api/admin/questions/import/${type}`, {
            method: "POST",
            body: uploadFormData,
            // DO NOT set Content-Type header for FormData, the browser/fetch automatically boundary sets it
        });

        if (!json.success) {
            return {
                success: false,
                message: json.error || "Failed to import questions",
                errors: json.errors,
            };
        }

        revalidatePath("/admin/questions");
        return {
            success: true,
            message: `Successfully imported ${json.imported} of ${json.total} questions`,
            imported: json.imported,
            errors: json.errors,
        };
    } catch (error) {
        console.error("Error importing questions:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to import questions",
        };
    }
}
