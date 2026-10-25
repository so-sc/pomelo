import { auth } from "@/auth";
import { getBaseUrl } from "@/lib/env";

const ALLOWED_ACTIONS = new Set(["run", "submit"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const { id, action } = await params;
  // id goes into the backend URL; a decoded "../" must not reach other backend routes.
  if (!ALLOWED_ACTIONS.has(action) || !/^[a-f0-9]{24}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  let session = null;
  try {
    session = await auth();
  } catch (error) {
    console.error("Auth session error:", error);
  }

  // /api/admin/* is outside the proxy's /admin role rule, so gate it here too.
  if ((session?.user as { role?: string } | undefined)?.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const backendRes = await fetch(
    `${getBaseUrl()}/api/admin/questions/${id}/preview/${action}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.backendToken}`,
      },
      body: await req.text(),
      cache: "no-store",
    }
  );

  return new Response(backendRes.body, {
    status: backendRes.status,
    headers: {
      "Content-Type": backendRes.headers.get("content-type") || "application/x-ndjson",
    },
  });
}
