"use client";

import { useEffect, useState } from "react";
import type { StatusServidor } from "./types";

let promessa: Promise<StatusServidor> | null = null;

export function useStatus() {
  const [s, setS] = useState<StatusServidor | null>(null);
  useEffect(() => {
    promessa ??= fetch("/api/status").then((r) => r.json());
    promessa.then(setS).catch(() => setS(null));
  }, []);
  return s;
}
