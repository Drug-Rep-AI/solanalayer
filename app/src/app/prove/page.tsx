"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  VERIFY_COMPUTE_UNITS,
  buildTrialMatchInput,
  bytesToBigint,
  commitDataset,
  commitPredictions,
  encodeProof,
  encodePublicSignals,
  fieldToHex,
  fromHex,
  pda,
  sendIxs,
  toHex,
  toPublicInputs,
  verifyMatchIx,
  type RunExport,
  type SnarkjsProof,
  type TrialMatchPublic,
} from "@drugrep/sdk";
import demoRun from "@drugrep/engine-bridge/fixtures/demo-run.json";
import { errorMessage, usePrograms } from "@/lib/programs";
import { proveInBrowser } from "@/lib/prover";
import { useLocalDatasets, useLocalRuns, useLocalValidations, type LocalDataset, type LocalRun } from "@/lib/store";
import { Hash } from "@/components/Hash";
import { DemoTag } from "@/components/DemoTag";
import { TxResult, addrUrl, formatTime } from "@/components/TxResult";
import { WalletGate } from "@/components/WalletGate";

type Status = "idle" | "loading" | "success" | "error";
const hexToBig = (h: string) => bytesToBigint(fromHex(h));

interface ProofState {
  pub: TrialMatchPublic;
  ms: number;
  locallyValid: boolean;
  proof: ReturnType<typeof encodeProof>;
  signals: number[][];
}

interface Record {
  key: string;
  signature: string;
  hits: number;
  k: number;
  bps: number;
  predictedFirst: boolean;
  nullifier: string;
  runSlot: number;
  datasetSlot: number;
  verifiedSlot: number;
  verifiedAt: number;
}

