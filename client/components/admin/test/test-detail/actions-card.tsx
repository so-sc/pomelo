"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cloneTestAction } from "@/actions/clone-test";
import { endTestAction } from "@/actions/end-test";
import { deleteTestAction } from "@/actions/delete-test";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, BarChart3, Copy, Loader2, Trophy, OctagonX, Ban, Trash2 } from "lucide-react";
import { Test } from "@/types/test";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/banner";

interface QuickActionsCardProps {
  test: Test;
}

export function QuickActionsCard({ test }: QuickActionsCardProps) {
  const { id: testId, status } = test;
  const router = useRouter();
  const [isCloning, setIsCloning] = useState(false);
  const [endingAction, setEndingAction] = useState<"end" | "force-end" | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { confirm, dialog } = useConfirm();

  const handleClone = async () => {
    const ok = await confirm({
      title: "Duplicate this test?",
      description: "A copy with the same questions and settings opens for editing.",
      confirmLabel: "Duplicate",
    });
    if (!ok) return;

    setIsCloning(true);
    const res = await cloneTestAction(testId as string);
    setIsCloning(false);
    if (res.success && res.newTestId) {
      router.push(`/admin/tests/${res.newTestId}/edit`);
    } else {
      toast.error(res.message || "Failed to duplicate test");
    }
  };

  const handleEndTest = async (force: boolean) => {
    const ok = await confirm(force
      ? {
          title: "Force end this test?",
          description: "Every candidate currently in progress will be submitted immediately with their current answers.",
          confirmLabel: "Force end",
          destructive: true,
        }
      : {
          title: "End this test?",
          description: "No one will be able to join or start it anymore, but candidates already in progress can keep going until their own time runs out.",
          confirmLabel: "End test",
          destructive: true,
        });
    if (!ok) return;

    setEndingAction(force ? "force-end" : "end");
    const res = await endTestAction(testId as string, force);
    setEndingAction(null);

    if (res.success) {
      router.refresh();
    } else {
      toast.error(res.message || "Failed to end test");
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete this test?",
      description: "The test and all of its submissions are removed. This cannot be undone.",
      confirmLabel: "Delete test",
      destructive: true,
    });
    if (!ok) return;

    setIsDeleting(true);
    const res = await deleteTestAction(testId as string);
    setIsDeleting(false);

    if (res.success) {
      router.push("/admin/tests");
    } else {
      toast.error(res.message || "Failed to delete test");
    }
  };

  return (
    <Card className="bg-card border-border shadow-md">
      {dialog}
      <CardHeader>
        <CardTitle className="text-xl text-foreground">Quick Actions</CardTitle>
        <CardDescription className="text-muted-foreground">
          Manage this test and view detailed analytics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {status === "waiting" ? (
            <Link href={`/admin/tests/${testId}/edit`}>
              <Button className="w-full h-16 flex flex-col items-center justify-center gap-2">
                <Edit className="h-5 w-5" />
                <span className="text-xs font-medium text-center">
                  Edit Test
                </span>
              </Button>
            </Link>
          ) : (
            <Button
              disabled
              className="w-full h-16 flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground rounded-lg cursor-not-allowed"
            >
              <Edit className="h-5 w-5" />
              <span className="text-xs font-medium text-center">Edit Test</span>
            </Button>
          )}

          <Button
            onClick={handleClone}
            disabled={isCloning}
            variant="outline"
            className="w-full h-16 flex flex-col items-center justify-center gap-2"
          >
            {isCloning ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Copy className="h-5 w-5 text-muted-foreground" />}
            <span className="text-xs font-medium text-center text-muted-foreground">Clone</span>
          </Button>

          <Link href={`/admin/tests/${testId}/result`}>
            <Button
              className="w-full h-16 flex flex-col items-center justify-center gap-2"
              variant={"outline"}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs font-medium text-center">
                View Results
              </span>
            </Button>
          </Link>

          {status === "completed" ? (
            <Link href={`/admin/tests/${testId}/leaderboard`}>
              <Button
                className="w-full h-16 flex flex-col items-center justify-center gap-2"
                variant={"outline"}
              >
                <Trophy className="h-5 w-5" />
                <span className="text-xs font-medium text-center">
                  Leaderboard
                </span>
              </Button>
            </Link>
          ) : (
            <Button
              className="w-full h-16 flex flex-col items-center justify-center gap-2 opacity-60 cursor-not-allowed"
              variant={"outline"}
              title="Leaderboard is available after the test ends"
            >
              <Trophy className="h-5 w-5" />
              <span className="text-xs font-medium text-center">
                Leaderboard
              </span>
            </Button>
          )}

          <Button
            onClick={() => handleEndTest(false)}
            disabled={endingAction !== null || status === "completed"}
            variant="outline"
            className="w-full h-16 flex flex-col items-center justify-center gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5 disabled:opacity-50"
          >
            {endingAction === "end" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Ban className="h-5 w-5" />}
            <span className="text-xs font-medium text-center">End Test</span>
          </Button>

          <Button
            onClick={() => handleEndTest(true)}
            disabled={endingAction !== null || status === "completed"}
            variant="destructive"
            className="w-full h-16 flex flex-col items-center justify-center gap-2 disabled:opacity-50"
          >
            {endingAction === "force-end" ? <Loader2 className="h-5 w-5 animate-spin" /> : <OctagonX className="h-5 w-5" />}
            <span className="text-xs font-medium text-center">Force End</span>
          </Button>

          <Button
            onClick={handleDelete}
            disabled={isDeleting || status === "ongoing"}
            variant="outline"
            title={status === "ongoing" ? "Cannot delete an active test" : undefined}
            className="w-full h-16 flex flex-col items-center justify-center gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5 disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
            <span className="text-xs font-medium text-center">Delete Test</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
