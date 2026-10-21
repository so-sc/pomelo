"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

interface LocalTimeProps {
  iso: string;
  fallback?: string;
}

export function LocalTime({ iso, fallback = "Unknown" }: LocalTimeProps) {
  const isClient = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
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
