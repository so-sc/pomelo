import type { Metadata } from "next";
import { auth } from "@/auth";
import { fetchBackend } from "@/lib/fetch";

export const dynamic = "force-dynamic";

interface Params {
  id: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();

  if (!session?.backendToken) {
    return {
      title: "Contest Details",
      description: "Sign in to view contest details and join the competition.",
    };
  }

  try {
    const result = await fetchBackend(`/api/test/${id}`);
    if (result.success && result.data) {
      return {
        title: result.data.title,
        description: result.data.description || "Join this coding contest on Pomelo.",
      };
    }
  } catch (error) {
    console.error("Error generating metadata for test:", error);
  }

  return {
    title: "Contest Details",
    description: "Participate in this programming contest on Pomelo.",
  };
}

export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
