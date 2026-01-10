// app/admin/tests/[id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";
import { auth } from "@/auth"; // Import your Next-Auth auth function

interface Contest {
  _id: string; // MongoDB uses _id
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  totalProblems: number;
  author: string;
  rules: string[];
}

export default async function TestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Get the server-side session
  const session = await auth();
  
  // Fetching real data from your Express backend
 
  let contest: Contest | null = null;
  
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/contests/${id}`, {
      headers: {
        "Authorization": `Bearer ${session?.backendToken}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 } 
    });

    if (res.ok) {
      const result = await res.json();
      contest = result.data;
    }
  } catch (error) {
    console.error("Failed to fetch contest details:", error);
  }

  if (!contest) return notFound();

  return (
    <div className="h-screen pt-12 bg-background text-foreground">
      <div className="flex flex-col md:flex-row h-full">
        {/* Main Detail Section - Left empty as per your layout */}
        <div className="flex-1 p-6 bg-muted/20"></div>

        {/* Sidebar */}
        <div className="w-full md:w-1/3 bg-card border-l shadow-md flex flex-col">
          <ScrollArea className="flex-1 min-h-0 p-6">
            <div className="space-y-6">
              {/* Title and Description */}
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {contest.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {contest.description}
                </p>
              </div>

              {/* Test Details Grid */}
              <div>
                <h3 className="text-xl font-semibold mb-2 text-primary">
                  Test Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-1 gap-4 text-sm">
                  <div>
                    <span className="block font-semibold text-primary">Start</span>
                    <p>{new Date(contest.startTime).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="block font-semibold text-primary">End</span>
                    <p>{new Date(contest.endTime).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="block font-semibold text-primary">Problems</span>
                    <p>{contest.totalProblems || 0}</p>
                  </div>
                  <div>
                    <span className="block font-semibold text-primary">Author</span>
                    <p>{contest.author || "Admin"}</p>
                  </div>
                </div>
              </div>

              {/* Rules */}
              <div>
                <h4 className="text-lg font-semibold text-primary mb-2">Rules</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {contest.rules?.map((rule, i) => (
                    <li key={i}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>
          </ScrollArea>

          {/* Take Test Button */}
          <div className="p-6 border-t">
            <Link href={`/test/${contest._id}`}>
              <Button className="w-full gap-2 py-6 text-lg">
                <Play className="w-5 h-5 fill-current" />
                Preview Test
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}