"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import type { EditorProps } from "./types";

// Edges are fixed arity — two endpoints, plus a weight when the type is weighted.
// Building the row here rather than with a free-form matrix makes a ragged edge
// list unrepresentable instead of merely invalid.
export function GraphEditor({ value, onChange, record }: EditorProps) {
    const compound = (value || {}) as { nodes?: unknown; edges?: unknown };
    const nodes = String(compound.nodes ?? "");
    const weighted = (record.edgeWidth ?? 2) > 2;
    const edges: string[][] = Array.isArray(compound.edges)
        ? compound.edges.map((edge) => (Array.isArray(edge) ? edge.map(String) : []))
        : [];

    const update = (next: Partial<{ nodes: string; edges: string[][] }>) =>
        onChange({ nodes, edges, ...next });

    const setCell = (edgeIndex: number, cell: number, cellValue: string) => {
        const next = edges.map((edge) => [...edge]);
        next[edgeIndex][cell] = cellValue;
        update({ edges: next });
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Nodes</span>
                <Input
                    value={nodes}
                    onChange={(e) => update({ nodes: e.target.value })}
                    placeholder="0"
                    className="h-8 text-sm w-24"
                />
                <span className="text-xs text-muted-foreground">
                    {Number(nodes) > 0 ? `numbered 0…${Number(nodes) - 1}` : ""}
                </span>
            </div>

            {edges.map((edge, index) => (
                <div key={index} className="flex items-center gap-1.5">
                    <Input
                        value={edge[0] ?? ""}
                        onChange={(e) => setCell(index, 0, e.target.value)}
                        placeholder="from"
                        className="h-8 text-sm flex-1"
                    />
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input
                        value={edge[1] ?? ""}
                        onChange={(e) => setCell(index, 1, e.target.value)}
                        placeholder="to"
                        className="h-8 text-sm flex-1"
                    />
                    {weighted && (
                        <Input
                            value={edge[2] ?? ""}
                            onChange={(e) => setCell(index, 2, e.target.value)}
                            placeholder="weight"
                            className="h-8 text-sm w-20"
                        />
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive shrink-0"
                        aria-label="Remove edge"
                        onClick={() => update({ edges: edges.filter((_, i) => i !== index) })}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ))}

            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() =>
                    update({ edges: [...edges, Array.from({ length: record.edgeWidth ?? 2 }, () => "")] })
                }
            >
                <Plus className="h-3 w-3 mr-1" /> Add Edge
            </Button>
        </div>
    );
}
