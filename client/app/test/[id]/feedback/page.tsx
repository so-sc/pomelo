import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { fetchBackend } from "@/lib/fetch";
import { Button } from "@/components/ui/button";
import FeedbackForm from "@/components/test/feedback-form";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await auth())?.backendToken) redirect("/auth/login");

  let result;
  try {
    result = await fetchBackend(`/api/test/${id}/feedback`);
  } catch {
    result = {
      success: false,
      error: "Feedback is unavailable right now. You can try again later.",
    };
  }

  return (
    <main className="h-full w-full overflow-y-auto px-5 pb-10 pt-20 sm:px-8 lg:px-12 lg:pb-16 lg:pt-28">
      {result.success ? (
        <FeedbackForm
          testId={id}
          title={result.title}
          alreadySubmitted={Boolean(result.feedback)}
        />
      ) : (
        <div className="mx-auto max-w-7xl space-y-4">
          <h1 className="text-2xl font-semibold">Feedback unavailable</h1>
          <p role="alert" className="text-muted-foreground">
            {result.error || "Unable to load feedback."}
          </p>
          <Button asChild variant="outline">
            <Link href={`/test/${id}`}>Back to test</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
