export const DIFFICULTY_LABELS = [
  "Very easy",
  "Easy",
  "Moderate",
  "Hard",
  "Very hard",
] as const;
export const EXPERIENCE_LABELS = [
  "Poor",
  "Fair",
  "Good",
  "Very good",
  "Excellent",
] as const;
export const FEEDBACK_SORTS = [
  ["newest", "Newest first"],
  ["oldest", "Oldest first"],
  ["difficulty-high", "Difficulty: high to low"],
  ["difficulty-low", "Difficulty: low to high"],
  ["experience-high", "Experience: high to low"],
  ["experience-low", "Experience: low to high"],
] as const;
