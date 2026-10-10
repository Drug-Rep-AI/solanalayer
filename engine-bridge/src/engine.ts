import { readFile } from "node:fs/promises";
import type { RunExport } from "@drugrep/sdk";

/**
 * Where a run export comes from. The POC ships a fixture source; the real
 * DrugRep engine plugs in by implementing `loadRun` against its API.
 */
export interface EngineSource {
  readonly name: string;
  loadRun(): Promise<RunExport>;
}

export function validateRunExport(run: RunExport): RunExport {
  if (!run.run_id) throw new Error("run export is missing run_id");
  if (!run.model?.version) throw new Error("run export is missing model.version");
  for (const layer of ["layer1", "layer2", "layer3"] as const) {
    if (!run[layer]) throw new Error(`run export is missing ${layer}`);
  }
  if (!Array.isArray(run.layer3.predictions) || run.layer3.predictions.length === 0) {
    throw new Error("layer3.predictions must be a non empty array");
  }
  return run;
}

/** Reads a run export JSON file (the demo fixture, or an export saved by the engine). */
export class FixtureEngineSource implements EngineSource {
  readonly name: string;
  constructor(private readonly path: string) {
    this.name = `fixture:${path}`;
  }
  async loadRun(): Promise<RunExport> {
    return validateRunExport(JSON.parse(await readFile(this.path, "utf8")));
  }
}

/**
 * Fetches a run export from the DrugRep engine API.
 * Expected endpoint: GET {baseUrl}/runs/{runId}/export -> RunExport JSON.
 * The engine is not part of this repo; this is the seam where it connects.
 */
export class HttpEngineSource implements EngineSource {
  readonly name: string;
  constructor(
    private readonly baseUrl: string,
    private readonly runId: string,
    private readonly apiKey = process.env.DRUGREP_ENGINE_API_KEY,
  ) {
    this.name = `engine:${baseUrl}`;
  }
  async loadRun(): Promise<RunExport> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/runs/${encodeURIComponent(this.runId)}/export`, {
      headers: this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {},
    });
    if (!res.ok) throw new Error(`engine API returned ${res.status}`);
    return validateRunExport((await res.json()) as RunExport);
  }
}
