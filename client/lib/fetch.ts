import { auth } from "@/auth";
import { getBaseUrl } from "@/lib/env";
import { clientIpHeaders } from "@/lib/client-ip";

export async function fetchBackend(endpoint: string, options: RequestInit = {}) {
  let session = null;
  try {
    session = await auth();
  } catch (error) {
    console.error("Auth session error:", error);
  }
  const token = session?.backendToken;

  const headers = new Headers(options.headers);
  for (const [k, v] of Object.entries(await clientIpHeaders())) headers.set(k, v);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  // Only set Content-Type to application/json if body is string (JSON stringified) and no content type is present
  if (!headers.has("Content-Type") && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${getBaseUrl()}${endpoint}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") || "";
  
  if (contentType.includes("application/json")) {
    return res.json();
  }
  
  const text = await res.text();
  
  // Handle rate-limit responses that may come as plain text
  if (res.status === 429) {
    return {
      success: false,
      error: text || "Too many requests, please slow down",
      rateLimited: true,
    };
  }

  return {
    success: res.ok,
    message: text,
  };
}
