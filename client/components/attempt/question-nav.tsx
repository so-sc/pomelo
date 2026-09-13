"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuestionProgress, useAttemptRuntime } from "./attempt-runtime";

export type ProblemMeta = { id: string; type: string };

function Group({ label, problems, currentId, progress, visited, onSelect }: {
  label: string;
  problems: ProblemMeta[];
  currentId: string | undefined;
  progress: Record<string, QuestionProgress>;
  visited: Set<string>;
  onSelect: (id: string) => void;
}) {
  if (problems.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">{label}</span>
      {problems.map((p, i) => {
        const status = progress[p.id];
        const isVisited = visited.has(p.id);
        const isActive = p.id === currentId;
        return (
          <button
            key={p.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            title={status === "solved" ? "Solved" : status === "attempted" ? "Attempted" : isVisited ? "Visited" : "Not visited"}
            onClick={() => onSelect(p.id)}
            className={cn(
              "h-8 w-8 rounded-full text-xs font-medium tabular-nums border transition-colors",
              "flex items-center justify-center",
              status === "solved"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                : status === "attempted"
                  ? "bg-amber-400/10 border-amber-400/50 text-amber-700 dark:text-amber-400"
                  : isVisited
                    ? "border-foreground/40 text-muted-foreground hover:text-foreground"
                    : "border-border/70 text-muted-foreground hover:text-foreground hover:border-foreground/30",
              isActive && "ring-1 ring-foreground/60 ring-offset-2 ring-offset-background"
            )}
          >
            {status === "solved" ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
          </button>
        );
      })}
    </div>
  );
}

export default function QuestionNav({ problems }: { problems: ProblemMeta[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { progress } = useAttemptRuntime();
  const currentId = pathname.split("/").pop();
  const [visited, setVisited] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (currentId) setVisited((prev) => (prev.has(currentId) ? prev : new Set(prev).add(currentId)));
  }, [currentId]);

  const mcq = problems.filter((p) => p.type !== "coding");
  const coding = problems.filter((p) => p.type === "coding");
  const solvedCount = problems.filter((p) => progress[p.id] === "solved").length;
  const select = (id: string) => router.push(`/attempt/test/${params.testid}/question/${id}`);

  return (
    <aside className="flex flex-col w-14 shrink-0 h-full bg-background select-none">
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center gap-6 py-4">
        <Group label="MCQ" problems={mcq} currentId={currentId} progress={progress} visited={visited} onSelect={select} />
        <Group label="Code" problems={coding} currentId={currentId} progress={progress} visited={visited} onSelect={select} />
      </div>
      <div
        className="flex flex-col items-center py-3 border-t text-xs tabular-nums"
        title={`${solvedCount} of ${problems.length} solved`}
      >
        <span className="font-medium text-foreground">{solvedCount}</span>
        <span className="text-muted-foreground">of {problems.length}</span>
      </div>
    </aside>
  );
}
