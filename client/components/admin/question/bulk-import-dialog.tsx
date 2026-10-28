"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Upload, FileJson, AlertCircle, CheckCircle2, AlertTriangle, X, Download, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { importQuestions } from "@/actions/import-questions";
import { validateImportJSONClient } from "@/lib/validation";

const EXAMPLE_JSON_PLACEHOLDER = `{
  "questions": [
    {
      "type": "mcq",
      "title": "What is the time complexity of binary search?",
      "description": "...",
      "marks": 10,
      "difficulty": "Easy",
      "questionType": "Single Correct",
      "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
      "correctAnswer": 1
    },
    {
      "type": "coding",
      "title": "Two Sum",
      "description": "...",
      "marks": 30,
      "difficulty": "Easy",
      "inputFormat": "...",
      "outputFormat": "...",
      "functionName": "twoSum",
      "inputVariables": [{ "variable": "nums", "type": "int_array" }],
      "testcases": [{ "input": "...", "output": "..." }]
    }
  ]
}`;

function groupErrors(errors: ImportResult["errors"]) {
  const groups = new Map<string, ImportResult["errors"]>();
  errors.forEach((err) => {
    const key = err.index !== undefined ? `Question ${err.index + 1}` : "General";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(err);
  });
  return Array.from(groups.entries());
}

interface ImportResult {
  valid: boolean;
  errors: Array<{ field?: string; message: string; index?: number }>;
  warnings?: string[];
  count?: number;
  preview?: Array<{ title: string; type: string; marks?: number; difficulty?: string }>;
}

interface BulkImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (count: number) => void;
}

