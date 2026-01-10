//trial landing page, needs to be replaced with actual test taking interface.


"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react"; 
import { toast } from "sonner";

interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  boilerplate: {
    cpp?: string;
    java?: string;
    python?: string;
    javascript?: string;
    c?: string;
  };
}

export default function TestSessionPage() {
  const { id } = useParams();
  
  // Next-Auth Session Hook
  const { data: session, status } = useSession();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLang, setSelectedLang] = useState<string>("javascript");

  useEffect(() => {
    const fetchTestData = async () => {
      
      if (status !== "authenticated" || !session?.backendToken || !id) return;

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/test-access/data?contestId=${id}`, {
          headers: { 
            
            "Authorization": `Bearer ${session.backendToken}`,
            "Content-Type": "application/json"
          },
        });
        
        const result = await res.json();

        if (result.success) {
          // Checking if problems exist in the response
          setQuestions(result.data.problems || []);
        } else {
          toast.error(result.message || "Failed to load questions");
        }
      } catch (err) {
        console.error("Session Fetch Error:", err);
        toast.error("Network error: Could not reach the server");
      } finally {
        setLoading(false);
      }
    };

    fetchTestData();
  }, [id, session, status]);

  // Handling Loading states
  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Loading Assessment Data...</p>
        </div>
      </div>
    );
  }

  // Handling Unauthenticated or Empty state
  if (status === "unauthenticated") return <div className="p-20 text-center">Please log in to access this test.</div>;
  if (questions.length === 0) return <div className="p-20 text-center">No questions found for this contest.</div>;

  const currentQuestion = questions[currentIdx];

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Left Sidebar: Question Navigation */}
      <div className="w-64 border-r bg-card p-4 flex flex-col">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <span>Questions</span>
          <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{questions.length}</span>
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`h-10 w-10 rounded-lg border font-medium transition-colors ${
                currentIdx === i ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-secondary text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
          <div className="flex flex-col">
            <h1 className="text-md font-semibold truncate max-w-[300px]">{currentQuestion?.title}</h1>
            <span className="text-[10px] text-muted-foreground">ID: {currentQuestion?.id}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              value={selectedLang} 
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-secondary text-sm border rounded px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="c">C</option>
            </select>

            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-bold hover:bg-primary/90 transition-all shadow-sm">
              Submit Assessment
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                currentQuestion?.difficulty === 'hard' ? 'bg-red-500/10 text-red-500' : 
                currentQuestion?.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-500' : 
                'bg-green-500/10 text-green-500'
              }`}>
                {currentQuestion?.difficulty}
              </span>
            </div>

            <h2 className="text-3xl font-extrabold mt-3 tracking-tight">{currentQuestion?.title}</h2>
            
            <div className="mt-6 prose prose-zinc dark:prose-invert max-w-none">
              <p className="text-lg leading-relaxed text-muted-foreground">
                {currentQuestion?.description}
              </p>
            </div>
            
            <div className="mt-12">
              <div className="flex items-center justify-between mb-3">
                 <h3 className="text-sm font-semibold text-zinc-400 font-mono">Starter Code ({selectedLang})</h3>
              </div>
              <div className="p-6 bg-zinc-950 text-zinc-100 rounded-xl border border-zinc-800 font-mono text-sm overflow-x-auto shadow-2xl">
                <pre>
                  <code>
                    {currentQuestion?.boilerplate?.[selectedLang as keyof typeof currentQuestion.boilerplate] || "// No starter code available for this language."}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}