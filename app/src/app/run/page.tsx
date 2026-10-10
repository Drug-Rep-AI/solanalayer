"use client";
import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  commitPredictionRunIx,
  commitPredictions,
  computeRunHashes,
  fieldToHex,
  pda,
  rootFromField,
  sendIxs,
  toHex,
  type PredictionCommitment,
  type RunExport,
  type RunHashes,
} from "@drugrep/sdk";
import demoRun from "@drugrep/engine-bridge/fixtures/demo-run.json";
import { usePrograms, errorMessage } from "@/lib/programs";
import { useLocalRuns } from "@/lib/store";
import { Hash } from "@/components/Hash";
import { DemoTag } from "@/components/DemoTag";
import { TxResult } from "@/components/TxResult";
import { WalletGate } from "@/components/WalletGate";

interface Prepared {
  run: RunExport;
  hashes: RunHashes;
  predictions: PredictionCommitment;
}

type Status = "idle" | "loading" | "success" | "error";

export default function RunPage() {
  const programs = usePrograms();
  const { publicKey } = useWallet();
  const [, addRun] = useLocalRuns();
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ signature: string; slot: number; timestamp: number; account: string } | null>(
    null,
  );

  async function loadDemo() {
    const base = demoRun as RunExport;
    const run: RunExport = {
      ...base,
      run_id: `${base.run_id}-${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
    };
    setPrepared({ run, hashes: computeRunHashes(run), predictions: await commitPredictions(run) });
    setResult(null);
    setStatus("idle");
    setError(null);
  }

  async function commit() {
    if (!prepared || !publicKey) return;
    setStatus("loading");
    setError(null);
    try {
      const { hashes, predictions, run } = prepared;
      const ix = commitPredictionRunIx(programs, publicKey, hashes, rootFromField(predictions.root), predictions.topK);
      const sent = await sendIxs(programs, [ix]);
      const runKey = pda.run(hashes.runId);
      const acc = await programs.registry.account.predictionRun.fetch(runKey);
      const res = {
        signature: sent.signature,
        slot: acc.slot.toNumber(),
        timestamp: acc.timestamp.toNumber(),
        account: runKey.toBase58(),
      };
      setResult(res);
      addRun({
        runId: run.run_id,
        runAccount: res.account,
        signature: res.signature,
        slot: res.slot,
        timestamp: res.timestamp,
        topK: predictions.topK,
        predictionsRoot: fieldToHex(predictions.root),
        salts: predictions.salts.map(fieldToHex),
        committer: publicKey.toBase58(),
      });
      setStatus("success");
    } catch (e) {
      setError(errorMessage(e));
      setStatus("error");
    }
  }

  const head = prepared?.run.layer3.predictions[0];

  return (
    <div className="shell">
      <header className="page-head">
        <span className="stage-label">Stage 1 of 4</span>
        <h1>DrugRep run</h1>
        <p>
          Load an engine run, look at what each layer produced, and anchor it on Solana. Each layer is hashed on its own,
          so any result can be traced back to the layer that made it.
        </p>
      </header>

      {!prepared ? (
        <div className="panel stack--sm">
          <div className="row">
            <strong>Demo run</strong>
            <DemoTag />
          </div>
          <p className="small muted">
            20 ranked predictions shaped like real DrugRep output: DrugBank drug IDs, PrimeKG disease IDs, scores from 0 to
            1, protein paths and motif-residue pairs. The scores are illustrative, not model output.
          </p>
          <div>
            <button type="button" className="btn" onClick={loadDemo} data-testid="load-demo-run">
              Load demo run
            </button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <div className="grid-2 grid-2--wide-left">
            {head && (
              <section className="panel stack--sm" aria-label="Top prediction">
                <div className="row">
                  <span className="stage-label">Rank 1 of {prepared.run.layer3.predictions.length}</span>
                  <DemoTag />
                </div>
                <h2>
                  {head.drug_name} for {head.disease_name}
                </h2>
                <p className="small muted mono">
                  {head.drugbank_id} · PrimeKG {head.primekg_id} · score{" "}
                  <span className="num">{head.score.toFixed(2)}</span>
                </p>
                <div className="path" aria-label="Protein path">
                  {head.protein_path.map((s, i) => (
                    <span key={s.uniprot} className="row" style={{ gap: 4 }}>
                      {i > 0 && <span className="path__arrow">→</span>}
                      <span className="path__node" title={`${s.uniprot} · ${s.role}`}>
                        {s.gene}
                      </span>
                    </span>
                  ))}
                </div>
                <p className="small">
                  {head.motif_residue_pairs.map((m) => `${m.motif} ↔ ${m.residue} (${m.interaction})`).join(" · ")}
                </p>
              </section>
            )}
            <section className="panel stack--sm" aria-label="Run identity">
              <h2>Run identity</h2>
              <dl className="kv">
                <dt>run id</dt>
                <dd className="mono small">{prepared.run.run_id}</dd>
                <dt>model</dt>
                <dd className="small">
                  {prepared.run.model.name} {prepared.run.model.version}
                </dd>
                <dt>model version hash</dt>
                <dd>
                  <Hash value={toHex(prepared.hashes.modelVersionHash)} label="model version hash" />
                </dd>
                <dt>input hash</dt>
                <dd>
                  <Hash value={toHex(prepared.hashes.inputHash)} label="input hash" />
                </dd>
                <dt>predictions root</dt>
                <dd>
                  <Hash value={fieldToHex(prepared.predictions.root)} label="predictions root" />
                </dd>
                <dt>top k</dt>
                <dd className="num">{prepared.predictions.topK}</dd>
              </dl>
            </section>
          </div>

          <details className="fold" open>
            <summary>
              <strong>Layer 1 · Drug</strong>
              <span className="muted small">motifs and binding scores for {prepared.run.layer1.drugs.length} drugs</span>
              <Hash value={toHex(prepared.hashes.layer1Hash)} label="layer 1 hash" />
            </summary>
            <div className="fold__body">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Drug</th>
                      <th>Motifs</th>
                      <th>Top binding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prepared.run.layer1.drugs.slice(0, 8).map((d) => (
                      <tr key={d.drugbank_id}>
                        <td>
                          {d.name} <span className="mono muted small">{d.drugbank_id}</span>
                        </td>
                        <td className="small">{d.motifs.map((m) => m.name).join(", ")}</td>
                        <td className="mono small num">
                          {d.binding
                            .slice(0, 2)
                            .map((b) => `${b.gene} ${b.score.toFixed(2)}`)
                            .join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="small muted">Showing 8 of {prepared.run.layer1.drugs.length}. The hash covers all of them.</p>
            </div>
          </details>

          <details className="fold">
            <summary>
              <strong>Layer 2 · Disease</strong>
              <span className="muted small">signatures for {prepared.run.layer2.diseases.length} diseases</span>
              <Hash value={toHex(prepared.hashes.layer2Hash)} label="layer 2 hash" />
            </summary>
            <div className="fold__body">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Disease</th>
                      <th>Signature (ranked proteins)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prepared.run.layer2.diseases.map((d) => (
                      <tr key={d.primekg_id}>
                        <td>
                          {d.name} <span className="mono muted small">{d.primekg_id}</span>
                        </td>
                        <td className="mono small">{d.signature.map((s) => s.gene).join(" > ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>

          <details className="fold" open>
            <summary>
              <strong>Layer 3 · Match</strong>
              <span className="muted small">top {prepared.run.layer3.top_k} predictions with protein paths</span>
              <Hash value={toHex(prepared.hashes.layer3Hash)} label="layer 3 hash" />
            </summary>
            <div className="fold__body">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="num">#</th>
                      <th>Drug → disease</th>
                      <th className="num">Score</th>
                      <th>Protein path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prepared.run.layer3.predictions.map((p) => (
                      <tr key={p.rank}>
                        <td className="num">{p.rank}</td>
                        <td>
                          {p.drug_name} → {p.disease_name}
                        </td>
                        <td className="num">{p.score.toFixed(2)}</td>
                        <td className="mono small">{p.protein_path.map((s) => s.gene).join(" → ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>

          <section className="panel stack--sm" aria-label="Commit">
            <h2>Anchor this run on Solana</h2>
            <p className="small muted">
              One transaction stores the run id, the model version, input and three layer hashes, the predictions root and
              top k. The program stamps it with the slot and the cluster time. The prediction salts stay in this browser so
              the lab can prove against the run later.
            </p>
            <WalletGate>
              <div className="row">
                <button
                  type="button"
                  className="btn"
                  onClick={commit}
                  disabled={!publicKey || status === "loading" || status === "success"}
                  data-state={status === "idle" ? undefined : status}
                  data-testid="commit-run"
                >
                  {status === "loading" && <span className="spinner" aria-hidden />}
                  {status === "success" ? "Committed" : status === "loading" ? "Committing…" : "Commit run to Solana"}
                </button>
                <button type="button" className="btn btn--ghost" onClick={loadDemo}>
                  New run id
                </button>
              </div>
            </WalletGate>
            {error && (
              <div className="notice notice--error" role="alert">
                {error}
              </div>
            )}
            {result && (
              <>
                <TxResult
                  title="Run committed"
                  signature={result.signature}
                  slot={result.slot}
                  timestamp={result.timestamp}
                  account={result.account}
                  accountLabel="PredictionRun account"
                />
                <div className="row">
                  <Link href="/lab/" className="btn">
                    Next: lab console
                  </Link>
                  <Link href="/timeline/" className="btn btn--ghost">
                    View on the timeline
                  </Link>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
