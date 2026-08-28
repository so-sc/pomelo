"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "@/components/ui/banner";
import { AlertCircle, Calendar, Hourglass, CalendarX2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getContestLanding, startTest, getContestData } from "@/actions/contest";
import { clearAttemptIntegrityState } from "@/lib/attempt-integrity";

interface ContestDetails {
  title: string;
  description: string;
  rules: string[];
  duration: number;
  totalProblems: number;
  startTime: string;
  endTime: string;
  serverTime: string;
  canStart: boolean;
  isEnded?: boolean;
}

export default function ContestLanding() {
  const { id: testid } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [details, setDetails] = useState<ContestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);

  const updateCountdown = useCallback((startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const diff = start - now;

    if (diff <= 0) {
      setTimeLeft("00:00:00");
      return true;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setTimeLeft(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    );
    return false;
  }, []);

  const fetchInstructions = useCallback(async () => {
    if (status !== "authenticated" || !testid) return;

    try {
      const result = await getContestLanding(testid as string);

      if (result.success && result.data) {
        const now = new Date().getTime();
        const end = new Date(result.data.endTime).getTime();
        const isEnded = result.data.isEnded || now > end;
        setDetails({ ...result.data, isEnded });
      } else {
        toast.error(result.message || "Failed to fetch data");
      }
    } catch {
      toast.error("Failed to load instructions");
    } finally {
      setLoading(false);
    }
  }, [testid, status]);

  useEffect(() => {
    if (testid && status === "authenticated") fetchInstructions();
  }, [testid, status, fetchInstructions]);

  useEffect(() => {
    if (!details || details.canStart || details.isEnded) return;

    const interval = setInterval(() => {
      const isTimeUp = updateCountdown(details.startTime);
      if (isTimeUp) {
        setDetails(prev => prev ? { ...prev, canStart: true } : null);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [details, updateCountdown]);

  const handleStart = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch {
          // The attempt screen will retry and enforce full-screen if the browser blocks this call.
        }
      }

      // Clear any old violation counts and code drafts from a previous attempt
      clearAttemptIntegrityState(testid as string);
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith("pomelo_draft_")) {
            localStorage.removeItem(key);
          }
        });
      } catch {}

      const result = await startTest(testid as string);

      if (result.success) {
        // Fetch problems to redirect to the first one
        const questionsData = await getContestData(testid as string);
        if (questionsData.success && questionsData.data.problems?.length > 0) {
          router.push(`/attempt/test/${testid}/question/${questionsData.data.problems[0].id}`);
        } else {
          router.push(`/attempt/test/${testid}/session`); // fallback
        }
      } else {
        toast.error(result.error || result.message || "Failed to start session");
        if (document.fullscreenElement && document.exitFullscreen) {
          try {
            await document.exitFullscreen();
          } catch {}
        }
      }
    } catch {
      toast.error("Network error: Could not start assessment");
      if (document.fullscreenElement && document.exitFullscreen) {
        try {
          await document.exitFullscreen();
        } catch {}
      }
    }
  };

  const handleStartClick = () => {
    setShowFullscreenPrompt(true);
  };

  const handleCancelStart = () => {
    setShowFullscreenPrompt(false);
  };

  const handleConfirmStart = async () => {
    setShowFullscreenPrompt(false);
    await handleStart();
  };

  if (status === "loading" || loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-muted-foreground animate-pulse">Initializing Session & Fetching Rules...</p>
    </div>
  );

  return (
    <>
      <main className="h-full flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden pt-12">
        <div className="flex-1 min-w-0 flex flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
          <header className="shrink-0 bg-background px-6 md:px-16 lg:px-16 xl:px-24 pt-12 pb-6 space-y-6">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold text-primary bg-primary/5">
              Assessment Environment
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">{details?.title}</h1>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InfoStat
                icon={<Calendar className="h-4 w-4" />}
                label="Starts"
                value={
                  details
                    ? new Date(details.startTime).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"
                }
              />
              <InfoStat
                icon={<Hourglass className="h-4 w-4" />}
                label="Duration"
                value={`${details?.duration ?? "-"} min`}
              />
              <InfoStat
                icon={<CalendarX2 className="h-4 w-4" />}
                label="Ends"
                value={
                  details
                    ? new Date(details.endTime).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"
                }
              />
              <InfoStat
                icon={<ListChecks className="h-4 w-4" />}
                label="Questions"
                value={`${details?.totalProblems ?? "-"}`}
              />
            </div>
          </header>

          <div className="flex-1 lg:min-h-0 lg:overflow-y-auto px-6 md:px-16 lg:px-16 xl:px-24 pt-2 pb-12 lg:pb-16">
            {details?.description ? (
              <section className="max-w-3xl pb-8">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Overview
                </h2>
                <p className="text-base leading-7 text-foreground/80">{details.description}</p>
              </section>
            ) : null}

            <div className="space-y-6 border-t border-border/30 pt-8 max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
                Guidelines
              </h2>
              <ul className="space-y-4 pb-2">
                {details?.rules?.map((rule, i) => (
                  <li key={i} className="flex items-start gap-5 text-muted-foreground">
                    <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-muted text-xs font-bold text-foreground">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed pt-0.5">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Solid Sidebar */}
        <div className="w-full lg:w-[400px] xl:w-[480px] lg:h-full shrink-0 bg-zinc-50 dark:bg-zinc-900/50 border-t lg:border-t-0 lg:border-l border-border/50 px-6 md:px-16 lg:px-12 py-12 lg:py-16 lg:overflow-y-auto flex flex-col">
          <div className="space-y-10">
            <div>
              <h3 className="font-semibold text-2xl tracking-tight mb-3">Assessment Entry</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Review the guidelines carefully. When you are ready, you may begin the test.</p>
            </div>

            {details?.isEnded ? (
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-destructive">
                  <span className="w-2 h-2 rounded-full bg-destructive"></span>
                  Test Ended
                </div>
                <Button disabled className="w-full h-14 text-md rounded-full shadow-sm" variant="outline">Access Closed</Button>
                <p className="text-xs text-muted-foreground text-center">This assessment is no longer accepting submissions.</p>
              </div>
            ) : !details?.canStart ? (
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
                  Starting In
                </div>
                <p className="text-5xl font-mono font-light tracking-tight text-foreground text-center tabular-nums h-14 flex items-center justify-center">{timeLeft || "00:00:00"}</p>
                <Button disabled className="w-full h-14 text-md rounded-full shadow-sm" variant="outline">Entry Locked</Button>
                <p className="text-xs text-muted-foreground text-center">The assessment will unlock automatically.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-500">
                  <span className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-500 animate-pulse"></span>
                  Test is Live
                </div>
                <Button onClick={handleStartClick} className="w-full h-14 text-md rounded-full transition-all hover:bg-primary/90 shadow-md" size="lg">
                  Start Assessment
                </Button>
                <p className="text-xs text-muted-foreground text-center">By starting, you agree to follow the rules.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {showFullscreenPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-card text-card-foreground shadow-2xl">
            <div className="space-y-2 border-b px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                Full Screen Required
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">Enter full screen to begin</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                The assessment opens in full screen to match the test rules
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                Stay on this tab, keep the window focused, and avoid exiting full screen during the
                test.
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={handleCancelStart}>
                  Not now
                </Button>
                <Button onClick={handleConfirmStart}>
                  Enter full screen and start
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
      <div className="shrink-0 text-primary/70">{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="whitespace-nowrap text-sm font-semibold leading-snug text-foreground">
          {value}
        </div>
      </div>
    </div>
  );
}
