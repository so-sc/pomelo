"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busyLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busyLabel,
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>("button:not(:disabled)")
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocusedRef.current) previouslyFocusedRef.current.focus();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-md outline-none"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`h-5 w-5 ${destructive ? "text-destructive" : "text-amber-500"}`}
                aria-hidden="true"
              />
              <CardTitle id="confirm-dialog-title">{title}</CardTitle>
            </div>
            <CardDescription id="confirm-dialog-description">{description}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button variant={destructive ? "destructive" : "default"} onClick={onConfirm} disabled={busy}>
              {busy && busyLabel ? busyLabel : confirmLabel}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type ConfirmOptions = Omit<ConfirmDialogProps, "open" | "busy" | "busyLabel" | "onConfirm" | "onCancel">;

// Promise-based replacement for window.confirm: `if (!(await confirm({...}))) return;`
// Render `dialog` once in the component that calls `confirm`.
export function useConfirm() {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolveRef = React.useRef<((ok: boolean) => void) | null>(null);

  const confirm = React.useCallback((next: ConfirmOptions) => {
    resolveRef.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const settle = React.useCallback((ok: boolean) => {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    setOptions(null);
  }, []);
  const onConfirm = React.useCallback(() => settle(true), [settle]);
  const onCancel = React.useCallback(() => settle(false), [settle]);

  const dialog = options ? (
    <ConfirmDialog open {...options} onConfirm={onConfirm} onCancel={onCancel} />
  ) : null;

  return { confirm, dialog };
}
