"use client";
import { useState } from "react";

export const shortAddress = (a: string) => (a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);

export function Hash({ value, label, full = false }: { value: string; label?: string; full?: boolean }) {
  const [copied, setCopied] = useState(false);
  const shown = full || value.length <= 20 ? value : `${value.slice(0, 10)}…${value.slice(-8)}`;
  return (
    <span className="hash" title={value}>
      <span className="hash__text">{shown}</span>
      <button
        type="button"
        className="hash__copy"
        aria-label={`Copy ${label ?? "value"}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          } catch {
            /* clipboard blocked */
          }
        }}
      >
        {copied ? "copied" : "copy"}
      </button>
    </span>
  );
}
