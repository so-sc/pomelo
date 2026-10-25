"use server";

import { testSchema, TestSchema } from "@/types/test";
import { revalidatePath } from "next/cache";
import { fetchBackend } from "@/lib/fetch";

export async function saveTest(_prevState: Record<string, unknown>, data: TestSchema) {
  try {
    const validatedData = testSchema.parse(data);
    const startDate = new Date(validatedData.startsAt);
    const endDate = new Date(validatedData.endsAt);
    const now = new Date();
    const bufferMs = 5 * 60 * 1000;
    const isUpdate = !!validatedData.id;

    if (!isUpdate && startDate.getTime() < now.getTime() - bufferMs) {
      throw new Error("Start time cannot be in the past");
    }

    if (endDate <= startDate) {
      throw new Error("End time must be after start time");
    }

    const payload = {
      title: validatedData.title,
      description: validatedData.description,
      duration: {
        start: validatedData.startsAt,
        end: validatedData.endsAt,
      },
      durationMinutes: validatedData.durationMinutes,
      problemIds: validatedData.problems,
      rules: validatedData.rules,
      shuffleQuestions: validatedData.shuffleQuestions,
      author: "Admin"
    };

    const url = isUpdate
      ? `/api/admin/tests/${validatedData.id}/edit`
      : `/api/admin/tests/create`;
    const method = isUpdate ? "PUT" : "POST";

    const json = await fetchBackend(url, {
      method: method,
      body: JSON.stringify(payload),
    });

    if (!json.success) {
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