export default function ProvePage() {
  const programs = usePrograms();
  const { publicKey } = useWallet();
  const [runs] = useLocalRuns();
  const [datasets] = useLocalDatasets();
  const [, addValidation] = useLocalValidations();
  const [runChoice, setRunId] = useState<string>("");
  const [dsChoice, setDsId] = useState<string>("");
  const [proving, setProving] = useState<Status>("idle");
  const [verifying, setVerifying] = useState<Status>("idle");
  const [proof, setProof] = useState<ProofState | null>(null);
  const [record, setRecord] = useState<Record | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replay, setReplay] = useState<Status>("idle");
  const [replayMsg, setReplayMsg] = useState<string | null>(null);

  // Default to the most recent run and dataset until the user picks one.
  const runId = runChoice || runs[0]?.runAccount || "";
  const dsId = dsChoice || datasets[0]?.dataset || "";

  const run = useMemo(() => runs.find((r) => r.runAccount === runId), [runs, runId]);
  const ds = useMemo(() => datasets.find((d) => d.dataset === dsId), [datasets, dsId]);

  function reset() {
    setProof(null);
    setRecord(null);
    setReplay("idle");
    setReplayMsg(null);
    setProving("idle");
    setVerifying("idle");
    setError(null);
  }

  async function prove(r: LocalRun, d: LocalDataset) {
    setProving("loading");
    setError(null);
    setRecord(null);
    setVerifying("idle");
    try {
      const runExport = { ...(demoRun as RunExport), run_id: r.runId };
      const pred = await commitPredictions(runExport, r.salts.map(hexToBig));
      if (fieldToHex(pred.root) !== r.predictionsRoot) throw new Error("saved salts do not reproduce this run's root");
      const lab = await commitDataset(d.records, { salts: d.salts.map(hexToBig), labSecret: hexToBig(d.labSecret) });
      if (fieldToHex(lab.root) !== d.root) throw new Error("saved lab data does not reproduce the dataset root");
      const { input, public: pub } = await buildTrialMatchInput(pred, lab, r.topK);
      const out = await proveInBrowser(input);
      setProof({
        pub,
        ms: out.ms,
        locallyValid: out.locallyValid,
        proof: encodeProof(out.proof as SnarkjsProof),
        signals: encodePublicSignals(out.publicSignals),
      });
      setProving("success");
    } catch (e) {
      setError(errorMessage(e));
      setProving("error");
    }
  }

  async function verify() {
    if (!proof || !run || !ds || !publicKey) return;
    setVerifying("loading");
    setError(null);
    try {
      const inputs = toPublicInputs(proof.signals);
      const ix = verifyMatchIx(programs, publicKey, new PublicKey(run.runAccount), new PublicKey(ds.dataset), proof.proof, inputs);
      const sent = await sendIxs(programs, [ix], { computeUnits: VERIFY_COMPUTE_UNITS });
      const key = pda.validation(Uint8Array.from(inputs.nullifier));
      const acc = await programs.verifier.account.validationRecord.fetch(key);
      const rec: Record = {
        key: key.toBase58(),
        signature: sent.signature,
        hits: acc.hits,
        k: acc.k,
        bps: acc.hitRateBps,
        predictedFirst: acc.predictedFirst,
        nullifier: toHex(Uint8Array.from(acc.nullifier)),
        runSlot: acc.runSlot.toNumber(),
        datasetSlot: acc.datasetSlot.toNumber(),
        verifiedSlot: acc.verifiedSlot.toNumber(),
        verifiedAt: acc.verifiedAt.toNumber(),
      };
      setRecord(rec);
      addValidation({ validation: rec.key, signature: rec.signature, run: run.runAccount, dataset: ds.dataset });
      setVerifying("success");
    } catch (e) {
      setError(errorMessage(e));
      setVerifying("error");
    }
  }

  // Sends the exact same proof again. The nullifier PDA already exists, so the program must refuse it.
  async function tryReplay() {
    if (!proof || !run || !ds || !publicKey) return;
    setReplay("loading");
    setReplayMsg(null);
    try {
      const inputs = toPublicInputs(proof.signals);
      const ix = verifyMatchIx(programs, publicKey, new PublicKey(run.runAccount), new PublicKey(ds.dataset), proof.proof, inputs);
      await sendIxs(programs, [ix], { computeUnits: VERIFY_COMPUTE_UNITS });
      setReplayMsg("The replay was accepted. This should not happen.");
      setReplay("error");
    } catch (e) {
      const msg = errorMessage(e);
      setReplayMsg(
        msg.includes("already used")
          ? "Replay refused by the program: the nullifier account for this proof already exists."
          : `Replay refused: ${msg}`,
      );
      setReplay("success");
    }
  }

  const orderOk = run && ds ? run.slot < ds.slot : null;

  return (
    <div className="shell">
      <header className="page-head">
        <span className="stage-label">Stage 3 of 4</span>
        <h1>Prove and verify</h1>
        <p>
          The lab proves, in this browser, how many of the run&apos;s top predictions its private data confirms. Only the
          Groth16 proof and five public numbers are sent. The verifier program checks the proof with Solana&apos;s alt_bn128
          syscalls and writes a ValidationRecord.
        </p>
      </header>

      {runs.length === 0 || datasets.length === 0 ? (
        <div className="panel stack--sm">
          <strong>Two things are needed first</strong>
          <p className="small muted">
            Proving uses the prediction salts and the lab&apos;s private labels, which only exist in the browser that created
            them. Commit a run and a dataset here, then come back.
          </p>
          <div className="row">
            <Link href="/run/" className={`btn ${runs.length ? "btn--ghost" : ""}`}>
              {runs.length ? "Run committed" : "1. Commit a run"}
            </Link>
            <Link href="/lab/" className={`btn ${datasets.length ? "btn--ghost" : ""}`}>
              {datasets.length ? "Dataset committed" : "2. Commit a dataset"}
            </Link>
          </div>
        </div>
      ) : (
        <div className="stack">
          <div className="grid-2">
            <section className="panel stack--sm" aria-label="Choose run">
              <label htmlFor="run-select">
                <strong>Prediction run</strong>
              </label>
              <select
                id="run-select"
                className="hash"
                style={{ padding: 8, width: "100%" }}
                value={runId}
                onChange={(e) => {
                  setRunId(e.target.value);
                  reset();
                }}
              >
                {runs.map((r) => (
                  <option key={r.runAccount} value={r.runAccount}>
                    {r.runId} · slot {r.slot}
                  </option>
                ))}
              </select>
              {run && (
                <dl className="kv">
                  <dt>predictions root</dt>
                  <dd>
                    <Hash value={run.predictionsRoot} label="predictions root" />
                  </dd>
                  <dt>committed</dt>
                  <dd className="mono small num">
                    slot {run.slot.toLocaleString("en-US")} · {formatTime(run.timestamp)}
                  </dd>
                  <dt>top k</dt>
                  <dd className="num">{run.topK}</dd>
                </dl>
              )}
            </section>
            <section className="panel stack--sm" aria-label="Choose dataset">
              <label htmlFor="ds-select">
                <strong>Lab dataset</strong>
              </label>
              <select
                id="ds-select"
                className="hash"
                style={{ padding: 8, width: "100%" }}
                value={dsId}
                onChange={(e) => {
                  setDsId(e.target.value);
                  reset();
                }}
              >
                {datasets.map((d) => (
                  <option key={d.dataset} value={d.dataset}>
                    {d.root.slice(0, 10)}… · {d.records.length} records · slot {d.slot}
                  </option>
                ))}
              </select>
              {ds && (
                <dl className="kv">
                  <dt>dataset root</dt>
                  <dd>
                    <Hash value={ds.root} label="dataset root" />
                  </dd>
                  <dt>committed</dt>
                  <dd className="mono small num">
                    slot {ds.slot.toLocaleString("en-US")} · {formatTime(ds.timestamp)}
                  </dd>
                  <dt>records</dt>
                  <dd className="num">{ds.records.length}</dd>
                </dl>
              )}
            </section>
          </div>

          {orderOk !== null && (
            <div className={`notice ${orderOk ? "notice--info" : ""}`}>
              {orderOk
                ? "The run was committed in an earlier slot than the dataset, so a valid proof will carry the “predicted before outcome” badge."
                : "This run was committed after the dataset. The proof can still verify, but it will not carry the “predicted before outcome” badge."}
            </div>
          )}

          <section className="panel stack--sm" aria-label="Generate proof">
            <div className="panel__head">
              <h2>1 · Generate the proof in this browser</h2>
              <DemoTag />
            </div>
            <p className="small muted">
              Groth16 on BN254, about 36,500 constraints. The private witness is the 32 prediction slots with their salts,
              the 32 label slots with salts and outcomes, and the lab secret. It never leaves this tab.
            </p>
            <div className="row">
              <button
                type="button"
                className="btn"
                disabled={!run || !ds || proving === "loading"}
                data-state={proving === "idle" ? undefined : proving}
                onClick={() => run && ds && prove(run, ds)}
                data-testid="generate-proof"
              >
                {proving === "loading" && <span className="spinner" aria-hidden />}
                {proving === "loading" ? "Proving…" : proving === "success" ? "Proof ready" : "Generate proof"}
              </button>
            </div>
            {proving === "loading" && (
              <div className="progress" aria-hidden>
                <div className="progress__bar" />
              </div>
            )}
            {proof && (
              <dl className="kv" data-testid="proof-result">
                <dt>proving time</dt>
                <dd className="num mono">{(proof.ms / 1000).toFixed(1)} s in the browser</dd>
                <dt>local check</dt>
                <dd>{proof.locallyValid ? "valid against the verifying key" : "failed"}</dd>
                <dt>hits</dt>
                <dd className="num">
                  {proof.pub.hits} of the top {proof.pub.k}
                </dd>
                <dt>nullifier</dt>
                <dd>
                  <Hash value={fieldToHex(proof.pub.nullifier)} label="nullifier" />
                </dd>
                <dt>proof size</dt>
                <dd className="small">256 bytes (A, B, C) plus 5 public inputs of 32 bytes</dd>
              </dl>
            )}
          </section>

          <section className="panel stack--sm" aria-label="Verify on chain">
            <h2>2 · Verify on chain</h2>
            <p className="small muted">
              drugrep_verifier checks the roots against the registered run and dataset, refuses revoked data, requires k to
              equal the run&apos;s top k, verifies the proof, and creates a nullifier account so the proof cannot be reused.
            </p>
            <WalletGate>
              <div>
                <button
                  type="button"
                  className="btn"
                  disabled={!proof || !publicKey || verifying === "loading" || verifying === "success"}
                  data-state={verifying === "idle" ? undefined : verifying}
                  onClick={verify}
                  data-testid="verify-proof"
                >
                  {verifying === "loading" && <span className="spinner" aria-hidden />}
                  {verifying === "success" ? "Verified" : verifying === "loading" ? "Verifying…" : "Submit proof to Solana"}
                </button>
              </div>
            </WalletGate>
            {record && (
              <div className="stack--sm" data-testid="validation-result">
                <div className="row">
                  <span className="num" style={{ fontSize: "var(--text-2xl)", fontWeight: 650 }}>
                    {record.hits} / {record.k}
                  </span>
                  <span className="muted">confirmed, hit rate {(record.bps / 100).toFixed(1)}%</span>
                  {record.predictedFirst ? (
                    <span className="badge badge--first" data-testid="badge-first">
                      ✓ Predicted before outcome
                    </span>
                  ) : (
                    <span className="badge badge--neutral">Run committed after the data</span>
                  )}
                </div>
                <p className="small muted mono num">
                  run slot {record.runSlot.toLocaleString("en-US")} {record.predictedFirst ? "<" : "≥"} dataset slot{" "}
                  {record.datasetSlot.toLocaleString("en-US")}
                </p>
                <TxResult
                  title="Proof verified on chain"
                  signature={record.signature}
                  slot={record.verifiedSlot}
                  timestamp={record.verifiedAt}
                  account={record.key}
                  accountLabel="ValidationRecord"
                />
                <dl className="kv">
                  <dt>nullifier</dt>
                  <dd>
                    <Hash value={record.nullifier} label="nullifier" />
                  </dd>
                  <dt>nullifier account</dt>
                  <dd>
                    <a
                      className="mono small"
                      target="_blank"
                      rel="noreferrer"
                      href={addrUrl(pda.nullifier(fromHex(record.nullifier)).toBase58())}
                    >
                      {pda.nullifier(fromHex(record.nullifier)).toBase58()}
                    </a>
                  </dd>
                </dl>
                <div className="row">
                  <Link href="/timeline/" className="btn">
                    Next: timeline
                  </Link>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={tryReplay}
                    disabled={replay === "loading"}
                    data-testid="replay-proof"
                  >
                    {replay === "loading" && <span className="spinner" aria-hidden />}
                    Try to replay this proof
                  </button>
                </div>
                {replayMsg && (
                  <div className={`notice ${replay === "success" ? "notice--info" : "notice--error"}`} role="status" data-testid="replay-result">
                    {replayMsg}
                  </div>
                )}
              </div>
            )}
          </section>
          {error && (
            <div className="notice notice--error" role="alert" data-testid="prove-error">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
