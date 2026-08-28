export interface BaseProblem {
  id: string | number;
  _id?: string; // MongoDB ID
  title: string;
  description: string;
  marks: number;
  difficulty: "Easy" | "Medium" | "Hard";
  questionType?: "Single Correct" | "Multiple Correct" | "Coding"; // Deprecated for identification
  type: "coding" | "mcq"; // Primary identification field
  savedAnswer?: string[]; // Persisted MCQ answer
  savedCode?: string;     // Persisted Code
  savedLanguage?: string; // Persisted Language for Code
  removedFromBank?: boolean; // In a test's question snapshot but deleted from the bank
}

export interface CodingProblem extends BaseProblem {
  inputFormat: string;
  outputFormat: string;
  constraints: string; // Changed from string[] to String based on upstream Question.js
  boilerplateCode: { // Changed from boilerplate
    cpp?: string;
    c?: string;
    java?: string;
    python?: string;
  };
  examples?: {
    input: string;
    output: string;
    explanation?: string;
  }[];
}

export interface MCQProblem extends BaseProblem {
  questionType: "Single Correct" | "Multiple Correct";
  options: string[]; // Question.js has options: [String]
  correctAnswer: string;
}

export type Problem = CodingProblem | MCQProblem;
