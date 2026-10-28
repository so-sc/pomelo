"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { NULL_TOKEN } from "@pomelo/code-gen";
import type { EditorProps } from "./types";

// Same wire shape as a list, but "null" is a structural marker rather than a value,
// so it gets a toggle instead of the author typing the word into a text field.
export function TreeEditor({ value, onChange }: EditorProps) {
    const slots: string[] = Array.isArray(value) ? value.map(String) : [];

    const setSlot = (index: number, next: string) => {
        const updated = [...slots];
        updated[index] = next;
        onChange(updated);
    };

    return (
        <div className="space-y-1.5">
            {slots.map((slot, index) => {
                const isNull = slot === NULL_TOKEN;
                return (
                    <div key={index} className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground w-6 shrink-0 tabular-nums">
                            {index + 1}
                        </span>
                        <Input
                            value={isNull ? "" : slot}
                            onChange={(e) => setSlot(index, e.target.value)}
                            disabled={isNull}
                            placeholder={isNull ? "empty" : "value"}
                            className="h-8 text-sm flex-1"
                        />
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer shrink-0">
                            <Checkbox
                                checked={isNull}
                                onCheckedChange={(checked) => setSlot(index, checked === true ? NULL_TOKEN : "")}
                            />
                            null
                        </label>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive shrink-0"
                            aria-label="Remove node"
                            onClick={() => onChange(slots.filter((_, i) => i !== index))}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                );
            })}
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs mt-1"
                onClick={() => onChange([...slots, ""])}
            >
                <Plus className="h-3 w-3 mr-1" /> Add Node
            </Button>
        </div>
    );
}
