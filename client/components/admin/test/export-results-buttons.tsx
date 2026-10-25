"use client";

import { Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/banner";
import { exportContestScores, exportContestSubmissions } from "@/actions/export-results";

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugify(title: string) {
  // Same rule as the server's export filenames: letters and digits only.
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "contest";
}

export default function ExportResultsButtons({
  contestId,
  contestTitle,
}: {
  contestId: string;
  contestTitle: string;
}) {
  const handleExportScores = async () => {
    const result = await exportContestScores(contestId);
    if (!result.success) {
      toast.error("Export failed", { description: result.message });
      return;
    }

    downloadBlob(
      result.csv,
      `scores-${slugify(contestTitle)}-${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv"
    );
    toast.success("Scores exported");
  };

  const handleExportSubmissions = async (verbose: boolean) => {
    const result = await exportContestSubmissions(contestId, verbose);
    if (!result.success) {
      toast.error("Export failed", { description: result.message });
      return;
    }

    downloadBlob(
      JSON.stringify(result.payload, null, 2),
      `submissions-${slugify(contestTitle)}-${verbose ? "verbose" : "compact"}-${new Date().toISOString().split("T")[0]}.json`,
      "application/json"
    );
    toast.success("Submissions exported");
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleExportScores}>
        <Download className="h-3.5 w-3.5" />
        Export Scores
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-3.5 w-3.5" />
            Export Submissions
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExportSubmissions(false)}>
            Compact
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExportSubmissions(true)}>
            Verbose
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
