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

// Prefix of this test's code drafts; see the attempt question page.
export const draftKeyPrefix = (testId: string) => `pomelo_draft_${testId}`;

const ownerKey = (testId: string) => `pomelo:attempt:owner:${testId}`;

// Everything an attempt at this test left in this browser: violation count, code drafts
// and the question tray's progress. Other tests' state is left alone.
export function clearAttemptStorage(testId: string) {
  if (!isBrowser()) return;
  clearAttemptIntegrityState(testId);
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(`${draftKeyPrefix(testId)}_`) || key.startsWith(`pomelo_progress_${testId}`) || key === ownerKey(testId)) {
        localStorage.removeItem(key);
      }
    });
  } catch { /* localStorage unavailable */ }
}

// On a shared machine, a different account opening this test must not inherit the last
// person's violations or drafts. The same account resuming keeps them, so re-entering
// the test can't be used to reset the violation count.
export function claimAttemptStorage(testId: string, userId: string) {
  if (!isBrowser()) return;
  try {
    if (localStorage.getItem(ownerKey(testId)) === userId) return;
    clearAttemptStorage(testId);
    localStorage.setItem(ownerKey(testId), userId);
  } catch { /* localStorage unavailable */ }
}

export async function clearClipboard() {
  if (!isBrowser() || !navigator.clipboard?.writeText) return;
  try {
    await navigator.clipboard.writeText("");
  } catch { /* clipboard permission denied or document not focused */ }
}
