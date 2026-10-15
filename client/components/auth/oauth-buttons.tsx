"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthMethods } from "@/lib/auth/providers";

// Icons for known providers; anything else gets a generic key.
const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  google: <FcGoogle size={20} />,
};

type Props = {
  providers: AuthMethods["oauth"];
  /** Draw an "OR" divider above the buttons (when a password form is shown too). */
  divider?: boolean;
  onError: (message: string) => void;
};

export function OAuthButtons({ providers, divider, onError }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!providers.length) return null;

  const handleSignIn = async (id: string, label: string) => {
    if (loadingId) return;

    setLoadingId(id);
    onError("");

    try {
      await signIn(id, { callbackUrl: "/" });
    } catch {
      onError(`Failed to initiate ${label} sign-in. Please try again.`);
      setLoadingId(null);
    }
  };

  return (
    <>
      {divider && (
        <div className="flex items-center my-6">
          <hr className="grow border-muted" />
          <span className="px-4 text-sm text-muted-foreground">OR</span>
          <hr className="grow border-muted " />
        </div>
      )}

      <div className="space-y-3">
        {providers.map(({ id, label }) => (
          <Button
            key={id}
            type="button"
            onClick={() => handleSignIn(id, label)}
            disabled={!!loadingId}
            className="flex items-center justify-center w-full gap-3 bg-background border-2 border-input text-foreground rounded-md py-3 hover:bg-accent cursor-pointer disabled:opacity-50"
            variant="outline"
          >
            {loadingId === id ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                {PROVIDER_ICONS[id] ?? <KeyRound className="h-5 w-5" />}
                Continue With {label}
              </>
            )}
          </Button>
        ))}
      </div>
    </>
  );
}
