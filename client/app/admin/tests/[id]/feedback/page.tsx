import FeedbackDashboard from "@/components/admin/test/feedback-dashboard";

export default async function AdminFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <FeedbackDashboard testId={(await params).id} query={await searchParams} />
  );
}
