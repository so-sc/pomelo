import TestHeader from "@/components/attempt/test-header";
import { problems } from "@/constants/test-data";
import React from "react";

export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const problemMeta = problems.map(({ id, type }) => ({ id: Number(id), type }));

  return (
    <main className="w-screen h-screen pt-12">
      <TestHeader problems={problemMeta} />
      {children}
    </main>
  );
}
