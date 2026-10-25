"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Problem, MCQProblem } from "@/types/problem";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "@/components/ui/banner";

import { useAttemptRuntime } from "./attempt-runtime";
import SubmitConfirmDialog from "./submit-confirm-dialog";
import { useTestCompletion } from "./use-test-completion";

interface MCQScreenProps {
  problem: MCQProblem;
  problems: Problem[];
}

const DEBOUNCE_MS = 800;

export default function MCQScreen({ problem, problems }: MCQScreenProps) {
  const [selected, setSelected] = useState<string[]>(problem.savedAnswer || []);
  const router = useRouter();
  const params = useParams();
  const runtime = useAttemptRuntime();
  const [isSaving, setIsSaving] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the latest selection for debounced flush
  const pendingSelectionRef = useRef<string[] | null>(null);
  // Track the latest in-flight save so Finish can await it before submitting
  const lastSaveRef = useRef<Promise<void> | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const { completeTest, isSubmitting } = useTestCompletion();

  // Create sorting logic matching TestHeader: MCQs first, then Coding
  const mcqProblems = problems.filter((p) => p.type === "mcq");
  const codingProblems = problems.filter((p) => p.type === "coding");
  const sortedProblems = [...mcqProblems, ...codingProblems];

  const correctIndices = useMemo(() => {
    if (runtime.mode !== "preview" || !problem.correctAnswer) return new Set<number>();
    return new Set(
      String(problem.correctAnswer)
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n))
    );
  }, [runtime.mode, problem.correctAnswer]);

  const currentIndex = sortedProblems.findIndex((p) => String(p.id) === String(problem._id || problem.id));
  const prevProblem = sortedProblems[currentIndex - 1];
  const nextProblem = sortedProblems[currentIndex + 1];

  const doSave = useCallback(async (answers: string[]) => {
    setIsSaving(true);
    try {
      const data = await runtime.saveMcqAnswer(String(problem._id || problem.id), answers);
      if (!data.success) {
        if (data.rateLimited) {
          toast.error(data.error || "Rate limited — please slow down");
        } else {
          toast.error(data.error || "Failed to save answer");
        }
      }
    } catch {
      toast.error("Network error saving answer");
    } finally {
      setIsSaving(false);
      pendingSelectionRef.current = null;
    }
  }, [runtime, problem._id, problem.id]);

  const flushPending = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingSelectionRef.current !== null) {
      lastSaveRef.current = doSave(pendingSelectionRef.current);
    }
  }, [doSave]);

  const scheduleSave = useCallback((answers: string[]) => {
    pendingSelectionRef.current = answers;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      lastSaveRef.current = doSave(answers);
    }, DEBOUNCE_MS);
  }, [doSave]);

  // A debounced or in-flight save must land before the test is submitted (from any
  // submit path) or this question unmounts, e.g. when switching questions from the tray.
  const flushAll = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingSelectionRef.current !== null) {
      lastSaveRef.current = doSave(pendingSelectionRef.current);
    }
    await lastSaveRef.current?.catch(() => {});
  }, [doSave]);

  const { registerPendingSave } = runtime;
  useEffect(() => {
    const unregister = registerPendingSave(flushAll);
    return () => {
      void flushAll();
      unregister();
    };
  }, [registerPendingSave, flushAll]);

  const isMultiple = problem.questionType === "Multiple Correct";

  const handleSingleSelect = (value: string) => {
    const newSelection = [value];
    setSelected(newSelection);
    // Single correct: submit immediately (no debounce needed — one click)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingSelectionRef.current = null;
    lastSaveRef.current = doSave(newSelection);
  };

  const handleMultipleSelect = (value: string) => {
    const newSelection = selected.includes(value)
      ? selected.filter((v: string) => v !== value)
      : [...selected, value];
    setSelected(newSelection);
    // Multiple correct: debounce so rapid clicks batch together
    scheduleSave(newSelection);
  };

  const handlePrev = () => {
    flushPending();
    if (prevProblem) {
      router.push(`/attempt/test/${params.testid}/question/${prevProblem.id}`);
    }
  };

  const handleNext = () => {
    flushPending();
    if (nextProblem) {
      router.push(`/attempt/test/${params.testid}/question/${nextProblem.id}`);
    }
  };

  const handleFinishClick = () => {
    setShowSubmitDialog(true);
  };

  const handleFinishConfirm = async () => {
    // completeTest lands any pending answer saves first.
    const result = await completeTest();
    if (result.success) {
      setShowSubmitDialog(false);
    }
  };

  return (
    <div className="h-full bg-background p-4 flex justify-center items-center overflow-hidden">
      <Card className="border-border bg-card shadow-lg w-full max-w-3xl h-[90vh]">
        <div className="flex items-center gap-3 px-6 h-14 border-b border-border">
          <Badge variant="secondary" className="capitalize px-3 py-1">
            {problem.difficulty}
          </Badge>
          <span className="text-sm font-medium text-muted-foreground">
            {problem.marks} Points
          </span>
          {isSaving && <span className="text-xs text-muted-foreground animate-pulse ml-auto">Saving...</span>}
        </div>
        <ScrollArea className="min-h-0 px-6 h-[calc(90vh-7rem)] flex-1">
          <div className="py-6 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-xl font-semibold text-foreground text-start break-words">
                {problem.title}
              </h1>
              {/* Question Type */}
              <div className="flex items-center gap-2 mt-2">
                <div className="h-2 w-2 bg-primary rounded-full"></div>
                <span className="text-sm font-medium text-muted-foreground">
                  {isMultiple ? "Multiple Choice" : "Single Choice"}
                </span>
              </div>
              {/* Description */}
              <p className="mt-4 text-foreground/80 leading-relaxed break-words">
                {problem.description}
              </p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isMultiple ? (
                <RadioGroup
                  value={selected[0]}
                  onValueChange={handleSingleSelect}
                  className="contents"
                >
                  {problem.options.map((opt, index) => {
                    const optId = `opt-${index}`;
                    const optValue = opt;
                    return (
                      <div key={optId} className="h-full">
                        <label
                          htmlFor={optId}
                          className={`
                          group block w-full h-full border-2 rounded-xl p-4 cursor-pointer transition-all duration-200
                          ${selected.includes(optValue)
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                            }
                        `}
                        >
                          <div className="flex items-center gap-3 h-full">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium shrink-0 group-hover:bg-primary/10 transition-colors">
                              {String.fromCharCode(65 + index)}
                            </div>
                            <RadioGroupItem
                              value={optValue}
                              id={optId}
                              className="shrink-0"
                            />
                            <span className="text-base font-medium flex-1 min-w-0 break-words text-foreground">
                              {optValue}
                            </span>
                            {correctIndices.has(index) && (
                              <Badge variant="secondary" className="shrink-0">
                                Correct
                              </Badge>
                            )}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </RadioGroup>
              ) : (
                <>
                  {problem.options.map((opt, index) => {
                    const optId = `opt-${index}`;
                    const optValue = opt;
                    return (
                      <div key={optId} className="h-full">
                        <label
                          htmlFor={optId}
                          className={`
                          group block w-full h-full border-2 rounded-xl p-4 cursor-pointer transition-all duration-200
                          ${selected.includes(optValue)
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                            }
                        `}
                        >
                          <div className="flex items-center gap-3 h-full">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium shrink-0 group-hover:bg-primary/10 transition-colors">
                              {String.fromCharCode(65 + index)}
                            </div>
                            <Checkbox
                              id={optId}
                              checked={selected.includes(optValue)}
                              onCheckedChange={() => handleMultipleSelect(optValue)}
                              className="shrink-0"
                            />
                            <span className="text-base font-medium flex-1 min-w-0 break-words text-foreground">
                              {optValue}
                            </span>
                            {correctIndices.has(index) && (
                              <Badge variant="secondary" className="shrink-0">
                                Correct
                              </Badge>
                            )}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Navigation Buttons */}
        <div className="h-14 border-t border-border flex items-center justify-between px-6 bg-muted/20">
          <Button
            variant="outline"
            className="px-6 font-medium"
            onClick={handlePrev}
            disabled={!prevProblem}
          >
            Prev
          </Button>
          <Button
            className="px-6 font-medium"
            onClick={nextProblem ? handleNext : handleFinishClick}
          >
            {nextProblem ? "Next" : "Finish"}
          </Button>
        </div>
      </Card>

      <SubmitConfirmDialog
        open={showSubmitDialog}
        isSubmitting={isSubmitting}
        onConfirm={handleFinishConfirm}
        onCancel={() => setShowSubmitDialog(false)}
      />
    </div>
  );
}
