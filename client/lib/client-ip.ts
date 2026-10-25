import { headers } from "next/headers";

// Backend calls come from this server, so without this every user shares one IP in
// the backend's rate limiters. Caddy overwrites X-Forwarded-For, so the value is trusted.
export async function clientIpHeaders(): Promise<Record<string, string>> {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip");
    return ip ? { "X-Forwarded-For": ip } : {};
  } catch {
    return {}; // outside a request scope
  }
}
