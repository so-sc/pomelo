"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Code2,
    HelpCircle,
    Trophy,
    User,
    Clock,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import { getTestById, getQuestionById } from "@/constants/test-data";
import { getSubmissionDetails } from "@/app/actions/fetch-submissions";

// --- Types for Submissions ---
interface SubmissionDetail {
    questionId: number;
    type: "mcq" | "coding";
    questionTitle: string;
    points: number;
    earnedPoints: number;
    status: "PASSED" | "FAILED" | "PARTIAL";

    // MCQ specific
    selectedOptions?: string[];
    correctOptions?: string[];
    options?: { id: string; text: string }[];

    // Coding specific
    submittedCode?: string;
    language?: string;
    testCases?: {
        id: number;
        isHidden: boolean;
        passed: boolean;
    }[];
}

interface UserSubmission {
    userId: string;
    userName: string;
    testId: string;
    testName: string;
    totalScore: number;
    maxScore: number;
    submittedAt: string;
    details: SubmissionDetail[];
}


export default function SubmissionDetailPage() {
    const { id, userId } = useParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<UserSubmission | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            const test = getTestById(id as string);
            if (!test) {
                setLoading(false);
                return;
            }

            const participant = test.participants?.find(p => p.userId === userId);

            // Mocking submission details based on questions in the test
            const details: SubmissionDetail[] = (test.problems || []).map(qId => {
                const q = getQuestionById(qId);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const qAny = q as any;
                if (!q) return null as any;

                if (q.type === "mcq") {
                    const options = (qAny.options || []).map((opt: string | { id: string, text: string }, i: number) => {
                        if (typeof opt === 'string') return { id: String.fromCharCode(97 + i), text: opt };
                        return opt;
                    });

                    return {
                        questionId: q.id,
                        type: "mcq",
                        questionTitle: q.title,
                        points: q.marks,
                        earnedPoints: Math.random() > 0.3 ? q.marks : 0,
                        status: Math.random() > 0.3 ? "PASSED" : "FAILED",
                        selectedOptions: [options[0]?.id],
                        correctOptions: [qAny.correctAnswer || options[0]?.id], // Fallback
                        options: options
                    };
                } else {
                    return {
                        questionId: q.id,
                        type: "coding",
                        questionTitle: q.title,
                        points: q.marks,
                        earnedPoints: Math.random() > 0.5 ? q.marks : q.marks / 2,
                        status: Math.random() > 0.5 ? "PASSED" : "PARTIAL",
                        submittedCode: `// User Solution for ${q.title}\nfunction solve() {\n  // Implementation details\n  return true;\n}`,
                        language: "javascript",
                        testCases: [
                            { id: 1, isHidden: false, passed: true },
                            { id: 2, isHidden: false, passed: true },
                            { id: 3, isHidden: true, passed: Math.random() > 0.5 },
                            { id: 4, isHidden: true, passed: false },
                        ]
                    };
                }
            }).filter(Boolean);

            setData({
                userId: userId as string,
                userName: participant?.name || "User",
                testId: id as string,
                testName: test.title,
                totalScore: participant?.score || 0,
                maxScore: details.reduce((sum, d) => sum + d.points, 0),
                submittedAt: participant?.submittedAt || new Date().toISOString(),
                details
            });

            setTimeout(() => setLoading(false), 500);
        };

        fetchData();
    }, [id, userId]);

    if (loading) {
        return (
            <div className="container mx-auto p-8 space-y-6">
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-24 w-full" />
                <div className="space-y-4">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            </div>
        );
    }

    if (!data) return <div className="p-8">Submission not found</div>;

    return (
        <div className="flex-1 overflow-y-auto bg-background">
            <div className="container mx-auto p-8 space-y-8 pb-16">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Submission Detail</h1>
                            <p className="text-mountain-meadow-600 font-medium">{data.userName} • {data.testName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-lg py-1 px-4 font-mono bg-background">
                            Score: {data.totalScore} / {data.maxScore}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => router.push(`/admin/users/${data.userId}`)}>
                            <User className="mr-2 h-4 w-4" />
                            Profile
                        </Button>
                    </div>
                </div>

                <Separator className="bg-border/50" />

                {/* Summary Cards */}
                <div className="grid gap-6 md:grid-cols-3">
                    <StatItem icon={<User className="h-4 w-4" />} label="Candidate" value={data.userName} />
                    <StatItem icon={<Trophy className="h-4 w-4" />} label="Total Score" value={`${data.totalScore} / ${data.maxScore}`} />
                    <StatItem icon={<Clock className="h-4 w-4" />} label="Submitted On" value={new Date(data.submittedAt).toLocaleString()} />
                </div>

                {/* Submissions List */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-400">
                            Questions & Responses
                        </h2>
                        <Badge variant="secondary" className="font-mono">{data.details.length} Items</Badge>
                    </div>

                    <div className="grid gap-6">
                        {data.details.map((detail, idx) => (
                            <div key={idx}>
                                <Card className="overflow-hidden border-border/50 bg-card/30 backdrop-blur-sm hover:bg-card/40 transition-colors">
                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                {detail.type === "mcq" ? <HelpCircle className="h-4 w-4 text-blue-400" /> : <Code2 className="h-4 w-4 text-purple-400" />}
                                                <CardTitle className="text-lg">{detail.questionTitle}</CardTitle>
                                            </div>
                                            <CardDescription>
                                                Points Earned: <span className="font-mono font-medium text-foreground">{detail.earnedPoints}</span> / {detail.points}
                                            </CardDescription>
                                        </div>
                                        <Badge variant={detail.status === "PASSED" ? "default" : detail.status === "FAILED" ? "destructive" : "secondary"}>
                                            {detail.status}
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {detail.type === "mcq" ? (
                                            <div className="grid gap-2">
                                                {detail.options?.map((opt) => {
                                                    const isSelected = detail.selectedOptions?.includes(opt.id);
                                                    const isCorrect = detail.correctOptions?.includes(opt.id);

                                                    let appearance = "bg-muted/20 border-transparent text-muted-foreground";
                                                    if (isSelected && isCorrect) appearance = "bg-green-500/10 border-green-500/30 text-green-500";
                                                    else if (isSelected && !isCorrect) appearance = "bg-red-500/10 border-red-500/30 text-red-500";
                                                    else if (!isSelected && isCorrect) appearance = "bg-green-500/5 border-green-500/10 text-green-500/60";

                                                    return (
                                                        <div
                                                            key={opt.id}
                                                            className={`p-4 rounded-xl border flex items-center justify-between transition-all ${appearance}`}
                                                        >
                                                            <span className="text-sm font-medium">{opt.text}</span>
                                                            <div className="flex gap-2">
                                                                {isCorrect && <CheckCircle2 className="h-4 w-4" />}
                                                                {isSelected && !isCorrect && <XCircle className="h-4 w-4" />}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="relative group">
                                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Badge variant="secondary" className="font-mono text-[10px]">{detail.language}</Badge>
                                                    </div>
                                                    <div className="bg-zinc-950 rounded-xl p-5 font-mono text-sm overflow-x-auto border border-white/5 shadow-2xl">
                                                        <pre className="text-zinc-300">
                                                            <code>{detail.submittedCode}</code>
                                                        </pre>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 px-1 pt-2">
                                                    <h4 className="text-xs font-black uppercase tracking-[0.15em] text-foreground/80">Test Verification</h4>
                                                    <div className="flex flex-wrap gap-3">
                                                        {detail.testCases?.map(tc => (
                                                            <div
                                                                key={tc.id}
                                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all ${tc.passed
                                                                    ? "bg-green-500/20 border-green-500/40 text-green-700 dark:text-green-400 shadow-lg shadow-green-500/20"
                                                                    : "bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-400 shadow-lg shadow-red-500/20"
                                                                    }`}
                                                            >
                                                                {tc.passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                                <span className="font-bold">{tc.isHidden ? "Hidden" : "Visible"} Test #{tc.id}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <Card className="bg-card/30 border-border/50 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary/40 transition-colors" />
            <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 bg-background rounded-xl border border-border/50 text-muted-foreground shadow-sm group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{label}</p>
                    <p className="text-lg font-bold font-mono">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
