"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignInButton, useAuth } from "@clerk/nextjs"; // Added useAuth
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";

export default function JoinContestPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth(); // Helper to get the Clerk session token
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const allFilled = otp.length === 6;

  const handleJoin = async () => {
    if (!allFilled) return;

    setIsLoading(true);
    try {
      // 1. Get the session token from Clerk
      const token = await getToken();

      // 2. Pass the token in the Authorization header
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/test-access/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // Crucial for backend 'protect' middleware
        },
        body: JSON.stringify({ joinId: otp }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/test/${result.contestId}/landing`);
      } else {
        toast.error(result.message || "Invalid Join ID");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error("Join Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="w-full max-w-md bg-card text-foreground rounded-2xl shadow-2xl p-10 flex flex-col items-center space-y-6 border border-border text-center">
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="text-muted-foreground">You must be logged in to join Collabboard tests.</p>
          <SignInButton mode="modal">
            <button className="w-full h-11 bg-primary text-primary-foreground font-semibold rounded-full hover:bg-primary/90 transition">
              Sign In
            </button>
          </SignInButton>
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
        </div>

        <InputOTP 
          maxLength={6} 
          value={otp} 
          onChange={setOtp}
          disabled={isLoading}
        >
          <InputOTPGroup className="space-x-2">
            {[...Array(6)].map((_, i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="bg-muted rounded-xl border border-border shadow-none font-semibold text-2xl w-12 h-14 text-center text-foreground"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <button
          onClick={handleJoin}
          disabled={!allFilled || isLoading}
          className={`w-full h-11 text-lg font-semibold rounded-full shadow-md transition duration-200 ease-in-out
            ${
              allFilled && !isLoading
                ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
        >
          {isLoading ? "Validating..." : "Join"}
        </button>
      </div>
    </main>
  );
}