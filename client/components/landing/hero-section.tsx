"use client";

import React from "react";
import { Button } from "../ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function HeroSection() {
  const { status } = useSession();
  const isSignedIn = status === "authenticated";
  const router = useRouter();

  const handleJoinClick = () => {
    if (!isSignedIn) {
      router.push("/auth/login");
    } else {
      router.push("/join");
    }
  };

  return (
    <section className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-5">
      <div className="text-center space-y-4 mx-auto">
        <h1 className="text-6xl font-bold text-foreground">
          Powerful, Effortless Coding Events.
        </h1>
        <p className="text-lg text-muted-foreground max-w-[600px] mx-auto">
          Host or join programming contests, assessments, and challenges with a
          modern, reliable platform.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Button onClick={handleJoinClick}>
            Join a Test
          </Button>
        </div>
      </div>
    </section>
  );
}
