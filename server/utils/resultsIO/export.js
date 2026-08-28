function csvEscape(value) {
  const str = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds a CSV score sheet: one row per candidate, one column per question.
 * @param {{questions: {_id: any, title: string, marks: number}[]}} contest
 * @param {any[]} submissions - lean Submission docs with user populated and submissions.question resolved against the contest snapshot
 * @returns {string} CSV string
 */
function buildScoreCSV(contest, submissions) {
  const questions = contest.questions || [];
  const maxScore = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  const header = ["Name", "Email", ...questions.map((q) => q.title), "Total", "Max Score"];
  const rows = submissions.map((sub) => {
    const scoreByQuestion = new Map(
      (sub.submissions || [])
        .filter((item) => item.question)
        .map((item) => [String(item.question._id), item.score || 0])
    );

    return [
      sub.user?.name || "Unknown User",
      sub.user?.email || "N/A",
      ...questions.map((q) => scoreByQuestion.get(String(q._id)) ?? 0),
      sub.totalScore || 0,
      maxScore,
    ];
  });

  return [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}

function summarizeTestCases(testCaseResults) {
  const results = testCaseResults || [];
  return {
    total: results.length,
    passed: results.filter((tc) => tc.passed).length,
    failed: results.filter((tc) => !tc.passed).length,
  };
}

function mapQuestionEntry(item, verbose) {
  const question = item.question || {};
  const isCoding = question.questionType !== "Single Correct" && question.questionType !== "Multiple Correct";

  const base = {
    questionTitle: question.title || "Unknown Question",
    questionType: isCoding ? "coding" : "mcq",
    marks: question.marks || 0,
    score: item.score || 0,
    status: item.status,
    code: item.code || (item.answer || [])[0],
    language: item.language,
    executionTime: item.executionTime,
    memoryUsed: item.memoryUsed,
    submittedAt: item.submittedAt,
  };

  if (!isCoding) {
    return { ...base, answer: item.answer };
  }

  return {
    ...base,
    testCases: verbose ? item.testCaseResults || [] : summarizeTestCases(item.testCaseResults),
  };
}

/**
 * Builds a JSON dump of every submission for a contest.
 * @param {{title: string, questions: {marks: number}[]}} contest
 * @param {any[]} submissions - lean Submission docs with user populated and submissions.question resolved against the contest snapshot
 * @param {{verbose: boolean}} options
 */
function buildSubmissionsDump(contest, submissions, { verbose }) {
  const maxScore = (contest.questions || []).reduce((sum, q) => sum + (q.marks || 0), 0);

  const results = submissions.map((sub) => ({
    name: sub.user?.name || "Unknown User",
    email: sub.user?.email || "N/A",
    totalScore: sub.totalScore || 0,
    maxScore,
    status: sub.status,
    submittedAt: sub.submittedAt,
    questions: (sub.submissions || [])
      .filter((item) => item.question)
      .map((item) => mapQuestionEntry(item, verbose)),
  }));

  return {
    meta: {
      contest: contest.title,
      exportedAt: new Date().toISOString(),
      format: verbose ? "verbose" : "compact",
      count: results.length,
    },
    results,
  };
}

function generateResultsFilename(contestTitle, kind) {
  const timestamp = new Date().toISOString().split("T")[0];
  const sanitized = (contestTitle || "contest")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${kind}-${sanitized}-${timestamp}`;
}

module.exports = {
  buildScoreCSV,
  buildSubmissionsDump,
  generateResultsFilename,
};
