import React from "react";
import { Loader2 } from "lucide-react";
import { getAuthMethods } from "@/lib/auth/providers";
import LoginForm from "./login-form";

// Auth methods come from runtime env set by the admin daemon, so this must not be prerendered.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <LoginForm methods={getAuthMethods()} />
    </React.Suspense>
  );
}
