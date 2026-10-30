"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface SubmitConfirmDialogProps {
  open: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SubmitConfirmDialog({
  open,
  isSubmitting,
  onConfirm,
  onCancel,
}: SubmitConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      busy={isSubmitting}
      title="Finish the test?"
      description="Are you sure you want to finish the test? You cannot change your answers after this."
      cancelLabel="Keep working"
      confirmLabel="Finish test"
      busyLabel="Finishing..."
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
