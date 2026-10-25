"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Pencil } from "lucide-react";

const languageList = ["c", "cpp", "java", "python"];

const activeLanguages = (boilerplate: Record<string, unknown>) =>
  Object.keys(boilerplate).filter(
    (key) => languageList.includes(key) && boilerplate[key] !== undefined
  );

export default function BoilerplateCard() {
  const { setValue, watch, unregister } = useFormContext();
  const boilerplate = watch("boilerplate");

  // Initialize local state based on existing form data (for edit mode)
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(() =>
    boilerplate ? activeLanguages(boilerplate) : []
  );
  const [prevBoilerplate, setPrevBoilerplate] = useState(boilerplate);
  if (boilerplate !== prevBoilerplate) {
    setPrevBoilerplate(boilerplate);
    if (boilerplate) setSupportedLanguages(activeLanguages(boilerplate));
  }

  const toggleLanguage = (lang: string) => {
    let newLangs;
    if (supportedLanguages.includes(lang)) {
      // Deselecting
      newLangs = supportedLanguages.filter((l) => l !== lang);
      // Remove from form data so backend doesn't generate for it
      // We can either set to undefined or unregister
      unregister(`boilerplate.${lang}`);
    } else {
      // Selecting
      newLangs = [...supportedLanguages, lang];
      // Set placeholder to pass Zod validation (must be non-empty)
      // Backend will overwrite this with generated code
      setValue(`boilerplate.${lang}`, "// auto-generated");
    }
    setSupportedLanguages(newLangs);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pencil className="h-5 w-5 text-primary" />
          Boilerplate Code
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {languageList.map((lang) => (
            <Button
              key={lang}
              type="button"
              className="uppercase"
              variant={
                supportedLanguages.includes(lang) ? "default" : "outline"
              }
              size="sm"
              onClick={() => toggleLanguage(lang)}
            >
              {supportedLanguages.includes(lang) ? `✓ ${lang}` : lang}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