export default function BulkImportDialog({
  isOpen,
  onClose,
  onSuccess,
}: BulkImportDialogProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [validationResult, setValidationResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      setJsonInput(content);
      const result = validateImportJSONClient(content);
      setValidationResult(result);
    };
    reader.readAsText(file);
  };

  const handleJsonInputChange = (value: string) => {
    setJsonInput(value);
    setValidationResult(null); // Clear validation until user submits
  };

  const handleValidate = async () => {
    if (!jsonInput.trim()) {
      setValidationResult({
        valid: false,
        errors: [{ message: "JSON input is empty" }],
      });
      return;
    }
    const result = validateImportJSONClient(jsonInput);
    setValidationResult(result);
  };

  const handleImport = async () => {
    if (!validationResult?.valid) {
      setImportStatus({
        success: false,
        message: "Cannot import: JSON has validation errors",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create FormData to send JSON as file
      const blob = new Blob([jsonInput], { type: "application/json" });
      const formData = new FormData();
      formData.append("file", blob, "questions.json");

      // Call server action - it handles bulk/single/mixed-type JSON imports
      // 'coding' is just a placeholder path param; server detects actual types from JSON
      const result = await importQuestions("coding", formData);

      if (!result.success) {
        throw new Error(result.message || "Import failed");
      }

      setImportStatus({
        success: true,
        message: `Successfully imported ${result.imported} question${result.imported !== 1 ? "s" : ""}`,
      });

      // Let the success message show briefly, then close and hand off to
      // the caller. Reset state after, once the dialog is unmounted anyway.
      setTimeout(() => {
        setJsonInput("");
        setValidationResult(null);
        setImportStatus(null);
        onClose();
        onSuccess?.(result.imported);
      }, 1500);
    } catch (error) {
      setImportStatus({
        success: false,
        message:
          error instanceof Error ? error.message : "Import failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const resultsPanel = (
    <>
      {!validationResult && !importStatus && (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">Validate your JSON to see results here.</p>
        </div>
      )}

      {validationResult && (
        <div className="space-y-4">
          {validationResult.valid ? (
            <Alert className="border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                JSON is valid. Ready to import {validationResult.count} question
                {validationResult.count !== 1 ? "s" : ""}.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Validation failed. {validationResult.errors.length} issue
                {validationResult.errors.length !== 1 ? "s" : ""} found.
              </AlertDescription>
            </Alert>
          )}

          {validationResult.preview && validationResult.preview.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Questions found ({validationResult.preview.length})
              </p>
              <div className="divide-y overflow-hidden rounded-lg border bg-card">
                {validationResult.preview.map((q, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="truncate">{q.title}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted px-2 py-0.5 uppercase tracking-wide">
                        {q.type}
                      </span>
                      {q.difficulty && <span>{q.difficulty}</span>}
                      {q.marks !== undefined && <span>{q.marks} pts</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {validationResult.errors.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Errors</p>
              <div className="divide-y overflow-hidden rounded-lg border bg-card">
                {groupErrors(validationResult.errors).map(([group, errs]) => (
                  <div key={group} className="px-3 py-2.5">
                    <p className="mb-1.5 text-xs font-medium text-foreground">{group}</p>
                    <ul className="space-y-1">
                      {errs.map((err, idx) => (
                        <li key={idx} className="flex items-baseline gap-2 text-xs text-destructive">
                          {err.field && (
                            <span className="shrink-0 rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-destructive">
                              {err.field}
                            </span>
                          )}
                          <span>{err.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {validationResult.warnings && validationResult.warnings.length > 0 && (
            <div className="space-y-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900/50 dark:bg-yellow-950/30">
              {validationResult.warnings.map((warn, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-400"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {importStatus && (
        <Alert
          variant={importStatus.success ? "default" : "destructive"}
          className={
            importStatus.success
              ? "mt-4 border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30"
              : "mt-4"
          }
        >
          {importStatus.success ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription
            className={importStatus.success ? "text-green-700 dark:text-green-400" : undefined}
          >
            {importStatus.message}
          </AlertDescription>
        </Alert>
      )}
    </>
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-import-title"
      className="fixed inset-x-0 bottom-0 top-[var(--banner-h,0px)] z-[100] flex flex-col bg-background"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-6 py-4 lg:px-10">
        <div className="flex items-center gap-2.5">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <h2 id="bulk-import-title" className="text-base font-semibold">Bulk Import Questions</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[1fr_380px] lg:overflow-hidden">
        {/* Editor pane */}
        <div className="flex min-h-0 flex-1 flex-col px-6 py-6 lg:h-full lg:px-10 lg:py-8">
          <Tabs defaultValue="paste" className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex shrink-0 items-center justify-between gap-4">
              <TabsList>
                <TabsTrigger value="paste">Paste JSON</TabsTrigger>
                <TabsTrigger value="upload">Upload File</TabsTrigger>
              </TabsList>

              <a href="/templates/questions_template.json" download>
                <Button variant="ghost" size="sm" type="button" className="gap-1.5 text-muted-foreground">
                  <Download className="h-3.5 w-3.5" />
                  Template
                </Button>
              </a>
            </div>

            <TabsContent value="paste" className="flex min-h-0 flex-1 flex-col gap-3 data-[state=inactive]:hidden">
              <Textarea
                value={jsonInput}
                onChange={(e) => handleJsonInputChange(e.target.value)}
                placeholder={EXAMPLE_JSON_PLACEHOLDER}
                className="min-h-0 flex-1 resize-none overflow-y-auto font-mono text-xs [field-sizing:fixed]"
              />
              <p className="shrink-0 text-xs text-muted-foreground">
                Accepts <code className="rounded bg-muted px-1 py-0.5 font-mono">{"{ questions: [...] }"}</code> or a single question. Not sure of the shape? Download the template above.
              </p>

              <Button onClick={handleValidate} variant="outline" className="w-full shrink-0">
                Validate JSON
              </Button>
            </TabsContent>

            <TabsContent value="upload" className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-16 text-center lg:py-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <FileJson className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">JSON files only</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Select File
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Results follow the editor on mobile, where the side panel collapses into the flow */}
          <div className="mt-4 lg:hidden">{resultsPanel}</div>
        </div>

        {/* Results pane */}
        <div className="hidden min-h-0 border-l bg-muted/20 px-6 py-6 lg:block lg:h-full lg:overflow-y-auto lg:px-8 lg:py-8">
          {resultsPanel}
        </div>
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-4 lg:px-10">
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
        <Button
          onClick={handleImport}
          disabled={!validationResult?.valid || isLoading}
        >
          {isLoading ? "Importing..." : "Import Questions"}
        </Button>
      </div>
    </div>,
    document.body
  );
}
