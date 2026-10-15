import { fetchBackend } from "@/lib/fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocalTime } from "@/components/ui/local-time";
import { Pagination } from "@/components/admin/pagination";

interface FeedbackResponse {
  success: boolean;
  count: number;
  averageDifficulty: number | null;
  averageExperience: number | null;
  totalComments: number;
  comments: {
    _id: string;
    feedback: { difficulty: number; experience: number; comment: string; submittedAt: string };
  }[];
}

const PAGE_SIZE = 10;

export default async function FeedbackSummary({ testId, page }: { testId: string; page: number }) {
  let data: FeedbackResponse;
  try {
    data = await fetchBackend(`/api/admin/tests/${testId}/feedback?page=${page}&limit=${PAGE_SIZE}`);
  } catch {
    return <p role="alert" className="text-sm text-muted-foreground">Candidate feedback could not be loaded. Refresh to try again.</p>;
  }
  if (!data.success) {
    return <p role="alert" className="text-sm text-muted-foreground">Candidate feedback could not be loaded. Refresh to try again.</p>;
  }

  return (
    <section aria-labelledby="feedback-heading" className="space-y-6">
      <div className="space-y-2">
        <h2 id="feedback-heading" className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Candidate feedback</h2>
        <p className="text-sm text-muted-foreground">Optional feedback from completed attempts. Averages include all responses.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Responses", value: data.count },
          { label: "Test difficulty", value: data.averageDifficulty === null ? "—" : `${data.averageDifficulty.toFixed(1)} / 5` },
          { label: "Platform experience", value: data.averageExperience === null ? "—" : `${data.averageExperience.toFixed(1)} / 5` },
        ].map(metric => (
          <Card key={metric.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{metric.label}</CardTitle></CardHeader>
            <CardContent className="font-mono text-3xl font-semibold">{metric.value}</CardContent>
          </Card>
        ))}
      </div>
      {data.count === 0 ? (
        <p className="text-sm text-muted-foreground">No feedback yet. Candidates can leave feedback after submitting their test.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Difficulty: 1 = very easy, 5 = very hard. Platform experience: 1 = poor, 5 = excellent.</p>
          <Card>
            <CardHeader><CardTitle className="text-base">Comments ({data.totalComments})</CardTitle></CardHeader>
            <CardContent>
              {data.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments on this page.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.comments.map(({ _id, feedback }) => (
                    <li key={_id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                      <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{feedback.comment}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Difficulty {feedback.difficulty}/5</span>
                        <span>Experience {feedback.experience}/5</span>
                        <LocalTime iso={feedback.submittedAt} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Pagination page={page} total={data.totalComments} pageSize={PAGE_SIZE} pageParam="feedbackPage" />
        </>
      )}
    </section>
  );
}
