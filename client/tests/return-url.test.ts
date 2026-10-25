import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQuestionPreviewHref,
  buildReturnUrl,
  getQuestionPreviewBackUrl,
  getSafeCallbackUrl,
  withCallbackUrl,
} from "../lib/return-url";

test("buildReturnUrl preserves query parameters, including repeated values", () => {
  assert.equal(
    buildReturnUrl("/admin/questions", {
      page: "2",
      q: "linked list",
      type: ["coding", "mcq"],
    }),
    "/admin/questions?page=2&q=linked+list&type=coding&type=mcq",
  );
});

test("question-list preview link returns to questions with current filters", () => {
  const returnUrl = buildReturnUrl("/admin/questions", {
    page: "2",
    q: "linked list",
    type: "coding",
  });
  const previewHref = buildQuestionPreviewHref("coding", "question-1", returnUrl);
  const query = new URL(previewHref, "http://pomelo.local").searchParams;

  assert.equal(previewHref.split("?")[0], "/admin/questions/coding/question-1/preview");
  assert.equal(
    getQuestionPreviewBackUrl("coding", "question-1", query.get("returnUrl") ?? undefined),
    "/admin/questions?page=2&q=linked+list&type=coding",
  );
});

test("test question picker preview link returns to exact editor URL", () => {
  const returnUrl = "/admin/tests/test-1/edit?tab=questions#picker";
  const previewHref = buildQuestionPreviewHref("mcq", "question-2", returnUrl);
  const query = new URL(previewHref, "http://pomelo.local").searchParams;

  assert.equal(previewHref.split("?")[0], "/admin/questions/mcq/question-2/preview");
  assert.equal(
    getQuestionPreviewBackUrl("mcq", "question-2", query.get("returnUrl") ?? undefined),
    returnUrl,
  );
});

test("question preview falls back to editor if return URL is missing or invalid", () => {
  const fallback = "/admin/questions/coding/question-1/edit";
  assert.equal(getQuestionPreviewBackUrl("coding", "question-1"), fallback);

  for (const candidate of [
    "https://example.com/phishing",
    "//example.com/phishing",
    "/\\example.com/phishing",
    "/%2e%2e//example.com/phishing",
    "javascript:alert(1)",
  ]) {
    assert.equal(getQuestionPreviewBackUrl("coding", "question-1", candidate), fallback);
  }
});

test("callbackUrl keeps same-host pages, reduced to their path", () => {
  assert.equal(getSafeCallbackUrl("https://pomelo.test/test/abc?x=1", "pomelo.test"), "/test/abc?x=1");
  assert.equal(getSafeCallbackUrl("/attempt/test/abc/question/q1", "pomelo.test"), "/attempt/test/abc/question/q1");
});

test("callbackUrl rejects other hosts, protocol-relative URLs and auth pages", () => {
  assert.equal(getSafeCallbackUrl("https://attacker.com/phish", "pomelo.test"), "/");
  assert.equal(getSafeCallbackUrl("//attacker.com", "pomelo.test"), "/");
  assert.equal(getSafeCallbackUrl("javascript:alert(1)", "pomelo.test"), "/");
  assert.equal(getSafeCallbackUrl("/auth/login", "pomelo.test"), "/");
  assert.equal(getSafeCallbackUrl(null, "pomelo.test"), "/");
});

test("withCallbackUrl only adds the parameter when there is somewhere to return to", () => {
  assert.equal(withCallbackUrl("/auth/register", "/"), "/auth/register");
  assert.equal(withCallbackUrl("/auth/register", "/test/abc"), "/auth/register?callbackUrl=%2Ftest%2Fabc");
});
