import assert from "node:assert/strict";
import test from "node:test";
import { getQuestionReviewStatus, summarizeReview } from "../lib/submission-review";

const questions = [
  { id: "mcq-answered", type: "mcq" },
  { id: "mcq-empty", type: "mcq" },
  { id: "code-solved", type: "coding" },
  { id: "code-attempted", type: "coding" },
  { id: "code-draft", type: "coding" },
  { id: "code-empty", type: "coding" },
];

test("classifies answered and attempted work before draft state", () => {
  const progress = {
    "mcq-answered": "solved",
    "code-solved": "solved",
    "code-attempted": "attempted",
  } as const;
  const drafts = new Set(["code-attempted", "code-draft"]);

  assert.equal(getQuestionReviewStatus(questions[0], progress, drafts), "answered");
  assert.equal(getQuestionReviewStatus(questions[2], progress, drafts), "answered");
  assert.equal(getQuestionReviewStatus(questions[3], progress, drafts), "attempted");
  assert.equal(getQuestionReviewStatus(questions[4], progress, drafts), "draft");
  assert.equal(getQuestionReviewStatus(questions[5], progress, drafts), "unanswered");
});

test("summary categories partition all questions without double-counting", () => {
  const summary = summarizeReview(
    questions,
    { "mcq-answered": "solved", "code-solved": "solved", "code-attempted": "attempted" },
    new Set(["code-attempted", "code-draft"])
  );

  assert.deepEqual(summary, { answered: 2, attempted: 1, draft: 1, unanswered: 2 });
  assert.equal(Object.values(summary).reduce((sum, count) => sum + count, 0), questions.length);
});

test("updated progress is reflected when the review is reopened", () => {
  const question = { id: "mcq-empty", type: "mcq" };
  assert.equal(getQuestionReviewStatus(question, {}, new Set()), "unanswered");
  assert.equal(getQuestionReviewStatus(question, { "mcq-empty": "solved" }, new Set()), "answered");
});
