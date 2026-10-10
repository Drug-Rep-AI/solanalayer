export * from "./engine.js";
export * from "./bridge.js";
import demoRun from "../fixtures/demo-run.json" with { type: "json" };
import type { RunExport } from "@drugrep/sdk";

/** The bundled DEMO fixture (not real model output). */
export const DEMO_RUN = demoRun as RunExport;

/** A copy of the demo run with a unique run id, so each commit creates a new PDA. */
export function freshDemoRun(suffix = Date.now().toString(36)): RunExport {
  return { ...DEMO_RUN, run_id: `${DEMO_RUN.run_id}-${suffix}`, created_at: new Date().toISOString() };
}
