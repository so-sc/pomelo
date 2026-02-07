"use client";

import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, Fragment, useActionState, useTransition, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QuestionSchema, questionSchema } from "@/types/problem";
import { saveQuestion } from "@/app/actions/save-question";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Save, ArrowLeft, Upload, Download } from "lucide-react";
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

export default function QuestionForm({ type, isCreating, initialData }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ message: string; success: boolean } | null>(null);

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
      router.push("/admin/questions");
    }
  }, [state.success, router]);

  const handleSubmit = form.handleSubmit((data) => {
    const submissionData = { ...data };

    // Serialize Test Case inputs (UI Object -> DB String)
    if (
      submissionData.type === "coding" &&
      submissionData.testCases &&
      submissionData.inputVariables
    ) {
      try {
        submissionData.testCases = submissionData.testCases.map((tc: Record<string, unknown>) => ({
          ...tc,
          input: serializeInput(tc.input as Record<string, unknown>, submissionData.inputVariables as InputVariable[]),
          output: tc.output as string,
          isVisible: tc.isVisible as boolean ?? false,
        }));
        
        startTransition(() => {
          formAction(submissionData as QuestionSchema);
        });
      } catch (error) {
         console.error("Serialization failed", error);
      }
    } else {
      startTransition(() => {
        formAction(submissionData);
      });
    }
  });

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);

    try {
      const text = await file.text();
      const lines = text.trim().split('\n');

      if (lines.length < 2) {
        setImportStatus({ message: 'CSV must have a header row and one data row', success: false });
        return;
      }

      if (lines.length > 2) {
        setImportStatus({ message: 'CSV must contain only one question (one data row)', success: false });
        return;
      }

      // Parse CSV header and data
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current);
        return result;
      };

      const headers = parseCSVLine(lines[0]);
      const values = parseCSVLine(lines[1]);

      const rowData: Record<string, string> = {};
      headers.forEach((h, i) => {
        rowData[h.trim()] = values[i] || '';
      });

      // Build form data based on question type
      if (type === 'mcq') {
        let options: string[] = [];
        try {
          options = JSON.parse(rowData.options || '[]');
        } catch {
          setImportStatus({ message: 'Invalid JSON in options field', success: false });
          return;
        }

        form.reset({
          type: 'mcq',
          title: rowData.title || '',
          description: rowData.description || '',
          difficulty: (rowData.difficulty?.toLowerCase() || 'easy') as 'easy' | 'medium' | 'hard',
          points: parseInt(rowData.marks || '0', 10),
          questionType: rowData.questionType?.toLowerCase().includes('multiple') ? 'multiple' : 'single',
          options: options.slice(0, 4).map((text, i) => ({ id: String(i), text })),
          correctAnswer: rowData.correctAnswer || '',
        });
      } else {
        let inputVariables: { variable: string; type: string }[] = [];
        let testcases: { input: string; output: string }[] = [];

        try {
          inputVariables = JSON.parse(rowData.inputVariables || '[]');
        } catch {
          setImportStatus({ message: 'Invalid JSON in inputVariables field', success: false });
          return;
        }

        try {
          testcases = rowData.testcases ? JSON.parse(rowData.testcases) : [];
        } catch {
          setImportStatus({ message: 'Invalid JSON in testcases field', success: false });
          return;
        }

        // Deserialize testcase inputs for the form
        const formTestCases = testcases.map(tc => ({
          input: deserializeInput(tc.input, inputVariables as InputVariable[]),
          output: tc.output,
          isVisible: false,
        }));

        form.reset({
          type: 'coding',
          title: rowData.title || '',
          description: rowData.description || '',
          difficulty: (rowData.difficulty?.toLowerCase() || 'easy') as 'easy' | 'medium' | 'hard',
          points: parseInt(rowData.marks || '0', 10),
          constraints: rowData.constraints ? [rowData.constraints] : [''],
          inputFormat: rowData.inputFormat || '',
          outputFormat: rowData.outputFormat || '',
          functionName: rowData.functionName || '',
          inputVariables: inputVariables.map(v => ({
            variable: v.variable,
            type: v.type as 'int' | 'float' | 'char' | 'string' | 'int_array' | 'float_array' | 'string_array',
          })),
          boilerplate: { python: '// auto-generated', c: '// auto-generated', java: '// auto-generated' },
          testCases: formTestCases.length > 0 ? formTestCases : undefined,
        });
      }

      setImportStatus({ message: 'CSV loaded! Review the fields and click Save.', success: true });
    } catch (error) {
      setImportStatus({ message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`, success: false });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  return (
    <Fragment>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={"/admin/questions"}>
            <Button variant="outline" size="icon" className="text-foreground">
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
          {isCreating && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <a
                href={`/templates/${type}_template.csv`}
                download
              >
                <Button variant="outline" type="button">
                  <Download className="h-4 w-4 mr-2" />
                  Template
                </Button>
              </a>
              <Button variant="outline" type="button" onClick={handleImportClick}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </>
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

      {importStatus && (
        <div className={`p-3 rounded-md text-sm ${importStatus.success ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
          {importStatus.message}
        </div>
      )}

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

