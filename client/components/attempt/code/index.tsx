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
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  const restoreKey = isMounted ? languageKey : null;
  if (restoreKey && restoredKey !== restoreKey) {
    setRestoredKey(restoreKey);
    try {
      const stored = localStorage.getItem(restoreKey);
      const restoredLanguage = stored && (availableLanguages as string[]).includes(stored)
        ? stored
        : initialLanguage;
      setLanguage(restoredLanguage);

      // The server's saved answer wins for its submitted language. Local drafts
      // restore other languages without replacing the authoritative saved code.
      if (restoredLanguage === problem.savedLanguage && problem.savedCode) {
        setCode(problem.savedCode);
      } else {
        const draft = localStorage.getItem(draftKey(restoredLanguage))
          ?? (!stored && !problem.savedCode ? localStorage.getItem(draftKey(initialLanguage)) : null);
        if (draft !== null) setCode(draft);
        else {
          setCode(boilerplateCode?.[restoredLanguage as keyof typeof boilerplateCode] || "// Start coding here");
        }
      }
    } catch { /* localStorage unavailable (e.g. private browsing) */ }
  }

  React.useEffect(() => {
    if (!isMounted || restoredKey !== languageKey) return;
    try {
      if (code !== "") {
        localStorage.setItem(draftKey(language), code);
      }

      localStorage.setItem(languageKey, language);

      const languages = Object.keys(boilerplateCode || {});
      const draftLanguages = languages.length > 0 ? languages : [language];
      const hasEditedDraft = draftLanguages.some((lang) => {
        const starterCode = boilerplateCode?.[lang as keyof typeof boilerplateCode]
          || (languages.length === 0 ? "// Start coding here" : "");
        const savedDraft = lang === language ? code : localStorage.getItem(draftKey(lang));
        return savedDraft !== null && savedDraft !== starterCode;
      });
      const editedDraftKey = `${draftKeyPrefix}_edited_${problemId}`;
      if (hasEditedDraft) localStorage.setItem(editedDraftKey, "true");
      else localStorage.removeItem(editedDraftKey);
    } catch { /* localStorage unavailable */ }
  }, [code, language, isMounted, restoredKey, languageKey, draftKey, draftKeyPrefix, problemId, boilerplateCode]);

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

  if (!isMounted || restoredKey !== languageKey) return null;

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
