"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchAll } from "@drugrep/sdk";
import { usePrograms } from "./programs";

type All = Awaited<ReturnType<typeof fetchAll>>;

export function useChainData(pollMs = 0) {
  const programs = usePrograms();
  const [data, setData] = useState<All | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchAll(programs));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [programs]);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    if (!pollMs) return () => clearTimeout(first);
    const id = setInterval(refresh, pollMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [refresh, pollMs]);

  return { data, error, loading, refresh };
}
