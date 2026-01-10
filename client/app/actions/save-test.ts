"use server";

import { testSchema, TestSchema } from "@/types/test";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function saveTest(_prevState: any, data: TestSchema) {
  try {
    const validatedData = testSchema.parse(data);
    const session = await auth();
    const token = session?.backendToken;

    console.log("Saving test:", validatedData);

    // Parse duration (HH:MM:SS) to milliseconds
    const [h, m, s] = String(validatedData.duration).split(':').map(Number);
    const durationMs = ((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) * 1000;

    const payload = {
      title: validatedData.title,
      description: validatedData.description,
      duration: {
        start: validatedData.startsAt,
        end: new Date(new Date(validatedData.startsAt).getTime() + durationMs).toISOString()
      },
      problemIds: validatedData.problems,
      rules: [],
      type: "classic",
      visibility: "public",
      status: validatedData.status,
      author: "Admin"
    };

    // Determine URL and Method
    const isUpdate = !!validatedData.id;
    const url = isUpdate
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/tests/${validatedData.id}/edit`
      : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/tests/create`;
    const method = isUpdate ? "PUT" : "POST";

    const res = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.error || `Failed to ${isUpdate ? 'update' : 'save'} test`);
    }

    revalidatePath("/admin/tests");
    return {
      success: true,
      message: `Test ${isUpdate ? 'updated' : 'saved'} successfully`,
    };
  } catch (error) {
    console.error("Error saving test:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save test",
    };
  }
}
