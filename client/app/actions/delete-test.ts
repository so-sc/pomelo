"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function deleteTestAction(id: string) {
    try {
        const session = await auth();
        const token = session?.backendToken;

        const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/tests/${id}`;

        const res = await fetch(url, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await res.text();
            console.error(`[DeleteTest] Non-JSON response (${res.status} ${res.statusText}):`, text.slice(0, 500));
            throw new Error(`Server returned ${res.status} ${res.statusText} (non-JSON)`);
        }

        const json = await res.json();

        if (!res.ok || !json.success) {
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
