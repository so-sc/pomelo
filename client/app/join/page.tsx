"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react"; 
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";

export default function JoinContestPage() {
  const router = useRouter();
  const { data: session, status } = useSession(); 
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const isLoaded = status !== "loading";
  const isSignedIn = status === "authenticated";
  const allFilled = otp.length === 6;

  // Debugging: This will help you see if the "Passport" (token) is actually there
  useEffect(() => {
    if (session) {
      console.log("Next-Auth Session Active:", session.user?.email);
      // NOTE: We changed this to check for backendToken
      console.log("Backend Token available:", !!session.backendToken); 
    }
  }, [session]);

  const handleJoin = async () => {
    if (!allFilled) return;

    setIsLoading(true);
    try {
      // ✅ FIX: Use backendToken (minted in your auth.config.ts)
      const token = session?.backendToken; 

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/test-access/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, 
        },
        body: JSON.stringify({ joinId: otp }),
      });

      // If the backend still says 401, it means the AUTH_SECRET doesn't match
      if (response.status === 401) {
        toast.error("Security verification failed. Please sign out and sign in again.");
        setIsLoading(false);
        return;
      }

      const result = await response.json();

      if (result.success) {
        toast.success(`Joining: ${result.title}`);
        router.push(`/test/${result.contestId}/landing`);
      } else {
        toast.error(result.message || "Invalid Join ID");
      }
    } catch (error) {
      toast.error("Connection failed. Check if backend is running.");
      console.error("Join Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!isSignedIn) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="w-full max-w-md bg-card text-foreground rounded-2xl shadow-2xl p-10 flex flex-col items-center space-y-6 border border-border text-center">
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="text-muted-foreground">You must be logged in to join Collabboard tests.</p>
          <button 
            onClick={() => signIn()} 
            className="w-full h-11 bg-primary text-primary-foreground font-semibold rounded-full hover:bg-primary/90 transition"
          >
            Sign In to Collabboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="w-full max-w-md bg-card text-foreground rounded-2xl shadow-2xl p-10 flex flex-col items-center space-y-10 border border-border">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide relative inline-block">
            JOIN A TEST
            <span className="block w-16 h-1 mt-2 mx-auto bg-primary rounded-full"></span>
          </h1>
          <p className="mt-4 text-sm text-muted-foreground italic">
            Enter the 6-digit code for your contest
          </p>
        </div>

        <InputOTP 
          maxLength={6} 
          value={otp} 
          onChange={setOtp}
          disabled={isLoading}
        >
          <InputOTPGroup className="flex gap-2 justify-center">
            {[...Array(6)].map((_, i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="bg-muted rounded-xl border border-border font-semibold text-2xl w-12 h-14 text-center text-foreground"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <div className="w-full space-y-4">
          <button
            onClick={handleJoin}
            disabled={!allFilled || isLoading}
            className={`w-full h-11 text-lg font-semibold rounded-full shadow-md transition
              ${allFilled && !isLoading ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {isLoading ? "Checking Code..." : "Join Contest"}
          </button>
        </div>
      </div>
    </main>
  );
}