"use client";

import React, { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FcGoogle } from "react-icons/fc";
import { MdEmail } from "react-icons/md";
import { RiLockPasswordFill } from "react-icons/ri";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { authenticate } from "@/app/actions/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ssoError, setSsoError] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailPasswordLoading, setIsEmailPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "OAuthAccountNotLinked") {
      setSsoError("To confirm your identity, sign in with the same account you used originally.");
    } else if (error) {
      setSsoError("Authentication failed. Please try again.");
    }
  }, [searchParams]);

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let valid = true;

    if (!email.trim()) {
      toast.error("Email is required.");
      valid = false;
    } else if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      valid = false;
    }

    if (!password.trim()) {
      toast.error("Password is required.");
      valid = false;
    } else if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsEmailPasswordLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      
      const result = await authenticate(undefined, formData);

      if (result === "success") {
        // Redirect handled by middleware/server action usually, but if we get here:
        window.location.href = "/";
      } else if (result) {
        toast.error(result);
      }
    } catch (err) {
      toast.error("Login failed. Please try again.");
    } finally {
      setIsEmailPasswordLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading) return;

    setIsGoogleLoading(true);
    setSsoError("");

    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (err: unknown) {
      setSsoError("Failed to initiate Google sign-in. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <main className="h-screen flex items-center justify-center p-0">
      <div className="grid w-full h-full grid-cols-1 md:grid-cols-2">
        <div className="bg-primary flex items-center justify-center" />

        <div className="bg-background flex items-center justify-center px-4 sm:px-10 py-8">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
                LOGIN
              </h1>
              <div className="h-1 w-24 bg-primary rounded-full" />
            </div>

            {ssoError && (
              <Alert variant="destructive">
                <AlertDescription>{ssoError}</AlertDescription>
              </Alert>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <div className="relative">
                  <MdEmail
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    size={20}
                  />
                  <Input
                    className="pl-12 pr-4 py-3 bg-muted text-foreground rounded-md"
                    type="text"
                    placeholder="E-Mail ID"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    name="email"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <RiLockPasswordFill
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    size={20}
                  />
                  <Input
                    className="pl-12 pr-10 py-3 bg-muted text-foreground rounded-md"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    name="password"
                  />
                  <div
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </div>
                </div>
              </div>

              <div className="text-right -mt-2">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:no-underline"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isEmailPasswordLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full py-3"
              >
                {isEmailPasswordLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>

              <div className="text-center">
                <span className="text-sm text-muted-foreground">
                  New user?{" "}
                </span>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 text-sm text-primary hover:no-underline cursor-pointer"
                  onClick={() => router.replace("/auth/register")}
                >
                  Sign Up
                </Button>
              </div>

              <div className="flex items-center my-6">
                <hr className="flex-grow border-muted" />
                <span className="px-4 text-sm text-muted-foreground">OR</span>
                <hr className="flex-grow border-muted " />
              </div>

              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="flex items-center justify-center w-full gap-3 bg-background border-2 border-input text-foreground rounded-md py-3 hover:bg-accent"
                variant="outline"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <FcGoogle size={20} />
                    Continue With Google
                  </>
                )}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center">
              ©2025 All rights reserved
            </p>
          </div>
        </div>
      </div>
    </main>
  );
} 