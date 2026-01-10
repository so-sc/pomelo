"use client";

import React, { Fragment } from "react";
import Link from "next/link";
import { ModeToggle } from "./theme-toggle";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "./ui/button";
import { LogIn } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { UserButton } from "@/components/user-button";

export default function Navbar() {
  const pathname = usePathname();
  const hiddenPaths = ["/attempt"];

  const showNavbar = !hiddenPaths.some((path) => pathname.startsWith(path));

  const { status } = useSession();
  const isLoaded = status !== "loading";
  const isAuthenticated = status === "authenticated";

  if (!showNavbar) return null;

  return (
    <header className="absolute top-0 z-10 w-full">
      <nav className="bg-background-navbar h-12 flex items-center justify-between px-6 shadow-md">
        {/* Logo/Brand */}
        <div className="flex items-center">
          <Link href="/">
            <span className="font-semibold text-foreground text-lg cursor-pointer">
              SOSC
            </span>
          </Link>
        </div>

        {/* Right side */}
        <ul className="flex items-center space-x-4">
          <li>
            <ModeToggle />
          </li>

          <li className="min-w-8 flex items-center">
            {!isLoaded ? (
              <Skeleton className="w-8 h-8 rounded-full bg-background" />
            ) : (
              <Fragment>
                {isAuthenticated ? (
                  <UserButton />
                ) : (
                  <Link href="/auth/login">
                    <Button
                      variant="ghost"
                      className="w-8 h-8 p-0 rounded-full flex items-center justify-center"
                    >
                      <LogIn size={16} />
                    </Button>
                  </Link>
                )}
              </Fragment>
            )}
          </li>
        </ul>
      </nav>
    </header>
  );
}
