"use client";
// Private, browser only state. Prediction salts and lab labels live here and
// in files the user downloads. None of it is ever sent to the chain.
import { useCallback, useEffect, useState } from "react";
import type { LabRecord } from "@drugrep/sdk";

export interface LocalRun {
  runId: string;
  runAccount: string;
  signature: string;
  slot: number;
  timestamp: number;
  topK: number;
  predictionsRoot: string;
  salts: string[]; // hex, one per prediction slot
  committer: string;
}

export interface LocalDataset {
  dataset: string;
  lab: string;
  root: string;
  signature: string;
  slot: number;
  timestamp: number;
  records: LabRecord[];
  salts: string[];
  labSecret: string;
  owner: string;
}

export interface LocalValidation {
  validation: string;
  signature: string;
  run: string;
  dataset: string;
}

const KEYS = {
  runs: "drugrep.runs.v1",
  datasets: "drugrep.datasets.v1",
  validations: "drugrep.validations.v1",
} as const;

function read<T>(key: string): T[] {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: state lives for this tab only */
  }
  window.dispatchEvent(new Event("drugrep-store"));
}

function useList<T>(key: string) {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    const sync = () => setItems(read<T>(key));
    sync();
    window.addEventListener("drugrep-store", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("drugrep-store", sync);
      window.removeEventListener("storage", sync);
    };
  }, [key]);
  const add = useCallback((item: T) => write(key, [item, ...read<T>(key)]), [key]);
  return [items, add] as const;
}

export const useLocalRuns = () => useList<LocalRun>(KEYS.runs);
export const useLocalDatasets = () => useList<LocalDataset>(KEYS.datasets);
export const useLocalValidations = () => useList<LocalValidation>(KEYS.validations);
