"use client";
import { useMemo, useState } from "react";
import { toHex } from "@drugrep/sdk";
import { useChainData } from "@/lib/useChainData";
import { Hash, shortAddress } from "@/components/Hash";
import { addrUrl, formatTime } from "@/components/TxResult";

type Kind = "run" | "dataset" | "validation" | "revocation";
const hx = (a: number[]) => toHex(Uint8Array.from(a));

interface Item {
  kind: Kind;
  key: string;
  slot: number;
  time: number;
  title: string;
  render: () => React.ReactNode;
  badges: React.ReactNode;
}

const FILTERS: { id: "all" | Kind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "run", label: "Runs" },
  { id: "dataset", label: "Datasets" },
  { id: "validation", label: "Validations" },
  { id: "revocation", label: "Revocations" },
];

function Addr({ value }: { value: string }) {
  return (
    <a href={addrUrl(value)} target="_blank" rel="noreferrer" className="mono small">
      {value}
    </a>
  );
}

export default function TimelinePage() {
  const { data, loading, error, refresh } = useChainData(20000);
  const [filter, setFilter] = useState<"all" | Kind>("all");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");

  const items = useMemo<Item[]>(() => {
    if (!data) return [];
    const dsByKey = new Map(data.datasets.map((d) => [d.publicKey.toBase58(), d.account]));
    const out: Item[] = [];
    for (const { publicKey: pk, account: r } of data.runs) {
      out.push({
        kind: "run",
        key: pk.toBase58(),
        slot: r.slot.toNumber(),
        time: r.timestamp.toNumber(),
        title: "Prediction run committed",
        badges: <span className="badge badge--neutral">top {r.topK}</span>,
        render: () => (
          <dl className="kv">
            <dt>run account</dt>
            <dd>
              <Addr value={pk.toBase58()} />
            </dd>
            <dt>committer</dt>
            <dd>
              <Addr value={r.authority.toBase58()} />
            </dd>
            <dt>run id hash</dt>
            <dd>
              <Hash value={hx(r.runId)} label="run id hash" />
            </dd>
            <dt>model version hash</dt>
            <dd>
              <Hash value={hx(r.modelVersionHash)} label="model version hash" />
            </dd>
            <dt>input hash</dt>
            <dd>
              <Hash value={hx(r.inputHash)} label="input hash" />
            </dd>
            <dt>layer 1 · drug</dt>
            <dd>
              <Hash value={hx(r.layer1Hash)} label="layer 1 hash" />
            </dd>
            <dt>layer 2 · disease</dt>
            <dd>
              <Hash value={hx(r.layer2Hash)} label="layer 2 hash" />
            </dd>
            <dt>layer 3 · match</dt>
            <dd>
              <Hash value={hx(r.layer3Hash)} label="layer 3 hash" />
            </dd>
            <dt>predictions root</dt>
            <dd>
              <Hash value={hx(r.predictionsRoot)} label="predictions root" />
            </dd>
          </dl>
        ),
      });
    }
    for (const { publicKey: pk, account: d } of data.datasets) {
      out.push({
        kind: "dataset",
        key: pk.toBase58(),
        slot: d.slot.toNumber(),
        time: d.timestamp.toNumber(),
        title: "Lab dataset root committed",
        badges: (
          <>
            <span className="badge badge--neutral">{d.recordCount} records</span>
            {d.revoked && <span className="badge badge--revoked">revoked</span>}
          </>
        ),
        render: () => (
          <dl className="kv">
            <dt>dataset account</dt>
            <dd>
              <Addr value={pk.toBase58()} />
            </dd>
            <dt>lab</dt>
            <dd>
              <Addr value={d.lab.toBase58()} />
            </dd>
            <dt>dataset root</dt>
            <dd>
              <Hash value={hx(d.datasetRoot)} label="dataset root" />
            </dd>
            <dt>schema version</dt>
            <dd className="num">{d.schemaVersion}</dd>
          </dl>
        ),
      });
      if (d.revoked) {
        out.push({
          kind: "revocation",
          key: `${pk.toBase58()}-revoked`,
          slot: d.revokedSlot.toNumber(),
          time: d.revokedAt.toNumber(),
          title: "Lab revoked a dataset",
          badges: <span className="badge badge--revoked">revoked</span>,
          render: () => (
            <dl className="kv">
              <dt>dataset account</dt>
              <dd>
                <Addr value={pk.toBase58()} />
              </dd>
              <dt>effect</dt>
              <dd className="small">New proofs against this dataset are refused. Validations that used it read as revoked.</dd>
            </dl>
          ),
        });
      }
    }
    for (const { publicKey: pk, account: v } of data.validations) {
      const dsRevoked = dsByKey.get(v.dataset.toBase58())?.revoked ?? false;
      const revoked = v.revoked || dsRevoked;
      out.push({
        kind: "validation",
        key: pk.toBase58(),
        slot: v.verifiedSlot.toNumber(),
        time: v.verifiedAt.toNumber(),
        title: `Match verified: ${v.hits} of ${v.k} confirmed`,
        badges: (
          <>
            {v.predictedFirst ? (
              <span className="badge badge--first">✓ Predicted before outcome</span>
            ) : (
              <span className="badge badge--neutral">Run after data</span>
            )}
            {revoked && <span className="badge badge--revoked">revoked</span>}
          </>
        ),
        render: () => (
          <dl className="kv">
            <dt>validation record</dt>
            <dd>
              <Addr value={pk.toBase58()} />
            </dd>
            <dt>hit rate</dt>
            <dd className="num">{(v.hitRateBps / 100).toFixed(2)}%</dd>
            <dt>run</dt>
            <dd>
              <Addr value={v.run.toBase58()} />
            </dd>
            <dt>dataset</dt>
            <dd>
              <Addr value={v.dataset.toBase58()} />
            </dd>
            <dt>order</dt>
            <dd className="mono small num">
              run slot {v.runSlot.toNumber().toLocaleString("en-US")} · dataset slot{" "}
              {v.datasetSlot.toNumber().toLocaleString("en-US")}
            </dd>
            <dt>nullifier</dt>
            <dd>
              <Hash value={hx(v.nullifier)} label="nullifier" />
            </dd>
            <dt>status</dt>
            <dd className="small">
              {revoked
                ? v.revoked
                  ? "Revoked by the lab (synced on the record)."
                  : "The lab revoked the dataset. The record is not synced yet but reads as revoked."
                : "Active"}
            </dd>
          </dl>
        ),
      });
    }
    out.sort((a, b) => (order === "newest" ? b.slot - a.slot : a.slot - b.slot));
    return out;
  }, [data, order]);

  const shown = filter === "all" ? items : items.filter((i) => i.kind === filter);

  return (
    <div className="shell">
      <header className="page-head">
        <span className="stage-label">Stage 4 of 4</span>
        <h1>Explorer and timeline</h1>
        <p>
          Every run, dataset, validation and revocation, read from the chain and ordered by slot. Open an entry to see its
          hashes. Anyone can rebuild this view from the two program accounts.
        </p>
      </header>

      <div className="row" style={{ marginBottom: "var(--space-md)" }}>
        <div className="row" role="group" aria-label="Filter">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`btn btn--small ${filter === f.id ? "" : "btn--ghost"}`}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginLeft: "auto" }}>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => setOrder((o) => (o === "newest" ? "oldest" : "newest"))}
          >
            {order === "newest" ? "Newest first" : "Oldest first"}
          </button>
          <button type="button" className="btn btn--ghost btn--small" onClick={refresh} data-state={loading ? "loading" : undefined}>
            {loading && <span className="spinner" aria-hidden />}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="notice notice--error" role="alert">
          Could not read the chain: {error}
        </div>
      )}
      {!data && loading && <p className="muted">Reading program accounts…</p>}
      {data && shown.length === 0 && <p className="muted">Nothing here yet. Start with a DrugRep run.</p>}

      <ol className="stack--sm" style={{ listStyle: "none", padding: 0, margin: 0 }} data-testid="timeline">
        {shown.map((it) => {
          return (
            <li key={it.key}>
              <details className="fold">
                <summary>
                  <span className="mono small muted num" style={{ minWidth: "9.5rem" }}>
                    slot {it.slot.toLocaleString("en-US")}
                  </span>
                  <strong>{it.title}</strong>
                  {it.badges}
                  <span className="small muted mono">{formatTime(it.time)}</span>
                </summary>
                <div className="fold__body">{it.render()}</div>
              </details>
            </li>
          );
        })}
      </ol>
      {data && (
        <p className="small muted" style={{ marginTop: "var(--space-md)" }}>
          {data.runs.length} runs · {data.datasets.length} datasets · {data.validations.length} validations · labs{" "}
          {data.labs.map((l) => shortAddress(l.publicKey.toBase58())).join(", ") || "none"}
        </p>
      )}
    </div>
  );
}
