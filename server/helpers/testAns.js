













/**
 * Evaluate a multiple-choice question answer
 *
 * @param {Object} params
 * @param {string} params.submitted - User's submitted answer (e.g., "A", "B")
 * @param {string} params.correct - Correct answer (e.g., "B")
 * @param {number} params.marks - Marks awarded for a correct answer
 *
 * @returns {Object} result - Includes correctness, score, and result string
 */
const testAns = ({ submitted, correct, marks }) => {
  const isCorrect = submitted === correct;

  return {
    correct: isCorrect,
    score: isCorrect ? marks : 0,
    result: isCorrect ? 'Correct' : 'Wrong',
  };
};

module.exports = testAns;
