"use client";

import { useTheme } from "next-themes";
import { useState } from "react";
import { useIsClient } from "@/hooks/use-is-client";
import { BsMoonFill, BsSunFill } from "react-icons/bs";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isReady = useIsClient() && Boolean(resolvedTheme);
  const isDark = resolvedTheme === "dark";
  const [manuallyToggled, setManuallyToggled] = useState(false);

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
    setManuallyToggled(true);
  };

  if (!isReady) {
    return <Skeleton className="w-14 h-7 rounded-full bg-muted" />;
  }

  return (
    <button
      onClick={handleToggle}
      className="w-14 h-7 flex items-center p-1 rounded-full bg-muted"
      aria-label="Toggle theme"
    >
      <motion.div
        layout
        transition={
          manuallyToggled
            ? { type: "spring", stiffness: 300, damping: 25 }
            : { duration: 0 }
        }
        animate={{ x: isDark ? 28 : 0 }}
        className="w-5 h-5 bg-card rounded-full shadow-md flex items-center justify-center"
      >
        {isDark ? (
          <BsMoonFill className="text-foreground text-xs" />
        ) : (
          <BsSunFill className="text-yellow-500 text-xs" />
        )}
      </motion.div>
    </button>
  );
}
