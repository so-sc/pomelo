// Client-side validation utilities for the bulk import dialog
import { validateProblemConfig, type ProblemInput } from '@pomelo/code-gen';

export interface ClientValidationError {
  field?: string;
  message: string;
  index?: number;
}

export interface QuestionPreview {
  title: string;
  type: string;
  marks?: number;
  difficulty?: string;
}

export interface ClientValidationResult {
  valid: boolean;
  errors: ClientValidationError[];
  count?: number;
  preview?: QuestionPreview[];
}

/**
 * Basic client-side validation before sending to server
 * This is a quick check - server does comprehensive validation
 */
export function validateImportJSONClient(jsonString: string): ClientValidationResult {
  // Parse JSON
  let jsonData;
  try {
    jsonData = JSON.parse(jsonString);
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          message:
            error instanceof Error
              ? `Invalid JSON: ${error.message}`
              : 'Invalid JSON format',
        },
      ],
    };
  }

  // Extract questions
  let questions: Record<string, unknown>[] = [];
  if (Array.isArray(jsonData)) {
    questions = jsonData;
  } else if (jsonData?.questions && Array.isArray(jsonData.questions)) {
    questions = jsonData.questions;
  } else if (jsonData?.type && (jsonData.type === 'coding' || jsonData.type === 'mcq')) {
    questions = [jsonData];
  }

  if (questions.length === 0) {
    return {
      valid: false,
      errors: [{ message: 'No valid questions found in JSON' }],
    };
  }

  // Basic field validation
  const errors: ClientValidationError[] = [];

  questions.forEach((q, idx) => {
    if (typeof q.type !== 'string' || !['coding', 'mcq'].includes(q.type)) {
      errors.push({
        index: idx,
        field: 'type',
        message: 'Missing or invalid "type" field (must be "coding" or "mcq")',
      });
    }

    if (!q.title || typeof q.title !== 'string' || q.title.trim() === '') {
      errors.push({
        index: idx,
        field: 'title',
        message: 'Missing or invalid "title" field',
      });
    }

    if (!q.description || typeof q.description !== 'string' || q.description.trim() === '') {
      errors.push({
        index: idx,
        field: 'description',
        message: 'Missing or invalid "description" field',
      });
    }

    if (q.marks === undefined || q.marks === null || typeof q.marks !== 'number' || q.marks < 0) {
      errors.push({
        index: idx,
        field: 'marks',
        message: 'Missing or invalid "marks" field (must be non-negative number)',
      });
    }

    // Type-specific validation
    if (q.type === 'coding') {
      if (!q.inputFormat || typeof q.inputFormat !== 'string') {
        errors.push({
          index: idx,
          field: 'inputFormat',
          message: 'Coding question missing "inputFormat"',
        });
      }

      if (!q.outputFormat || typeof q.outputFormat !== 'string') {
        errors.push({
          index: idx,
          field: 'outputFormat',
          message: 'Coding question missing "outputFormat"',
        });
      }

      validateProblemConfig({
        method: q.functionName as string,
        input: (Array.isArray(q.inputVariables) ? q.inputVariables : []) as ProblemInput[],
      }).forEach((message) => {
        errors.push({ index: idx, field: 'inputVariables', message });
      });
    } else if (q.type === 'mcq') {
      if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
        errors.push({
          index: idx,
          field: 'options',
          message: 'MCQ question must have at least 2 options',
        });
      }

      if (q.correctAnswer === undefined || q.correctAnswer === null) {
        errors.push({
          index: idx,
          field: 'correctAnswer',
          message: 'MCQ question missing "correctAnswer"',
        });
      } else {
        const indices = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
        const optionsLength = Array.isArray(q.options) ? q.options.length : 0;
        const invalid = indices.some(
          (i: unknown) => typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= optionsLength
        );
        if (invalid) {
          errors.push({
            index: idx,
            field: 'correctAnswer',
            message: '"correctAnswer" must be the option index (or indices) as a number, within range',
          });
        }
      }
    }
  });

  const preview: QuestionPreview[] = questions.map((q, idx) => ({
    title:
      q?.title && typeof q.title === 'string' && q.title.trim() !== ''
        ? q.title
        : `(Question ${idx + 1} missing title)`,
    type: q?.type && typeof q.type === 'string' ? q.type : 'unknown',
    marks: typeof q?.marks === 'number' ? q.marks : undefined,
    difficulty: typeof q?.difficulty === 'string' ? q.difficulty : undefined,
  }));

  return {
    valid: errors.length === 0,
    errors,
    count: questions.length,
    preview,
  };
}

/**
 * Get a user-friendly error message from validation errors
 */
export function formatValidationErrors(errors: ClientValidationError[]): string {
  if (errors.length === 0) return '';

  const grouped = errors.reduce(
    (acc, err) => {
      const key = err.index !== undefined ? `Question ${err.index + 1}` : 'General';
      if (!acc[key]) acc[key] = [];
      acc[key].push(`${err.field ? `${err.field}: ` : ''}${err.message}`);
      return acc;
    },
    {} as Record<string, string[]>
  );

  return Object.entries(grouped)
    .map(([key, msgs]) => `${key}: ${msgs.join('; ')}`)
    .join('\n');
}
