import React from "react";
import { db } from "@/lib/db";
import { QuestionsList } from "@/components/admin/question/questions-list";

export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage() {
  let questions: any[] = [];
  try {
      questions = await db.find("questions");
      console.log(questions);
  } catch(e) {
      console.error(e);
  }

  return <QuestionsList initialQuestions={questions} />;
}