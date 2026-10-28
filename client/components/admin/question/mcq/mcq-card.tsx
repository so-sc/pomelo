"use client";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil } from "lucide-react";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function MCQCard() {
  const { control, watch, setValue } = useFormContext();

  const questionType = watch("questionType");
  const correctAnswer = watch("correctAnswer") || "";
  const options = watch("options");

  useEffect(() => {
    const safeOptions = options || [];
    if (safeOptions.length !== 4) {
      setValue(
        "options",
        Array.from({ length: 4 }, (_, i) => {
          const existing = safeOptions[i];
          return existing
            ? { id: existing.id ?? `${i}`, text: existing.text ?? "" }
            : { id: `${i}`, text: "" };
        })
      );
    }
  }, [options, setValue]);

  const handleSingleSelect = (selectedId: string) => {
    setValue("correctAnswer", selectedId);
  };

  const handleMultiToggle = (id: string, checked: boolean) => {
    const current = correctAnswer ? correctAnswer.split(',') : [];
    const set = new Set(current);
    if (checked) {
      set.add(id);
    } else {
      set.delete(id);
    }
    // Sort logic to keep it deterministic "0,2"
    const newVal = Array.from(set).sort().join(',');
    setValue("correctAnswer", newVal);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pencil className="h-5 w-5 text-primary" />
          MCQ Options
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Question Type */}
        <FormField
          control={control}
          name="questionType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question Type</FormLabel>
              <Select onValueChange={(val) => {
                field.onChange(val);
                // Clear selections on type change to avoid invalid states
                setValue("correctAnswer", "");
              }} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="single">Single Correct</SelectItem>
                  <SelectItem value="multiple">Multiple Correct</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Option Inputs */}
        <div className="space-y-2">
          <FormLabel className="text-base">Options</FormLabel>
          {Array.from({ length: 4 }, (_, index) => (
            <FormField
              key={index}
              control={control}
              name={`options.${index}.text`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Option {index + 1}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Option text" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>

        {/* Correct Option Selection with validation */}
        <FormField
          control={control}
          name="correctAnswer"
          render={() => (
            <FormItem>
              <FormLabel className="text-base mt-6">
                Select Correct Option(s)
              </FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {questionType === "single" && (
                    <RadioGroup
                      value={correctAnswer}
                      onValueChange={handleSingleSelect}
                      className="space-y-1"
                    >
                      {Array.from({ length: 4 }, (_, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <RadioGroupItem value={`${index}`} id={`correct-${index}`} />
                          <label htmlFor={`correct-${index}`} className="text-sm font-medium cursor-pointer">
                            {options?.[index]?.text || `Option ${index + 1}`}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {questionType === "multiple" &&
                    Array.from({ length: 4 }, (_, index) => {
                      const optionId = `${index}`;
                      const isChecked = correctAnswer.split(',').includes(optionId);
                      return (
                        <div key={index} className="flex items-center gap-3">
                          <Checkbox
                            id={`correct-${index}`}
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              handleMultiToggle(optionId, !!checked)
                            }
                          />
                          <label htmlFor={`correct-${index}`} className="text-sm font-medium cursor-pointer">
                            {options?.[index]?.text || `Option ${index + 1}`}
                          </label>
                        </div>
                      );
                    })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
