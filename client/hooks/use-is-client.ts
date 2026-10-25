"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function useIsClient() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
