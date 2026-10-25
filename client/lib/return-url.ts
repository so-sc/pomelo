export type SearchParams = Record<string, string | string[] | undefined>;

export function buildReturnUrl(pathname: string, params: SearchParams) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
    } else {
      value?.forEach((item) => query.append(key, item));
    }
  }

  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function getSafeReturnUrl(
  candidate: string | string[] | undefined,
  fallback: string,
) {
  if (
    typeof candidate !== "string" ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return fallback;
  }

  try {
    const origin = "http://pomelo.local";
    const url = new URL(candidate, origin);
    if (url.origin !== origin || url.pathname.startsWith("//")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function buildQuestionPreviewHref(
  type: string,
  id: string | number,
  returnUrl?: string,
) {
  const pathname = `/admin/questions/${type}/${id}/preview`;
  if (!returnUrl) return pathname;

  const query = new URLSearchParams({ returnUrl });
  return `${pathname}?${query}`;
}

export function getQuestionPreviewBackUrl(
  type: string,
  id: string,
  returnUrl?: string | string[],
) {
  return getSafeReturnUrl(
    returnUrl,
    `/admin/questions/${type}/${id}/edit`,
  );
}

// Where to land after signing in. Auth.js puts the protected page's absolute URL in
// ?callbackUrl=, so a same-host URL is reduced to its path; anything else (another host,
// a protocol-relative trick, the auth pages themselves) falls back to home.
export function getSafeCallbackUrl(candidate: string | null | undefined, host?: string) {
  let value: string | undefined = candidate ?? undefined;
  if (value && host) {
    try {
      const url = new URL(value);
      if (url.host === host) value = `${url.pathname}${url.search}${url.hash}`;
    } catch { /* already relative */ }
  }
  const safe = getSafeReturnUrl(value, "/");
  return safe.startsWith("/auth/") ? "/" : safe;
}

// Keeps the post-login destination when moving between the login and register pages.
export function withCallbackUrl(pathname: string, callbackUrl: string) {
  return callbackUrl === "/" ? pathname : `${pathname}?${new URLSearchParams({ callbackUrl })}`;
}
