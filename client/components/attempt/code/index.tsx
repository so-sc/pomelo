"use client";
import React, { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsClient } from "@/hooks/use-is-client";
import CodeEditorPanel from "./code-editor";
import DescriptionPanel from "./description";
import TestCasePanel from "./test-case";
import { CodingProblem } from "@/types/problem";

// Drafts are keyed by the stub they were started from, not just the question, so a
// question whose signature changed cannot restore code written against the old one.
function fingerprint(source: string): string {
  let hash = 5381;
  for (let i = 0; i < source.length; i++) {
    hash = ((hash << 5) + hash + source.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

export function CodeScreen({
  problem,
  draftKeyPrefix = "pomelo_draft",
}: {
  problem: CodingProblem;
  draftKeyPrefix?: string;
}) {
  const availableLanguages = Object.keys(problem.boilerplateCode || {}) as Array<keyof typeof problem.boilerplateCode>;
  
  const initialLanguage = problem.savedLanguage || (availableLanguages.length > 0 ? String(availableLanguages[0]) : "javascript");
  const [language, setLanguage] = useState(initialLanguage);
  
  const [code, setCode] = useState(problem.savedCode || (problem.boilerplateCode && availableLanguages.length > 0 ? (problem.boilerplateCode[initialLanguage as keyof typeof problem.boilerplateCode] || "") : "// Start coding here"));
  const isMounted = useIsClient();

  const { id: problemId, boilerplateCode } = problem;
  const draftKey = React.useCallback(
    (lang: string) => {
      const stub = boilerplateCode?.[lang as keyof typeof boilerplateCode] || "";
      return `${draftKeyPrefix}_${problemId}_${lang}_${fingerprint(stub)}`;
    },
    [problemId, boilerplateCode, draftKeyPrefix]
  );

  // Restore the language and draft this browser last had open; drafts are saved on every
  // edit, so they are never older than the code the server saved at the last submit.
  const languageKey = `${draftKeyPrefix}_${problemId}_language`;
  const restoreKey = isMounted ? languageKey : null;
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  if (restoreKey !== restoredKey) {
    setRestoredKey(restoreKey);
    if (restoreKey) {
      try {
        const stored = localStorage.getItem(restoreKey);
        if (stored && (availableLanguages as string[]).includes(stored)) {
          const draft = localStorage.getItem(draftKey(stored));
          setLanguage(stored);
          setCode(draft ?? (stored === problem.savedLanguage && problem.savedCode
            ? problem.savedCode
            : boilerplateCode?.[stored as keyof typeof boilerplateCode] || ""));
        } else if (!problem.savedCode) {
          const draft = localStorage.getItem(draftKey(initialLanguage));
          if (draft) setCode(draft);
        }
      } catch { /* localStorage unavailable (e.g. private browsing) */ }
    }
  }

  React.useEffect(() => {
    if (isMounted && code !== "") {
      try {
        localStorage.setItem(draftKey(language), code);
        localStorage.setItem(languageKey, language);
      } catch { /* localStorage unavailable */ }
    }
  }, [code, language, isMounted, draftKey, languageKey]);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    
    // Prioritize server-saved code if this is the language they originally submitted in
    if (problem.savedLanguage === newLang && problem.savedCode) {
      setCode(problem.savedCode);
      return;
    }

    // Try loading from local storage
    let draft: string | null = null;
    try { draft = localStorage.getItem(draftKey(newLang)); } catch { /* unavailable */ }
    if (draft) {
      setCode(draft);
    } else {
      setCode(problem.boilerplateCode ? (problem.boilerplateCode[newLang as keyof typeof problem.boilerplateCode] || "") : "// Start coding here");
    }
  };

  if (!isMounted) return null;

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="w-full h-full border"
    >
      <ResizablePanel defaultSize={30} minSize={4}>
        <div className="flex h-full w-full">
          <DescriptionPanel problem={problem} />
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={70} minSize={20}>
        <ResizablePanelGroup direction="vertical" className="h-full w-full">
          <ResizablePanel defaultSize={55} minSize={6}>
            <div className="flex h-full w-full ">
              <CodeEditorPanel
                problem={problem}
                code={code}
                setCode={setCode}
                language={language}
                setLanguage={handleLanguageChange}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={45} minSize={6}>
            <div className="flex h-full w-full">
              <TestCasePanel
                problem={problem}
                code={code}
                language={language}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
