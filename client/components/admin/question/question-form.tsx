"use client";

import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, Fragment, useActionState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QuestionSchema, questionSchema } from "@/types/problem";
import { saveQuestion } from "@/actions/save-question";

import { toast } from "@/components/ui/banner";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Save, ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import BasicInfoCard from "./shared/info-card";
import MCQCard from "./mcq/mcq-card";
import { InputVariable, serializeInput, deserializeInput } from "@/lib/test-case-utils";


import ConstraintsCard from "./coding/constraint-card";
import BoilerplateCard from "./coding/boilerplate-card";
import IOFormatCard from "./coding/ioformat-card";
import TestCaseCard from "./coding/test-case-card";

interface Props {
  type: "coding" | "mcq";
  isCreating: boolean;
  initialData?: Partial<QuestionSchema> | null;
}

// Test-case errors sit far down a long form, so the inline FormMessage alone is
// easy to miss. Flatten react-hook-form's nested error tree for a summary.
function collectMessages(errors: unknown): string[] {
  if (!errors || typeof errors !== "object") return [];

  const node = errors as Record<string, unknown> & { message?: unknown };
  if (typeof node.message === "string" && node.message) return [node.message];

  return Object.values(node).flatMap(collectMessages);
}

export default function QuestionForm({ type, isCreating, initialData }: Props) {
  const router = useRouter();

  const getDefaultValues = useCallback((): QuestionSchema => {
    if (type === "coding") {
      return {
        type: "coding",
        title: "",
        description: "",
        points: 0,
        difficulty: "easy",
        inputFormat: "",
        outputFormat: "",
        constraints: [""],
        boilerplate: {},
        functionName: "",
        inputVariables: [],
      };
    } else {
      return {
        type: "mcq",
        title: "",
        description: "",
        points: 0,
        difficulty: "easy",
        questionType: "single",
        options: [
          { id: "0", text: "" },
          { id: "1", text: "" },
          { id: "2", text: "" },
          { id: "3", text: "" },
        ],
        correctAnswer: "",
      };
    }
  }, [type]);



  const form = useForm<QuestionSchema>({
    resolver: zodResolver(questionSchema) as Resolver<QuestionSchema>,
    defaultValues: {
      ...getDefaultValues(),
      ...initialData,
    },
  });

  useEffect(() => {
    if (initialData) {
      const transformedData = { ...initialData };

      // Deserialize Test Case inputs (DB String -> UI Object)
      if (
        transformedData.type === "coding" &&
        transformedData.testCases &&
        transformedData.inputVariables
      ) {
        transformedData.testCases = transformedData.testCases.map((tc: Record<string, unknown>) => ({
          ...tc,
          input:
            typeof tc.input === "string"
              ? deserializeInput(tc.input, transformedData.inputVariables as InputVariable[])
              : tc.input,
          output: tc.output as string,
          isVisible: tc.isVisible as boolean ?? false,
        }));
      }

      form.reset({
        ...getDefaultValues(),
        ...transformedData,
      } as QuestionSchema);
    } else {
      form.reset(getDefaultValues());
    }
  }, [initialData, type, form, getDefaultValues]);

  const [state, formAction] = useActionState(saveQuestion, {
    success: false,
    message: "",
  });

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || "Question saved");
      router.push("/admin/questions");
    } else if (state.message) {
      toast.error("Saving failed", { description: state.message });
    }
  }, [state, router]);

  const handleSubmit = form.handleSubmit((data) => {
    const submissionData = { ...data };

    // Serialize Test Case inputs (UI Object -> DB String)
    if (
      submissionData.type === "coding" &&
      submissionData.testCases &&
      submissionData.inputVariables
    ) {
      // Values were validated by the schema, so serialization cannot fail here.
      submissionData.testCases = submissionData.testCases.map((tc: Record<string, unknown>) => ({
        ...tc,
        input: serializeInput(tc.input as Record<string, unknown>, submissionData.inputVariables as InputVariable[]),
        output: tc.output as string,
        isVisible: tc.isVisible as boolean ?? false,
      }));

      startTransition(() => {
        formAction(submissionData as QuestionSchema);
      });
    } else {
      startTransition(() => {
        formAction(submissionData);
      });
    }
  }, (errors) => {
    // Field errors also render inline, but a test case sits far down a long form,
    // so the toast is what tells the author anything went wrong at all.
    const messages = [...new Set(collectMessages(errors))];
    toast.error("This question can’t be saved yet", {
      description: messages.length > 0 ? messages.join(" · ") : "Some fields need attention.",
    });
  });

  return (
    <Fragment>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={"/admin/questions"}>
            <Button variant="outline" size="icon" className="text-foreground" aria-label="Back to questions">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">
              {isCreating ? "Create Question" : "Edit Question"}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {type.charAt(0).toUpperCase() + type.slice(1)} type
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCreating ? (
            <Button
              variant="outline"
              type="button"
              disabled
              title="Save the question first to preview it"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          ) : (
            <Link href={`/admin/questions/${type}/${initialData?.id}/preview`}>
              <Button
                variant="outline"
                type="button"
                title={
                  form.formState.isDirty
                    ? "Opens the last saved version, not your unsaved edits"
                    : "Open this question in the candidate test UI"
                }
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </Link>
          )}
          <Button
            type="submit"
            form="question-form"
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form id="question-form" onSubmit={handleSubmit} className="space-y-6">
          <input type="hidden" {...form.register("type")} value={type} />


          {type === "coding" ? (
            <div className="space-y-6">
              <BasicInfoCard />
              <ConstraintsCard />
              <IOFormatCard />
              <BoilerplateCard />
              <TestCaseCard />
            </div>
          ) : (
            <>
              <BasicInfoCard />
              <MCQCard />
            </>
          )}
        </form>
      </Form>
    </Fragment>
  );
}

