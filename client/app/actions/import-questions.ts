"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function importQuestions(type: "mcq" | "coding", formData: FormData) {
    try {
        const session = await auth();
        const token = session?.backendToken;

        const file = formData.get("file") as File;
        if (!file) {
            return { success: false, message: "No file provided" };
        }

        const uploadFormData = new FormData();
        uploadFormData.append("file", file);

        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/questions/import/${type}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: uploadFormData,
            }
        );

        const json = await res.json();

        if (!res.ok || !json.success) {
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
