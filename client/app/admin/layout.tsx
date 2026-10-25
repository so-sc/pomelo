import type { Metadata } from "next";
import AdminSidebar from "@/components/admin/admin-sidebar";
import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: {
    default: "Admin Dashboard",
    template: "%s | Pomelo Admin",
  },
  description: "Administrative panel for Pomelo contest platform.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy's matcher skips image-like paths (e.g. /admin/tests/x.png), so check here too.
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "admin") redirect("/auth/login?callbackUrl=%2Fadmin");

  return (
    <main className="flex h-screen overflow-hidden w-full pt-12">
      <AdminSidebar />
      <div className="flex-1 w-full pb-16 md:pb-0 overflow-y-auto">
        {children}
      </div>
    </main>
  );
}
