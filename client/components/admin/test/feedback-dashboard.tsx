import Link from "next/link";
import { ArrowLeft, MessageSquare, BarChart3 } from "lucide-react";
import { fetchBackend } from "@/lib/fetch";
import { Button } from "@/components/ui/button";
import { LocalTime } from "@/components/ui/local-time";
import { Pagination } from "@/components/admin/pagination";
import {
  DIFFICULTY_LABELS,
  EXPERIENCE_LABELS,
  FEEDBACK_SORTS,
} from "@/lib/feedback";

interface Distribution {
  rating: number;
  count: number;
}
interface FeedbackResponse {
  success: boolean;
  error?: string;
  title: string;
  count: number;
  averageDifficulty: number | null;
  averageExperience: number | null;
  difficultyDistribution: Distribution[];
  experienceDistribution: Distribution[];
  totalReviews: number;
  page: number;
  reviews: {
    _id: string;
    feedback: {
      difficulty: number;
      experience: number;
      comment: string;
      submittedAt: string;
    };
  }[];
}
const PAGE_SIZE = 10;
const selectClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export default async function FeedbackDashboard({
  testId,
  query,
}: {
  testId: string;
  query: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  for (const key of ["page", "difficulty", "experience", "sort"]) {
    const value = query[key];
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value) params.set(key, value);
  }
  let data: FeedbackResponse;
  try {
    data = await fetchBackend(`/api/admin/tests/${testId}/feedback?${params}`);
  } catch {
    data = {
      success: false,
      error: "Feedback could not be loaded. Refresh to try again.",
    } as FeedbackResponse;
  }
  const route = `/admin/tests/${testId}/feedback`;
  return (
    <main className="h-full flex-1 overflow-auto bg-background">
      <div className="space-y-8 p-4 pb-16 sm:p-6 lg:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href={`/admin/tests/${testId}`} aria-label="Back to test">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {data.title || "Test feedback"}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Candidate feedback
              </h1>
              <p className="text-sm text-muted-foreground">
                Understand the assessment and the experience behind each
                response.
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/admin/tests/${testId}/result`}>
              <BarChart3 className="size-4" />
              View results
            </Link>
          </Button>
        </header>
        {!data.success ? (
          <div className="space-y-4">
            <p role="alert">{data.error || "Unable to load feedback."}</p>
            <Button variant="outline" asChild>
              <Link href={route}>Reset filters</Link>
            </Button>
          </div>
        ) : (
          <>
            <section
              aria-label="All response statistics"
              className="grid gap-6 border-b border-border pb-8 sm:grid-cols-3"
            >
              {[
                {
                  label: "Responses",
                  value: data.count,
                  help: "Completed attempts with feedback",
                },
                {
                  label: "Average difficulty",
                  value:
                    data.averageDifficulty === null
                      ? "N/A"
                      : `${data.averageDifficulty.toFixed(1)} / 5`,
                  help: "1 very easy · 5 very hard",
                },
                {
                  label: "Average experience",
                  value:
                    data.averageExperience === null
                      ? "N/A"
                      : `${data.averageExperience.toFixed(1)} / 5`,
                  help: "1 poor · 5 excellent",
                },
              ].map((metric) => (
                <div key={metric.label} className="space-y-2">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </h2>
                  <p className="font-mono text-4xl font-semibold tracking-tight">
                    {metric.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{metric.help}</p>
                </div>
              ))}
            </section>
            <section
              aria-label="Rating distributions"
              className="grid gap-6 xl:grid-cols-2"
            >
              <DistributionChart
                title="Test difficulty"
                labels={DIFFICULTY_LABELS}
                rows={data.difficultyDistribution}
                total={data.count}
                metric="difficulty"
              />
              <DistributionChart
                title="Platform experience"
                labels={EXPERIENCE_LABELS}
                rows={data.experienceDistribution}
                total={data.count}
                metric="experience"
              />
            </section>
            <section aria-labelledby="reviews-heading" className="space-y-5">
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 id="reviews-heading" className="text-xl font-semibold">
                  Reviews
                </h2>
                <p className="text-sm text-muted-foreground">
                  {data.totalReviews} matching · {data.count} total
                </p>
              </div>
              <form
                key={params.toString()}
                action={route}
                method="get"
                className="grid items-end gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr_auto]"
              >
                {(
                  [
                    ["difficulty", "Difficulty", DIFFICULTY_LABELS],
                    ["experience", "Experience", EXPERIENCE_LABELS],
                  ] as const
                ).map(([name, label, labels]) => (
                  <div key={name} className="space-y-2 text-sm font-medium">
                    <label htmlFor={`filter-${name}`}>{label}</label>
                    <select
                      id={`filter-${name}`}
                      name={name}
                      defaultValue={
                        typeof query[name] === "string" ? query[name] : ""
                      }
                      className={selectClass}
                    >
                      <option value="">All ratings</option>
                      {labels.map((label, index) => (
                        <option key={label} value={index + 1}>
                          {index + 1} · {label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <div className="space-y-2 text-sm font-medium">
                  <label htmlFor="feedback-sort">Sort by</label>
                  <select
                    id="feedback-sort"
                    name="sort"
                    defaultValue={
                      typeof query.sort === "string" ? query.sort : "newest"
                    }
                    className={selectClass}
                  >
                    {FEEDBACK_SORTS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="h-11">
                    Apply filters
                  </Button>
                  <Button variant="ghost" className="h-11" asChild>
                    <Link href={route}>Reset</Link>
                  </Button>
                </div>
              </form>
              <p className="text-sm text-muted-foreground">
                Charts and averages include all responses. Filters apply to the
                reviews below, including ratings without comments.
              </p>
              {data.reviews.length === 0 ? (
                <div className="space-y-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
                  <MessageSquare className="mx-auto size-7 text-muted-foreground" />
                  <h3 className="font-medium">
                    {data.count ? "No matching reviews" : "No feedback yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {data.count
                      ? "Try another rating or reset the filters."
                      : "Candidates can leave feedback after submitting their test."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border bg-card px-4 sm:px-6">
                  {data.reviews.map(({ _id, feedback }) => (
                    <li
                      key={_id}
                      className="grid gap-6 py-6 xl:grid-cols-[minmax(0,1.6fr)_1fr_1fr]"
                    >
                      <div className="min-w-0 space-y-3">
                        <p className="whitespace-pre-wrap text-base leading-relaxed [overflow-wrap:anywhere]">
                          {feedback.comment || "No written comment"}
                        </p>
                        <div className="text-sm text-muted-foreground">
                          <LocalTime iso={feedback.submittedAt} />
                        </div>
                      </div>
                      <ReviewRating
                        label="Difficulty"
                        value={feedback.difficulty}
                        labels={DIFFICULTY_LABELS}
                        metric="difficulty"
                      />
                      <ReviewRating
                        label="Platform experience"
                        value={feedback.experience}
                        labels={EXPERIENCE_LABELS}
                        metric="experience"
                      />
                    </li>
                  ))}
                </ul>
              )}
              <Pagination
                page={data.page}
                total={data.totalReviews}
                pageSize={PAGE_SIZE}
              />
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function DistributionChart({
  title,
  labels,
  rows,
  total,
  metric,
}: {
  title: string;
  labels: readonly string[];
  rows: Distribution[];
  total: number;
  metric: "difficulty" | "experience";
}) {
  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rating distribution · all {total} responses
        </p>
      </div>
      <ol className="space-y-4">
        {rows.map(({ rating, count }) => {
          const percent = total ? (count / total) * 100 : 0;
          return (
            <li
              key={rating}
              className="grid grid-cols-[6.5rem_minmax(0,1fr)_5.5rem] items-center gap-3 text-sm"
              aria-label={`${rating} ${labels[rating - 1]}: ${count} responses (${percent.toFixed(0)}%)`}
            >
              <span>
                <span className="mr-2 font-mono font-semibold">{rating}</span>
                {labels[rating - 1]}
              </span>
              <div
                aria-hidden="true"
                className="h-3 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={`h-full rounded-full ${metric === "difficulty" ? "bg-amber-500" : "bg-primary"}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-right font-mono tabular-nums">
                {count}{" "}
                <span className="text-muted-foreground">
                  ({percent.toFixed(0)}%)
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ReviewRating({
  label,
  value,
  labels,
  metric,
}: {
  label: string;
  value: number;
  labels: readonly string[];
  metric: "difficulty" | "experience";
}) {
  return (
    <div
      className="min-w-0 space-y-3"
      aria-label={`${label}: ${value} out of 5, ${labels[value - 1]}`}
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2">
        <span
          className={`font-mono text-2xl font-semibold ${metric === "difficulty" ? "text-amber-700 dark:text-amber-400" : "text-primary"}`}
        >
          {value}
          <span className="text-sm text-muted-foreground">/5</span>
        </span>
        <span className="text-sm font-medium">{labels[value - 1]}</span>
      </div>
      <div aria-hidden="true" className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            className={`h-2 flex-1 rounded-full ${step <= value ? (metric === "difficulty" ? "bg-amber-500" : "bg-primary") : "bg-muted"}`}
          />
        ))}
      </div>
    </div>
  );
}
