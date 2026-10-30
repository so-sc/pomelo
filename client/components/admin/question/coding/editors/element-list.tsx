"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

// Shared by the list, matrix and list+index editors.
export function ElementList({
    value,
    onChange,
    label,
}: {
    value: unknown;
    onChange: (next: string[]) => void;
    label: string;
}) {
    const items: string[] = Array.isArray(value) ? value : [];

    return (
        <div className="space-y-1.5">
            {items.map((item, index) => (
                <div key={index} className="flex gap-1.5">
                    <Input
                        value={item ?? ""}
                        onChange={(e) => {
                            const next = [...items];
                            next[index] = e.target.value;
                            onChange(next);
                        }}
                        className="h-8 text-sm flex-1"
                        placeholder={`${label} ${index + 1}`}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        aria-label="Remove item"
                        onClick={() => onChange(items.filter((_, i) => i !== index))}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs mt-1"
                onClick={() => onChange([...items, ""])}
            >
                <Plus className="h-3 w-3 mr-1" /> Add {label}
            </Button>
        </div>
    );
}
