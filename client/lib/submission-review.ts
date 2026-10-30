export type ReviewStatus = "answered" | "attempted" | "draft" | "unanswered";
export type ReviewProgress = "attempted" | "solved";

export interface ReviewQuestion {
  id: string;
  type: string;
}

export interface ReviewSummary {
  answered: number;
  attempted: number;
  draft: number;
  unanswered: number;
}

export function getQuestionReviewStatus(
  question: ReviewQuestion,
  progress: Record<string, ReviewProgress>,
  editedDrafts: ReadonlySet<string>
): ReviewStatus {
  if (progress[question.id] === "solved") return "answered";
  if (question.type.toLowerCase() === "coding") {
    if (progress[question.id] === "attempted") return "attempted";
    if (editedDrafts.has(question.id)) return "draft";
  }
  return "unanswered";
}

export function summarizeReview(
  questions: readonly ReviewQuestion[],
  progress: Record<string, ReviewProgress>,
  editedDrafts: ReadonlySet<string>
): ReviewSummary {
  return questions.reduce<ReviewSummary>((summary, question) => {
    summary[getQuestionReviewStatus(question, progress, editedDrafts)] += 1;
    return summary;
  }, { answered: 0, attempted: 0, draft: 0, unanswered: 0 });
}
