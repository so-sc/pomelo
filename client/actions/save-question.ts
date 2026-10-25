"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod/v3";
import { questionSchema, type QuestionSchema } from "@/types/problem";
import { fetchBackend } from "@/lib/fetch";

// A ZodError's own message is a JSON dump of every issue, which is unreadable in
// a toast or an alert.
const describe = (error: unknown): string => {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join("; ");
  }
  return error instanceof Error ? error.message : "Failed to save question";
};


export async function saveQuestion(_prevState: Record<string, unknown>, data: QuestionSchema) {
  try {
    const validatedData = questionSchema.parse(data);
    
    // Transform to backend schema
    const payload = {
      title: validatedData.title,
      description: validatedData.description,
      difficulty: validatedData.difficulty.charAt(0).toUpperCase() + validatedData.difficulty.slice(1), // 'easy' -> 'Easy'
      marks: validatedData.points, // Form uses points, backend uses marks
      type: validatedData.type, // REQUIRED: coding or mcq
      questionType: validatedData.type === 'coding' ? 'Coding' :
        (validatedData.questionType === 'single' ? 'Single Correct' : 'Multiple Correct'),

      // Coding specific
      inputFormat: validatedData.type === 'coding' ? validatedData.inputFormat : undefined,
      outputFormat: validatedData.type === 'coding' ? validatedData.outputFormat : undefined,
      constraints: validatedData.type === 'coding' ? validatedData.constraints.join('\n') : undefined, // Expecting String, newline per constraint
      boilerplateCode: validatedData.type === 'coding' ? validatedData.boilerplate : undefined, // Map boilerplate -> boilerplateCode
      functionName: validatedData.type === 'coding' ? validatedData.functionName : undefined,
      inputVariables: validatedData.type === 'coding' ? validatedData.inputVariables : undefined,
      testcases: validatedData.type === 'coding' ? validatedData.testCases : undefined,

      // MCQ specific
      options: validatedData.type === 'mcq' ? (validatedData as Extract<QuestionSchema, { type: 'mcq' }>).options.map((o) => o.text) : undefined,
      correctAnswer: validatedData.type === 'mcq' ? (validatedData as Extract<QuestionSchema, { type: 'mcq' }>).correctAnswer : undefined,
    };

    // Determine URL and Method
    const isUpdate = !!validatedData.id;
    const url = isUpdate
      ? `/api/admin/questions/${validatedData.id}/edit`
      : `/api/admin/questions/create`;
    const method = isUpdate ? "PUT" : "POST";

    const json = await fetchBackend(url, {
      method: method,
      body: JSON.stringify(payload),
    });

    if (!json.success) {
      throw new Error(json.error || `Failed to ${isUpdate ? 'update' : 'save'} question`);
    }

    revalidatePath("/admin/questions");
    return {
      success: true,
      message: `Question ${isUpdate ? "updated" : "added"} successfully!`,
    };
  } catch (error) {
    console.error("Error saving question:", error);
    return {
      success: false,
      message: describe(error),
    };
  }
}
