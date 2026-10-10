"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  LABEL_SCHEMA_VERSION,
  commitDataset,
  commitDatasetIx,
  fieldToHex,
  pda,
  randomFieldElement,
  registerLabIx,
  revokeDatasetIx,
  rootFromField,
  sendIxs,
  sha256Bytes,
  syncRevocationIx,
  toHex,
  type LabDataset,
  type LabRecord,
} from "@drugrep/sdk";
import demoLab from "@drugrep/engine-bridge/fixtures/demo-lab-records.json";
import { errorMessage, usePrograms } from "@/lib/programs";
import { useLocalDatasets } from "@/lib/store";
import { useChainData } from "@/lib/useChainData";
import { Hash } from "@/components/Hash";
import { DemoTag } from "@/components/DemoTag";
import { TxResult, addrUrl, formatTime, txUrl } from "@/components/TxResult";
import { WalletGate } from "@/components/WalletGate";

type Status = "idle" | "loading" | "success" | "error";

export default function LabPage() {
  const programs = usePrograms();
  const { publicKey } = useWallet();
  const [, addDataset] = useLocalDatasets();
  const chain = useChainData();

  const [records, setRecords] = useState<LabRecord[]>([]);
  const [salts, setSalts] = useState<bigint[]>([]);
  const [labSecret, setLabSecret] = useState<bigint | null>(null);
  const [ds, setDs] = useState<LabDataset | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ signature: string; slot: number; timestamp: number; account: string } | null>(
    null,
  );
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeMsg, setRevokeMsg] = useState<{ dataset: string; signature: string; synced: number } | null>(null);

  function generate() {
    const recs = (demoLab.records as LabRecord[]).map((r) => ({ ...r }));
    setRecords(recs);
    setSalts(recs.map(() => randomFieldElement()));
    setLabSecret(randomFieldElement());
    setResult(null);
    setStatus("idle");
  }

  // Recompute the root whenever the lab edits its private labels.
  useEffect(() => {
    if (!records.length || labSecret === null) return;
    let live = true;
    commitDataset(records, { salts, labSecret }).then((d) => live && setDs(d));
    return () => {
      live = false;
    };
  }, [records, salts, labSecret]);

  const positives = useMemo(() => records.filter((r) => r.outcome === 1).length, [records]);

  async function commit() {
    if (!ds || !publicKey) return;
    setStatus("loading");
    setError(null);
    try {
      const labKey = pda.lab(publicKey);
      const exists = await programs.provider.connection.getAccountInfo(labKey);
      const root = rootFromField(ds.root);
      const ixs = [];
      if (!exists) ixs.push(registerLabIx(programs, publicKey, sha256Bytes(`drugrep-lab:${publicKey.toBase58()}`)));
      ixs.push(commitDatasetIx(programs, publicKey, root, ds.count));
      const sent = await sendIxs(programs, ixs);
      const dsKey = pda.dataset(labKey, root);
      const acc = await programs.registry.account.dataset.fetch(dsKey);
      const res = { signature: sent.signature, slot: acc.slot.toNumber(), timestamp: acc.timestamp.toNumber(), account: dsKey.toBase58() };
      setResult(res);
      addDataset({
        dataset: res.account,
        lab: labKey.toBase58(),
        root: fieldToHex(ds.root),
        signature: res.signature,
        slot: res.slot,
        timestamp: res.timestamp,
        records: ds.records,
        salts: ds.salts.slice(0, ds.count).map(fieldToHex),
        labSecret: fieldToHex(ds.labSecret),
        owner: publicKey.toBase58(),
      });
      setStatus("success");
      chain.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setStatus("error");
    }
  }

  async function revoke(datasetKey: string) {
    if (!publicKey || !chain.data) return;
    setRevoking(datasetKey);
    setError(null);
    try {
      const target = chain.data.datasets.find((d) => d.publicKey.toBase58() === datasetKey);
      if (!target) throw new Error("dataset not found");
      // Revoke, then copy the flag onto every validation that used this dataset, in one transaction.
      const records = chain.data.validations.filter(
        (v) => v.account.dataset.toBase58() === datasetKey && !v.account.revoked,
      );
      const ixs = [revokeDatasetIx(programs, publicKey, target.publicKey)];
      for (const r of records) ixs.push(syncRevocationIx(programs, r.publicKey, target.publicKey));
      const sent = await sendIxs(programs, ixs);
      setRevokeMsg({ dataset: datasetKey, signature: sent.signature, synced: records.length });
      chain.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRevoking(null);
    }
  }

  function download() {
    if (!ds) return;
    const file = {
      notice: "DEMO DATA. Private lab file: keep it with the lab. It is never sent to chain.",
      records: ds.records,
      salts: ds.salts.slice(0, ds.count).map(fieldToHex),
      lab_secret: fieldToHex(ds.labSecret),
      dataset_root: fieldToHex(ds.root),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `drugrep-lab-dataset-${fieldToHex(ds.root).slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const mine = publicKey
    ? (chain.data?.datasets ?? [])
        .filter((d) => d.account.authority.toBase58() === publicKey.toBase58())
        .sort((a, b) => b.account.slot.toNumber() - a.account.slot.toNumber())
    : [];

  return (
    <div className="shell">
      <header className="page-head">
        <span className="stage-label">Stage 2 of 4</span>
        <h1>Lab console</h1>
        <p>
          You are the data owner. Build a private set of trial or assay outcomes in this browser, then commit only its
          Poseidon root. The labels, salts and your lab secret never leave the tab.
        </p>
      </header>

      {!ds ? (
        <div className="panel stack--sm">
          <div className="row">
            <strong>Simulated lab dataset</strong>
            <DemoTag />
          </div>
          <p className="small muted">
            22 simulated outcomes for drug-disease pairs, some of which DrugRep predicted and some it did not. They are
            demo labels, not trial or patient data. Fresh random salts and a lab secret are generated in your browser.
          </p>
          <div>
            <button type="button" className="btn" onClick={generate} data-testid="generate-dataset">
              Generate private dataset
            </button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <div className="grid-2 grid-2--wide-left">
            <section className="panel stack--sm" aria-label="Private data">
              <div className="panel__head">
                <h2>Stays in this browser</h2>
                <DemoTag />
              </div>
              <p className="small muted">
                {records.length} records, {positives} confirmed. Click an outcome to flip it and watch the root change.
              </p>
              <div className="table-wrap" style={{ maxHeight: 360 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Pair</th>
                      <th>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={`${r.drugbank_id}-${r.primekg_id}`}>
                        <td className="small">
                          {r.label ?? `${r.drugbank_id} / ${r.primekg_id}`}
                          <div className="mono muted" style={{ fontSize: 11 }}>
                            {r.drugbank_id} · {r.primekg_id}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`badge ${r.outcome ? "badge--first" : "badge--neutral"}`}
                            style={{ cursor: status === "success" ? "default" : "pointer" }}
                            disabled={status === "success"}
                            aria-label={`Outcome for ${r.label}: ${r.outcome ? "confirmed" : "not confirmed"}. Click to flip.`}
                            onClick={() =>
                              setRecords((rs) => rs.map((x, j) => (j === i ? { ...x, outcome: x.outcome ? 0 : 1 } : x)))
                            }
                          >
                            {r.outcome ? "confirmed" : "not confirmed"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="kv">
                <dt>salts</dt>
                <dd className="small">{records.length} random field elements, one per record</dd>
                <dt>lab secret</dt>
                <dd className="small">held in this browser, bound into the root, never shown on chain</dd>
              </dl>
              <div className="row">
                <button type="button" className="btn btn--ghost btn--small" onClick={download}>
                  Download private file
                </button>
                <button type="button" className="btn btn--ghost btn--small" onClick={generate} disabled={status === "loading"}>
                  Regenerate salts
                </button>
              </div>
            </section>

            <section className="panel stack--sm" aria-label="Public data">
              <h2>Leaves the browser</h2>
              <p className="small muted">
                This is the whole payload of the commit_dataset instruction. Nothing else about the data is sent.
              </p>
              <dl className="kv">
                <dt>dataset_root</dt>
                <dd>
                  <Hash value={fieldToHex(ds.root)} label="dataset root" />
                </dd>
                <dt>record_count</dt>
                <dd className="num mono">{ds.count}</dd>
                <dt>schema_version</dt>
                <dd className="num mono">{LABEL_SCHEMA_VERSION}</dd>
              </dl>
              <p className="small muted">
                dataset_root = Poseidon(labels_root, Poseidon(lab_secret)). Each label leaf is Poseidon(pair_id, salt,
                outcome), so the root reveals nothing about which pairs or outcomes are inside.
              </p>
              <WalletGate>
                <div>
                  <button
                    type="button"
                    className="btn"
                    onClick={commit}
                    disabled={!publicKey || status === "loading" || status === "success"}
                    data-state={status === "idle" ? undefined : status}
                    data-testid="commit-dataset"
                  >
                    {status === "loading" && <span className="spinner" aria-hidden />}
                    {status === "success" ? "Root committed" : status === "loading" ? "Committing…" : "Commit root to Solana"}
                  </button>
                </div>
              </WalletGate>
              {result && (
                <>
                  <TxResult
                    title="Dataset root committed"
                    signature={result.signature}
                    slot={result.slot}
                    timestamp={result.timestamp}
                    account={result.account}
                    accountLabel="Dataset account"
                  />
                  <div className="row">
                    <Link href="/prove/" className="btn">
                      Next: prove and verify
                    </Link>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      )}

      {error && (
        <div className="notice notice--error" role="alert" style={{ marginTop: "var(--space-md)" }}>
          {error}
        </div>
      )}

      {publicKey && mine.length > 0 && (
        <section className="stack--sm" style={{ marginTop: "var(--space-xl)" }} aria-label="Your datasets">
          <h2 style={{ fontSize: "var(--text-xl)" }}>Your datasets on chain</h2>
          <p className="small muted">
            Revoking marks the dataset as withdrawn. New proofs against it are refused, and every validation that used it
            reads as revoked.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Root</th>
                  <th className="num">Records</th>
                  <th>Committed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((d) => {
                  const key = d.publicKey.toBase58();
                  return (
                    <tr key={key}>
                      <td>
                        <a href={addrUrl(key)} target="_blank" rel="noreferrer" className="mono small">
                          {key.slice(0, 6)}…{key.slice(-4)}
                        </a>
                      </td>
                      <td>
                        <Hash value={toHex(Uint8Array.from(d.account.datasetRoot))} label="dataset root" />
                      </td>
                      <td className="num">{d.account.recordCount}</td>
                      <td className="small mono num">
                        slot {d.account.slot.toNumber().toLocaleString("en-US")}
                        <div className="muted">{formatTime(d.account.timestamp.toNumber())}</div>
                      </td>
                      <td>
                        {d.account.revoked ? (
                          <span className="badge badge--revoked">revoked</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--danger btn--small"
                            onClick={() => revoke(key)}
                            disabled={revoking !== null}
                            data-state={revoking === key ? "loading" : undefined}
                            data-testid="revoke-dataset"
                          >
                            {revoking === key && <span className="spinner" aria-hidden />}
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {revokeMsg && (
            <div className="notice notice--info" role="status">
              <span>
                Dataset revoked{revokeMsg.synced ? ` and ${revokeMsg.synced} validation record(s) marked revoked` : ""}.{" "}
                <a href={txUrl(revokeMsg.signature)} target="_blank" rel="noreferrer">
                  View transaction
                </a>
              </span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
