import { JudgePython } from "./python/JudgePython";
import { JudgeC } from "./c/JudgeC";
import { JudgeJava } from "./java/JudgeJava";
import { Judge } from "./types";

const judges: Record<string, () => Judge> = {
  python: () => new JudgePython(),
  c: () => new JudgeC(),
  java: () => new JudgeJava(),
};

export function getJudge(lang: string): Judge {
  const factory = judges[lang];
  if (!factory) {
    throw new Error(`Judge not found for language: ${lang}`);
  }
  return factory();
}

export * from "./types";
