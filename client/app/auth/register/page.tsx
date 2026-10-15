import React from "react";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getAuthMethods } from "@/lib/auth/providers";
import RegisterForm from "./register-form";

// Auth methods come from runtime env set by the admin daemon, so this must not be prerendered.
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  const methods = getAuthMethods();
  // With password login off, accounts are only created through a provider on the login page.
  if (!methods.credentials) redirect("/auth/login");

  return (
    <React.Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <RegisterForm oauth={methods.oauth} />
    </React.Suspense>
  );
}
