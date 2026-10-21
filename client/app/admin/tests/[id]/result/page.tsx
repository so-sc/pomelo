import { fetchBackend } from "@/lib/fetch";
import {
    ArrowLeft,
    Users,
    Award,
    ExternalLink,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LocalTime } from "@/components/ui/local-time";
import ExportResultsButtons from "@/components/admin/test/export-results-buttons";
import { Pagination } from "@/components/admin/pagination";
import { ResultFilterBar } from "@/components/admin/test/result-filter-bar";
import { SearchFocusKeeper } from "@/components/admin/test/search-focus-keeper";
import { Suspense } from "react";

const RESULTS_PAGE_SIZE = 25;

/* ---------- Types ---------- */
interface Participant {
    userId: string;
    name: string;
    email: string;
    score: number;
    submittedAt: string;
}

interface TestResult {
    id: string;
    testName: string;
    description: string;
    participants: Participant[];
    stats: {
        totalParticipants: number;
        averageScore: number;
        maxScore: number;
    };
}

interface MongoUser {
    _id: string;
    name: string;
    email: string;
}

interface MongoSubmission {
    user?: MongoUser;
    totalScore: number;
    submittedAt: string;
}

interface ResultsResponse {
    success: boolean;
    contest: {
        _id: string;
        title: string;
        description: string;
        maxScore: number;
    };
    results: MongoSubmission[];
    total: number;
    wholeTestParticipants: number;
    averageScore: number;
}

export default async function AdminTestResultPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    const { id } = await params;
    const sp = await searchParams;
    const page = Math.max(1, Number(sp.page) || 1);

    const qs = new URLSearchParams({
        page: String(page),
        limit: String(RESULTS_PAGE_SIZE),
    });
    if (sp.q) qs.set("q", sp.q);
    if (sp.scoreMin) qs.set("scoreMin", sp.scoreMin);
    if (sp.scoreMax) qs.set("scoreMax", sp.scoreMax);
    if (sp.date) qs.set("date", sp.date);
    if (sp.sort) qs.set("sort", sp.sort);

    const response: ResultsResponse = await fetchBackend(
        `/api/admin/tests/${id}/result?${qs.toString()}`
    );
    if (!response?.success) {
        return notFound();
    }

    const { contest, results, total, wholeTestParticipants, averageScore } = response;

    // Handle edge cases for manual URL manipulation (page beyond limits)
    const pages = Math.ceil(total / RESULTS_PAGE_SIZE);
    if (page > 1 && total > 0 && page > pages) {
        const qs = new URLSearchParams(sp as Record<string, string>);
        qs.set("page", String(pages));
        redirect(`/admin/tests/${id}/result?${qs.toString()}`);
    } else if (page > 1 && total === 0) {
        const qs = new URLSearchParams(sp as Record<string, string>);
        qs.delete("page");
        redirect(`/admin/tests/${id}/result?${qs.toString()}`);
    }

    const participants: Participant[] = results
        .filter(sub => sub && sub.user) // Filter out corrupt data
        .map(sub => ({
            userId: sub.user?._id || 'unknown',
            name: sub.user?.name || 'Unknown User',
            email: sub.user?.email || 'N/A',
            score: sub.totalScore || 0,
            submittedAt: sub.submittedAt
        }));

    const data: TestResult = {
        id: contest._id,
        testName: contest.title,
        description: contest.description,
        participants,
        stats: {
            totalParticipants: wholeTestParticipants,
            averageScore,
            maxScore: contest.maxScore
        }
    };

    // "X of Y" badge logic: Sort alone does not trigger it
    const isFilterActive = !!(
        sp.q || 
        sp.scoreMin ||
        sp.scoreMax || 
        (sp.date && sp.date !== "any")
    );

    return (
        <div className="flex-1 overflow-auto bg-background h-full">
            <div className="max-w-none w-full p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 pb-16">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                        <Button variant="outline" size="icon" className="mt-1 shrink-0" asChild>
                            <Link href={`/admin/tests/${data.id}`}>
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div className="space-y-2">
                            <Badge variant="outline" className="w-fit">
                                Test Results
                            </Badge>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                {data.testName}
                            </h1>
                            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                                {data.description}
                            </p>
                        </div>
                    </div>
                    <ExportResultsButtons contestId={data.id} contestTitle={data.testName} />
                </header>

                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Statistical Metrics</h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <AdvancedStatCard
                            label="Total Participants"
                            value={data.stats.totalParticipants}
                            icon={<Users className="h-5 w-5" />}
                            description="Completed submissions"
                        />
                        <AdvancedStatCard
                            label="Mean Score"
                            value={`${data.stats.averageScore.toFixed(1)} / ${data.stats.maxScore}`}
                            icon={<Award className="h-5 w-5" />}
                            description="Average across participants"
                        />
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Student Submissions</h2>
                            <Badge variant="secondary" className="rounded-full px-3 py-0">
                                {isFilterActive ? `${total} of ${wholeTestParticipants}` : `${wholeTestParticipants} total`}
                            </Badge>
                        </div>
                    </div>

                    <SearchFocusKeeper />

                    <Suspense fallback={null}>
                        <ResultFilterBar maxScore={contest.maxScore} />
                    </Suspense>

                    <Card className="overflow-hidden border-border bg-card shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="py-5 px-6 font-semibold text-foreground">Candidate</TableHead>
                                    <TableHead className="font-semibold text-foreground">Score</TableHead>
                                    <TableHead className="font-semibold text-foreground">Submitted</TableHead>
                                    <TableHead className="text-right px-6 font-semibold text-foreground">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                    {data.participants.length > 0 ? (
                                        data.participants.map((p, idx) => (
                                            <TableRow
                                                key={`${p.userId}-${idx}`}
                                                className="border-border/60 hover:bg-muted/20"
                                            >
                                                <TableCell className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40 font-semibold text-foreground">
                                                            {p.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="truncate font-semibold text-foreground">{p.name}</div>
                                                            <div className="truncate text-sm text-muted-foreground">{p.email}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono text-base font-semibold text-foreground">{p.score} / {data.stats.maxScore}</span>
                                                        <Badge variant="secondary" className="font-mono text-[11px]">
                                                            Score
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    <LocalTime iso={p.submittedAt} />
                                                </TableCell>
                                                <TableCell className="px-6">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <Link href={`/admin/tests/${data.id}/submissions/${p.userId}`}>
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                                Review
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : wholeTestParticipants === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="py-20 text-center text-muted-foreground font-medium">
                                                No submissions recorded for this test yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="py-20 text-center text-muted-foreground font-medium">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span>No submissions match your filters.</span>
                                                    <Link href={`/admin/tests/${data.id}/result`} className="text-primary hover:underline text-sm font-semibold">
                                                        Clear filters
                                                    </Link>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                            </TableBody>
                        </Table>
                    </Card>

                    <Pagination page={page} total={total} pageSize={RESULTS_PAGE_SIZE} />
                </section>
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
        <Card className="border-border bg-card shadow-sm">
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