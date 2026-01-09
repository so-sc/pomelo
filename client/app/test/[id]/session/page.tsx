//just the code used for testing, changes needs to be done

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

// Update the interface to reflect that boilerplate is a map of languages
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
  const { getToken } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // ADDED: State to track selected language
  const [selectedLang, setSelectedLang] = useState<string>("javascript");

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/test-access/data?contestId=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();

        if (result.success) {
          setQuestions(result.data.problems);
        } else {
          toast.error("Failed to load questions");
        }
      } catch (err) {
        toast.error("Network error");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchTestData();
  }, [id, getToken]);

  if (loading) return <div className="p-20 text-center">Loading Assessment...</div>;

  const currentQuestion = questions[currentIdx];

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar: Question Navigation */}
      <div className="w-64 border-r bg-card p-4 flex flex-col">
        <h2 className="font-bold mb-4">Questions</h2>
        <div className="grid grid-cols-4 gap-2">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`h-10 w-10 rounded-lg border font-medium ${
                currentIdx === i ? "bg-primary text-white" : "hover:bg-secondary"
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
          <h1 className="text-lg font-semibold">{currentQuestion?.title}</h1>
          
          <div className="flex items-center gap-4">
            {/* ADDED: Language Selector */}
            <select 
              value={selectedLang} 
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-secondary text-sm border rounded px-2 py-1 outline-none"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>

            <button className="bg-green-600 text-white px-4 py-2 rounded-md font-bold hover:bg-green-700">
              Submit Assessment
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase px-2 py-1 bg-secondary rounded text-muted-foreground">
              {currentQuestion?.difficulty}
            </span>
            <h2 className="text-2xl font-bold mt-2">{currentQuestion?.title}</h2>
            <div className="mt-4 prose dark:prose-invert">
              <p>{currentQuestion?.description}</p>
            </div>
            
            <div className="mt-10 p-4 bg-zinc-900 text-zinc-100 rounded-lg font-mono text-sm overflow-x-auto">
              <p className="text-zinc-500 mb-2">Initial {selectedLang} Boilerplate</p>
              {/* FIXED: Accessing the specific language string from the object */}
              <pre>
                {currentQuestion?.boilerplate?.[selectedLang as keyof typeof currentQuestion.boilerplate] || "No code available for this language."}
              </pre>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}