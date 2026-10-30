"use client";

import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { ElementList } from "./element-list";
import type { EditorProps } from "./types";

export function MatrixEditor({ value, onChange }: EditorProps) {
    const rows: string[][] = Array.isArray(value)
        ? value.map((row) => (Array.isArray(row) ? row : []))
        : [];
    const width = rows[0]?.length ?? 0;

    return (
        <div className="space-y-2">
            {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="p-2 border rounded-md space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Row {rowIndex + 1}</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            aria-label="Remove row"
                            onClick={() => onChange(rows.filter((_, i) => i !== rowIndex))}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <ElementList
                        value={row}
                        onChange={(next) => {
                            const updated = [...rows];
                            updated[rowIndex] = next;
                            onChange(updated);
                        }}
                        label="Column"
                    />
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => onChange([...rows, Array.from({ length: width }, () => "")])}
            >
                <Plus className="h-3 w-3 mr-1" /> Add Row
            </Button>
        </div>
    );
}
