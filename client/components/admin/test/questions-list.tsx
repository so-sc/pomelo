import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BaseProblem } from "@/types/problem/problem.types";
import QuestionCard from "../question/question-card";

interface TestQuestionsProps {
    questions: string[] | BaseProblem[];
    availableQuestions?: BaseProblem[];
}

export default function TestQuestions({ questions, availableQuestions = [] }: TestQuestionsProps) {
  let filteredProblems: BaseProblem[] = [];

  if (Array.isArray(questions) && questions.length > 0) {
      if (typeof questions[0] === 'string') {
          // It's a list of IDs, resolve them
          filteredProblems = (questions as string[])
            .map((id) => availableQuestions.find((problem) => 
                (problem._id && problem._id === id) || (String(problem.id) === id)
            ))
            .filter((problem): problem is BaseProblem => !!problem);
      } else {
          // It's already populated objects
          filteredProblems = questions as BaseProblem[];
      }
  } else if (Array.isArray(questions)) {
      // Empty array
      filteredProblems = [];
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Questions ({filteredProblems.length})
            </CardTitle>
            <CardDescription>View test questions</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredProblems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No questions yet</p>
            <p className="text-sm">Get started</p>
          </div>
        ) : (
          // Capped like the picker in add-question.tsx, so a long question list
          // scrolls inside the card instead of stretching the page.
          <ScrollArea className="h-[52vh] pr-4">
            <div className="space-y-4">
              {filteredProblems.map((problem, index) => (
                <QuestionCard key={`${problem._id || problem.id}-${index}`} problem={problem} hideActions={true} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
