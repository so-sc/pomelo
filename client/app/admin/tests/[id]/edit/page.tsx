import { notFound } from "next/navigation";
import TestForm from "@/components/admin/test/test-form";
import { db } from "@/lib/db";
import { Problem } from "@/types/problem";

export const dynamic = "force-dynamic";

interface IdParams {
  id: string;
}

interface MongoTest {
  _id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  questions?: QuestionReference[];
  rules?: string[];
  status?: string;
  joinId?: string;
  createdAt?: string;
}

type QuestionReference =
  | string
  | {
      _id?: string;
      id?: string;
      title?: string;
      type?: string;
      difficulty?: string;
    };

export default async function AdminTestEditPage({
  params,
}: {
  params: Promise<IdParams>;
}) {
  const { id } = await params;

  let availableQuestions: Problem[] = [];
  try {
    availableQuestions = await db.find<Problem>("questions") as Problem[];
  } catch (e) {
    console.error("Failed to fetch questions", e);
  }

  if (id === "new") {
    return (
      <div className="flex-1 h-full bg-background text-foreground overflow-x-hidden">
        <div className="h-full w-full">
          <TestForm testData={null} availableQuestions={availableQuestions} />
        </div>
      </div>
    );
  }

  let testDataRaw: MongoTest | null = null;
  try {
    testDataRaw = await db.findOne<MongoTest>("contests", { _id: id });
  } catch (e) {
    console.error(e);
  }

  if (testDataRaw?.questions?.length) {
    const bankIds = new Set(availableQuestions.map((q) => q._id || q.id));
    testDataRaw.questions.forEach((q) => {
      if (typeof q === "string") return;
      const qid = q._id || q.id;
      if (qid && !bankIds.has(qid)) {
        availableQuestions.push({ ...q, id: qid, removedFromBank: true } as Problem);
      }
    });
  }

  let testData = null;
  if (testDataRaw) {
    testData = {
      ...testDataRaw,
      id: testDataRaw._id,
      startsAt: testDataRaw.startTime ? new Date(testDataRaw.startTime).toISOString() : '',
      endsAt: testDataRaw.endTime ? new Date(testDataRaw.endTime).toISOString() : '',
      duration: '',
      endsAtTime: '',
      durationMinutes: testDataRaw.durationMinutes || 60,
      problems: (testDataRaw.questions || []).map((q) => typeof q === 'string' ? q : (q._id || q.id || String(q))),
      rules: testDataRaw.rules || [],
      status: (testDataRaw.status || "waiting") as "waiting" | "ongoing" | "completed",
      totalQuestions: testDataRaw.questions?.length || 0,
      participantsInProgress: 0,
      participantsCompleted: 0,
      joinId: testDataRaw.joinId || '',
      createdAt: testDataRaw.createdAt || new Date().toISOString(),
    };
  }

  if (!testData) {
    return notFound();
  }

  return (
    <div className="flex-1 h-full bg-background text-foreground overflow-x-hidden">
      <div className="h-full w-full">
        <TestForm testData={testData} availableQuestions={availableQuestions} />
      </div>
    </div>
  );
}
