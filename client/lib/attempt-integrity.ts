export const DISABLE_PROCTORING = false; // TEMP MARKER: Set this to false to re-enable proctoring
export const MAX_VIOLATIONS = 3;
export const AUTO_SUBMIT_REASON = "VIOLATION_LIMIT_REACHED";

const VIOLATION_STORAGE_PREFIX = "pomelo:attempt:violations";
const BODY_FILTER_DATASET_KEY = "pomeloIntegrityFilter";
const BODY_TRANSITION_DATASET_KEY = "pomeloIntegrityTransition";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getViolationStorageKey(testId: string) {
  return `${VIOLATION_STORAGE_PREFIX}:${testId}`;
}

export function readViolationCount(testId: string) {
  if (!isBrowser()) return 0;

  const stored = window.localStorage.getItem(getViolationStorageKey(testId));
  const parsed = Number.parseInt(stored ?? "0", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function persistViolationCount(testId: string, count: number) {
  if (!isBrowser()) return;
  const safeCount = Math.max(0, count);
  window.localStorage.setItem(getViolationStorageKey(testId), String(safeCount));
  window.dispatchEvent(new CustomEvent("pomelo-violation-update", { detail: { count: safeCount } }));
}

export function obfuscateAttemptBody() {
  if (!isBrowser()) return;

  const body = document.body;
  if (!body) return;

  if (body.dataset[BODY_FILTER_DATASET_KEY] === undefined) {
    body.dataset[BODY_FILTER_DATASET_KEY] = body.style.filter ?? "";
  }

  if (body.dataset[BODY_TRANSITION_DATASET_KEY] === undefined) {
    body.dataset[BODY_TRANSITION_DATASET_KEY] = body.style.transition ?? "";
  }

  body.style.transition = "filter 120ms ease";
  body.style.filter = "blur(20px)";
}

export function resetAttemptObfuscation() {
  if (!isBrowser()) return;

  const body = document.body;
  if (!body) return;

  body.style.filter = body.dataset[BODY_FILTER_DATASET_KEY] ?? "";
  body.style.transition = body.dataset[BODY_TRANSITION_DATASET_KEY] ?? "";

  delete body.dataset[BODY_FILTER_DATASET_KEY];
  delete body.dataset[BODY_TRANSITION_DATASET_KEY];
}

export function clearAttemptIntegrityState(testId: string) {
  if (!isBrowser()) return;

  window.localStorage.removeItem(getViolationStorageKey(testId));
  resetAttemptObfuscation();
}

export async function clearClipboard() {
  if (!isBrowser() || !navigator.clipboard?.writeText) return;
  try {
    await navigator.clipboard.writeText("");
  } catch { /* clipboard permission denied or document not focused */ }
}
