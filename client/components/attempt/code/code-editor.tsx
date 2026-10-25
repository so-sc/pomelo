import React from "react";
import dynamic from "next/dynamic";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CodeXml } from "lucide-react";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";
import { CodingProblem } from "@/types/problem";

type Language = keyof CodingProblem["boilerplateCode"];

const Editor = dynamic(() => import("./monaco-editor"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full bg-muted" />,
});

export default function CodeEditorPanel({
  problem,
  code,
  setCode,
  language,
  setLanguage,
}: {
  problem: CodingProblem;
  code: string;
  setCode: (code: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
}) {
  const boilerplate = problem.boilerplateCode || {};
  const availableLanguages = Object.keys(boilerplate) as Language[];
  const { resolvedTheme } = useTheme();

  const handleLanguageChange = (val: Language) => {
    setLanguage(val);
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Language Selector */}
      <div className="px-2 py-1 border-b flex items-center justify-between text-sm h-11 bg-muted">
        <Label className="flex items-center gap-1">
          <CodeXml className="h-4 w-4" /> Code
        </Label>
        <Select
          onValueChange={handleLanguageChange}
          defaultValue={language}
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Select Language" />
          </SelectTrigger>
          <SelectContent>
            {availableLanguages.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang === "cpp" ? "C++" : lang.charAt(0).toUpperCase() + lang.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Code Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          language={language}
          theme={resolvedTheme === "dark" ? "vs-dark" : "vs-light"}
          value={code}
          onChange={(val) => setCode(val || "")}
          options={{
            minimap: { enabled: false },
            glyphMargin: false,
            folding: true,
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "all",
            renderLineHighlightOnlyWhenFocus: false,
            fontSize: 14,
            tabSize: 2,
          }}
          loading={<Skeleton className="w-full h-full bg-muted" />}
        />
      </div>
    </div>
  );
}
