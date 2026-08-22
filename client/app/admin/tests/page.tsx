import type { Metadata } from "next";
import { TestsList } from "@/components/admin/test/tests-list";
import { fetchBackend } from "@/lib/fetch";

export const metadata: Metadata = {
  title: "Manage Tests",
  description: "View and manage code assessment tests on Pomelo.",
};

export const dynamic = "force-dynamic";

export const TESTS_PAGE_SIZE = 12;

async function getTests(query: string) {
  try {
    const data = await fetchBackend(`/api/admin/tests?${query}`);
    if (data.success) return { tests: data.contests, total: data.total ?? 0 };
    return { tests: [], total: 0 };
  } catch (error) {
    console.error("Error fetching admin tests:", error);
    return { tests: [], total: 0 };
  }
}

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminTestsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.q || "";
  const status = params.status && params.status !== "all" ? params.status : "";
  const from = params.from || "";
  const to = params.to || "";

  const query = new URLSearchParams({ page: String(page), limit: String(TESTS_PAGE_SIZE) });
  if (search) query.set("q", search);
  if (status) query.set("status", status);
  if (from) query.set("from", from);
  if (to) query.set("to", to);

  const { tests, total } = await getTests(query.toString());

  return (
    <TestsList
      initialTests={tests}
      total={total}
      page={page}
      search={search}
      status={status}
      from={from}
      to={to}
    />
  );
}
