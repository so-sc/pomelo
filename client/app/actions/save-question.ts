"use server";

import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { questionSchema, type QuestionSchema } from "@/types/problem";
import { auth } from "@/auth";

const QUESTIONS_FILE = path.join(process.cwd(), "data", "questions.json");
const STATS_FILE = path.join(process.cwd(), "data", "statistics.json");

export async function saveQuestion(_prevState: any, data: QuestionSchema) {
  try {
    const validatedData = questionSchema.parse(data);
    const session = await auth();
    const token = session?.backendToken;

    console.log("Saving question:", validatedData);

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
      constraints: validatedData.type === 'coding' ? String(validatedData.constraints) : undefined, // Expecting String
      boilerplateCode: validatedData.type === 'coding' ? validatedData.boilerplate : undefined, // Map boilerplate -> boilerplateCode
      functionName: validatedData.type === 'coding' ? validatedData.functionName : undefined,
      inputVariables: validatedData.type === 'coding' ? validatedData.inputVariables : undefined,
      testcases: validatedData.type === 'coding' ? validatedData.testCases : undefined,

      // MCQ specific
      options: validatedData.type === 'mcq' ? validatedData.options.map(o => o.text) : undefined,
      correctAnswer: validatedData.type === 'mcq' ? validatedData.correctOptionIds[0] : undefined // Assuming single correct for now or comma joined
    };

    // Determine URL and Method
    const isUpdate = !!validatedData.id;
    const url = isUpdate
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/questions/${validatedData.id}/edit`
      : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/questions/create`;
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
      throw new Error(json.error || `Failed to ${isUpdate ? 'update' : 'save'} question`);
    }

    revalidatePath("/admin/questions");
    return {
      success: true,
      message: "Question added! Full data saved to data/questions.json and stats updated.",
    };
  } catch (error) {
    console.error("Error saving question:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save question",
    };
  }
}
