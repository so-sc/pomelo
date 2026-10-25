"use client";

import { useIsClient } from "@/hooks/use-is-client";

interface LocalTimeProps {
  iso: string;
  fallback?: string;
}

export function LocalTime({ iso, fallback = "Unknown" }: LocalTimeProps) {
  const isClient = useIsClient();
  const date = new Date(iso);
  if (isNaN(date.getTime())) return <>{fallback}</>;
  return (
    <time dateTime={iso}>
      {isClient ? date.toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }) : "…"}
    </time>
  );
}
