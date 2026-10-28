import z from "zod/v3";
import {
  SUPPORTED_TYPES,
  validateProblemConfig,
  validateValues,
  parseTokens,
} from "@pomelo/code-gen";
// import { BaseProblem, CodingProblem, MCQProblem } from "./problem.types";

// type CreateFrom<T extends BaseProblem> = Omit<T, "id">;
// type UpdateFrom<T extends BaseProblem> = Partial<Omit<T, "id">>;

// export type CodingProblemCreate = CreateFrom<CodingProblem>;
// export type CodingProblemUpdate = UpdateFrom<CodingProblem>;

// export type MCQProblemCreate = CreateFrom<MCQProblem>;
// export type MCQProblemUpdate = UpdateFrom<MCQProblem>;

const codingSchema = z.object({
  id: z.string().optional(),
  type: z.literal("coding"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  points: z.coerce.number().min(0),
  difficulty: z.enum(["easy", "medium", "hard"]),
  inputFormat: z.string().min(1, "Input format is required"),
  outputFormat: z.string().min(1, "Output format is required"),
  constraints: z.array(z.string().min(1, "Constraint cannot be empty")),
  boilerplate: z
    .record(z.string().optional())
    .refine((val) => Object.values(val).some((v) => v && v.trim() !== ""), {
      message: "At least one boilerplate must be filled.",
    }),
  functionName: z.string().min(1, "Function name is required"),
  inputVariables: z
    .array(
      z.object({
        variable: z.string().min(1, "Variable name is required"),
        type: z.enum(SUPPORTED_TYPES),
      })
    )
    .min(1, "At least one input variable is required"),
  testCases: z
    .array(
      z.object({
        input: z.any(),
        output: z.string().min(1, "Expected output is required"),
        explanation: z.string().optional(),
        isVisible: z.boolean().default(false),
      })
    )
    .optional(), // Optional initially, but encouraged
});

const mcqSchema = z.object({
  id: z.string().optional(),
  type: z.literal("mcq"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  points: z.coerce.number().min(0),
  difficulty: z.enum(["easy", "medium", "hard"]),
  questionType: z.enum(["single", "multiple"]),
  options: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().trim().min(1, "Option text is required"),
      })
    )
    .length(4, "Exactly 4 options are required"),
  correctAnswer: z
    .string()
    .min(1, "Please select at least one correct option."),
});

export const questionSchema = z
  .discriminatedUnion("type", [codingSchema, mcqSchema])
  .superRefine((question, ctx) => {
    if (question.type !== "coding") return;

    const signatureErrors = validateProblemConfig({
      method: question.functionName,
      input: question.inputVariables,
    });

    signatureErrors.forEach((message) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inputVariables"],
        message,
      });
    });

    // Values are positional against inputVariables, so checking them against a
    // broken signature would only produce noise.
    if (signatureErrors.length > 0) return;

    (question.testCases ?? []).forEach((testCase, index) => {
      // The form holds inputs as an object keyed by variable; once submitted they
      // have been flattened to a stdin string. This schema validates both, because
      // the server action re-parses the payload after that flattening.
      const values =
        typeof testCase.input === "string"
          ? parseTokens(testCase.input, question.inputVariables)
          : ((testCase.input ?? {}) as Record<string, unknown>);

      validateValues(values, question.inputVariables).forEach(({ variable, message }) => {
        // This path is the one TestCaseCard binds its FormField to, so the
        // message renders under the offending input with no extra UI.
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["testCases", index, "input", variable],
          message,
        });
      });
    });
  });

export type QuestionSchema = z.infer<typeof questionSchema>;
