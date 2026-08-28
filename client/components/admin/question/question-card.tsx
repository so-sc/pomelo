"use client";
// forcing revalidation
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Code, HelpCircle, Pencil, Trash2, Download, Eye } from "lucide-react";
import { BaseProblem } from "@/types/problem/problem.types";
import React from "react";
import Link from "next/link";
import { toast } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { deleteQuestion } from "@/actions/delete-question";
import { exportQuestion } from "@/actions/export-question";

interface Props {
  problem: BaseProblem;
  selected?: boolean;
  onClickQuestion?: (id: string | number) => void;
  className?: string;
  hideActions?: boolean;
}

export default function QuestionCard({
  problem,
  onClickQuestion,
  className,
  hideActions = false,
  selected = false,
}: Props) {
  const getTypeIcon = (type: string | undefined) => {
    return type === "coding" || type === "Coding" ? (
      <Code className="w-4 h-4" />
    ) : (
      <HelpCircle className="w-4 h-4" />
    );
  };
  const getDifficultyColor = (diff: string) => {
    switch (diff?.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "hard":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getDifficultyText = (diff: string) => {
    // Ensure Title Case for display
    if (!diff) return "Unknown";
    return diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
  }

  const handleClick = () => {
    if (onClickQuestion) onClickQuestion(problem._id || problem.id);
  };

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const result = await exportQuestion(String(problem._id || problem.id));
    if (!result.success) {
      toast.error("Export failed", { description: result.message });
      return;
    }

    const blob = new Blob([JSON.stringify(result.payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `question-${problem.title?.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Question exported");
  };

  return (
    <div
      className={cn(
        "group flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer",
        selected && "border-primary bg-primary/5 ring-1 ring-primary",
        className
      )}
      onClick={handleClick}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-medium text-foreground">{problem.title}</h4>
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              getDifficultyColor(problem.difficulty)
            )}
          >
            {getDifficultyText(problem.difficulty)}
          </span>

          <Badge variant="outline" className="flex items-center gap-1">
            {getTypeIcon(problem.type || "coding")}
            {(problem.questionType || problem.type || "Unknown").toUpperCase()}
          </Badge>

          {problem.removedFromBank && (
            <Badge variant="destructive" title="Deleted from the question bank — removing it here is permanent">
              Deleted from bank
            </Badge>
          )}
        </div>
      </div>

      {!hideActions && (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleExport}
            title="Export as JSON"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
            <Link
              href={`/admin/questions/${(problem.type || "coding").toLowerCase()}/${problem._id || problem.id}/preview`}
              onClick={(e) => e.stopPropagation()}
              title="Preview in the candidate UI"
            >
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
            <Link
              href={`/admin/questions/${(problem.type || "coding").toLowerCase()}/${problem._id || problem.id}/edit`}
              onClick={(e) => e.stopPropagation()}
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
            onClick={async (e) => {
              e.stopPropagation();
              e.preventDefault();
              if (confirm("Are you sure you want to delete this question?")) {
                const res = await deleteQuestion(String(problem._id || problem.id));
                if (res.success) {
                  toast.success("Question deleted");
                } else {
                  toast.error("Delete failed", { description: res.error || "Failed to delete question" });
                }
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
