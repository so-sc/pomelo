import { createApiHandler } from "./api";
import { serveUi } from "./ui";
import type { Paths } from "../core/types";

const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);
const WILDCARD = new Set(["0.0.0.0", "::", "[::]"]);

// The API has no login, so only same-machine, same-origin callers may use it:
// a Host check stops DNS rebinding, an Origin check stops cross-site requests
// (browsers always send Origin on cross-origin POSTs, even no-cors ones).
function isTrustedRequest(req: Request, url: URL, apiHost: string) {
  const host = url.hostname;
  if (!WILDCARD.has(apiHost) && !LOOPBACK.has(host) && host !== apiHost) return false;

  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const o = new URL(origin);
    // Loopback origins cover the Vite dev server proxying to the daemon.
    return o.host === url.host || LOOPBACK.has(o.hostname);
  } catch {
    return false;
  }
}

export function createRequestHandler(paths: Paths) {
  const handleApi = createApiHandler(paths);

  return async function handleRequest(req: Request) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method.toUpperCase();

    if (path.startsWith("/api/")) {
      if (!isTrustedRequest(req, url, paths.apiHost)) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      return handleApi(req, url, method);
    }

    return serveUi(paths, path, req);
  };
}
