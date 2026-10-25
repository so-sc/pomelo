"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useIsClient } from "@/hooks/use-is-client";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Upload } from "lucide-react";
import BulkImportDialog from "./bulk-import-dialog";

export function QuestionHeader() {
  const router = useRouter();
  const isClient = useIsClient();
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  if (!isClient) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 bg-card border border-border rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Questions
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl">
            Create and manage questions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4" />
            Bulk Add
          </Button>
          <Button>
            <Plus className="h-4 w-4" />
            Create New
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 bg-card border border-border rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Questions
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl">
            Create and manage questions
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsBulkImportOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Bulk Add
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Create New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href="/admin/questions/mcq/new">
                <DropdownMenuItem>MCQ Format</DropdownMenuItem>
              </Link>
              <Link href="/admin/questions/coding/new">
                <DropdownMenuItem>Coding Format</DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <BulkImportDialog
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </>
  );
}
