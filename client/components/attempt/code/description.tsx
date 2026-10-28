import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CodingProblem } from "@/types/problem";
import { CodeXml } from "lucide-react";
import React from "react";

export default function DescriptionPanel({
  problem,
}: {
  problem: CodingProblem;
}) {
  return (
    <div className="flex flex-col w-full">
      {/* Header */}
      <div className="px-4 py-2 border-b bg-muted flex items-center justify-between text-sm h-11">
        <Label className="flex items-center gap-2">
          <CodeXml className="h-4 w-4" />
          Description
        </Label>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-4 p-4 pb-18 text-sm">
          <div>
            <h2 className="text-2xl font-semibold pb-4 wrap-anywhere">{problem.title}</h2>
            <p className="text-muted-foreground whitespace-pre-line wrap-anywhere">{problem.description}</p>
          </div>

          <Separator />

          <div className="flex gap-8">
            <div>
              <Label className="text-muted-foreground upper">Difficulty</Label>
              <div className="text-sm capitalize">{problem.difficulty}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Points</Label>
              <div className="text-sm">{problem.marks || 0}</div>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-muted-foreground">Input Format</Label>
            <p className="whitespace-pre-wrap">{problem.inputFormat}</p>
          </div>

          <div>
            <Label className="text-muted-foreground">Output Format</Label>
            <p className="whitespace-pre-wrap">{problem.outputFormat}</p>
          </div>

          {problem.constraints && (
            <>
              <Separator />
              <div>
                <Label className="text-muted-foreground pb-2 block">Constraints</Label>
                <ul className="list-disc pl-5">
                  {problem.constraints.split(/\n|,/).map(s => s.trim()).filter(Boolean).map((constraint, index) => (
                    <li key={index} className="whitespace-pre-wrap">{constraint}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {problem.examples && problem.examples.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <Label className="text-muted-foreground">Examples</Label>
                {problem.examples.map((example, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <Separator />}
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">Example {index + 1}:</p>
                      <div>
                        <span className="text-muted-foreground block">Input:</span>
                        <code className="rounded-md border bg-muted/30 px-2 py-1 font-mono whitespace-pre-wrap inline-block mt-1">
                          {example.input}
                        </code>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Output:</span>
                        <code className="rounded-md border bg-muted/30 px-2 py-1 font-mono whitespace-pre-wrap inline-block mt-1">
                          {example.output}
                        </code>
                      </div>
                      {example.explanation && (
                        <div>
                          <span className="text-muted-foreground block">Explanation:</span>
                          <p className="whitespace-pre-wrap mt-1">{example.explanation}</p>
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
