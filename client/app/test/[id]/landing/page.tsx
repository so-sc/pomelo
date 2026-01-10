"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Clock, AlertCircle, Calendar, Hourglass } from "lucide-react";

interface ContestDetails {
  title: string;
  description: string;
  rules: string[];
  duration: number;
  startTime: string;
  serverTime: string;
  canStart: boolean;
}

export default function ContestLanding() {
  const { id } = useParams();
  const router = useRouter();
  
  // Next-Auth Session Hook
  const { data: session, status } = useSession();
  
  const [details, setDetails] = useState<ContestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>("");

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

  useEffect(() => {
    const fetchInstructions = async () => {
      
      if (status !== "authenticated" || !session?.backendToken) return;

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/test-access/${id}/landing`, {
          headers: { 
            
            "Authorization": `Bearer ${session.backendToken}`,
            "Content-Type": "application/json"
          },
        });
        
        const result = await res.json();

        if (result.success && result.data) {
          setDetails(result.data);
        } else {
          toast.error(result.message || "Failed to fetch data");
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        toast.error("Failed to load instructions");
      } finally {
        setLoading(false);
      }
    };

    if (id && status === "authenticated") fetchInstructions();
  }, [id, session, status]);

  // Handle live countdown interval
  useEffect(() => {
    if (!details || details.canStart) return;

    const interval = setInterval(() => {
      const isTimeUp = updateCountdown(details.startTime);
      if (isTimeUp) {
        setDetails(prev => prev ? { ...prev, canStart: true } : null);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [details, updateCountdown]);

  const handleStart = () => {
    toast.success("Good luck!");
    router.push(`/test/${id}/session`); 
  };

  // Loading state for both Auth and Data
  if (status === "loading" || loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-muted-foreground animate-pulse">Initializing Session & Fetching Rules...</p>
    </div>
  );

  return (
    <main className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      {/* ... (UI layout remains the same) ... */}
      <div className="space-y-2 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{details?.title}</h1>
        <p className="text-xl text-muted-foreground">{details?.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center p-4 bg-secondary/50 rounded-lg border">
          <Calendar className="mr-3 text-primary" />
          <div>
            <p className="text-xs uppercase font-bold text-muted-foreground">Start Date</p>
            <p className="font-semibold">{details ? new Date(details.startTime).toLocaleDateString() : "-"}</p>
          </div>
        </div>
        <div className="flex items-center p-4 bg-secondary/50 rounded-lg border">
          <Hourglass className="mr-3 text-primary" />
          <div>
            <p className="text-xs uppercase font-bold text-muted-foreground">Duration</p>
            <p className="font-semibold">{details?.duration} Minutes</p>
          </div>
        </div>
        <div className="flex items-center p-4 bg-primary/10 rounded-lg border border-primary/20">
          <Clock className="mr-3 text-primary" />
          <div>
            <p className="text-xs uppercase font-bold text-muted-foreground">Local Start Time</p>
            <p className="font-semibold text-primary">
                {details ? new Date(details.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card p-8 rounded-2xl border shadow-sm space-y-6">
        <div className="flex items-center space-x-2 text-xl font-bold border-b pb-4">
          <AlertCircle className="text-yellow-500" />
          <h2>Test Guidelines</h2>
        </div>
        <ul className="space-y-4">
          {details?.rules?.map((rule, i) => (
            <li key={i} className="flex items-start">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold mr-3 mt-0.5 shrink-0">
                {i + 1}
              </span>
              <span className="text-muted-foreground leading-relaxed">{rule}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        {!details?.canStart && (
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Contest begins in:</p>
            <p className="text-3xl font-mono font-bold tracking-widest text-primary">{timeLeft}</p>
          </div>
        )}

        <button 
          onClick={handleStart}
          disabled={!details?.canStart}
          className="w-full py-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold text-2xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {details?.canStart ? "Start Assessment" : "Entry Locked"}
        </button>
      </div>
    </main>
  );
}