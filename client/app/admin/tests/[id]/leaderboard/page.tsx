import React from "react";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, BarChart3, AlertCircle, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeaderboardTable } from "@/components/admin/test/leaderboard-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBaseUrl } from "@/lib/env";
import { Pagination } from "@/components/admin/pagination";

export const dynamic = "force-dynamic";

const LEADERBOARD_PAGE_SIZE = 25;

interface LeaderboardPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

interface LeaderboardData {
  contestId: string;
  title: string;
  endTime: string;
  totalParticipants: number;
  topScore: number;
  maxScore: number;
  page: number;
  limit: number;
  leaderboard: {
    rank: number;
    name: string;
    totalScore: number;
    submittedAt: string | null;
    status: string;
  }[];
}

type LeaderboardResult = 
  | { success: false; status: number; data?: never }
  | { success: true; status: number; data: LeaderboardData };

async function getLeaderboardData(id: string, page: number): Promise<LeaderboardResult> {
  const session = await auth();
  const token = session?.backendToken;

  if (!token) return { success: false, status: 401 };

  try {
    const res = await fetch(
      `${getBaseUrl()}/api/test/${id}/leaderboard?page=${page}&limit=${LEADERBOARD_PAGE_SIZE}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (res.status === 403) return { success: false as const, status: 403 };
    if (res.status === 404) return { success: false as const, status: 404 };

    const json = await res.json();
    if (json.success) {
      return { success: true as const, status: res.status, data: json.data as LeaderboardData };
    }
    return { success: false as const, status: res.status };
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return { success: false as const, status: 500 };
  }
}

export default async function AdminLeaderboardPage({ params, searchParams }: LeaderboardPageProps) {
  const { id } = await params;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const result = await getLeaderboardData(id, page);

  if (result.status === 404) return notFound();

  const isAccessDenied = result.status === 403;

  return (
    <div className="flex-1 overflow-auto bg-background h-full">
      <div className="max-w-none w-full p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 pb-16">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" className="mt-1 shrink-0" asChild>
              <Link href={`/admin/tests/${id}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {result.success ? result.data.title : "Leaderboard"}
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                Performance rankings and official scores for this test.
              </p>
            </div>
          </div>
        </header>

        {isAccessDenied ? (
          <Card className="border-amber-500/20 bg-amber-500/5 shadow-sm max-w-2xl mx-auto">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle className="text-amber-700 text-2xl font-bold">Leaderboard Locked</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-amber-800/80 font-medium">
                Ranked results are only displayed after a contest has officially ended.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" className="border-amber-200 hover:bg-amber-100" asChild>
                  <Link href={`/admin/tests/${id}`}>Return to Details</Link>
                </Button>
                <Button className="bg-amber-600 hover:bg-amber-700" asChild>
                  <Link href={`/admin/tests/${id}/edit`}>Manage Test</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : result.success ? (
          <div className="space-y-6 sm:space-y-8">
            <section className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Statistical Overview</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <AdvancedStatCard
                  label="Participated Students"
                  value={result.data.totalParticipants}
                  icon={<User className="h-5 w-5" />}
                  description="Total recorded attempts"
                />
                <AdvancedStatCard
                  label="Highest Score"
                  value={`${result.data.topScore ?? 0} / ${result.data.maxScore || 0}`}
                  icon={<Award className="h-5 w-5" />}
                  description="Top performer index"
                />
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Final Standings</h2>
                  <Badge variant="secondary" className="rounded-full px-3 py-0">
                    {result.data.totalParticipants} ranked
                  </Badge>
                </div>
              </div>
              <LeaderboardTable data={result.data.leaderboard} maxScore={result.data.maxScore || 0} />
              <Pagination
                page={page}
                total={result.data.totalParticipants}
                pageSize={LEADERBOARD_PAGE_SIZE}
              />
            </section>
          </div>
        ) : (
          <Card className="border-destructive/20 bg-destructive/5 shadow-sm max-w-2xl mx-auto">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4 text-destructive">
                <AlertCircle className="h-6 w-6" />
              </div>
              <CardTitle className="text-destructive text-2xl font-bold">Error Loading Results</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground font-medium mb-6">
                There was a problem retrieving the leaderboard data. Please try again later.
              </p>
              <Button variant="outline" asChild>
                <Link href="/admin/tests">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactElement;
  description: string;
}

function AdvancedStatCard({ label, value, icon, description }: StatCardProps) {
  return (
    <Card className="border-border bg-card shadow-sm transition-all hover:shadow-md">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/30 text-primary">
          {icon}
        </div>
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="font-mono text-4xl font-bold tracking-tight text-foreground">{value}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
