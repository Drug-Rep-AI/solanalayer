"use client";
import Link from "next/link";
import { REGISTRY_PROGRAM_ID, VERIFIER_PROGRAM_ID } from "@drugrep/sdk";
import { useChainData } from "@/lib/useChainData";
import { CLUSTER, MOTTO } from "@/lib/config";
import { addrUrl } from "@/components/TxResult";
import { shortAddress } from "@/components/Hash";
import "./overview.css";

const ON_CHAIN = [
  ["Per layer hashes of every engine run (model version, inputs, Layer 1, 2, 3)", "Drug and disease names, scores, protein paths"],
  ["Poseidon root of the ranked predictions, top k, slot and time", "Prediction salts (shared with the lab off chain)"],
  ["Poseidon root of a lab's salted labels and the record count", "The lab's records, outcomes, salts and secret"],
  ["Groth16 proof result: hits, k, hit rate, nullifier", "Which predictions matched, and any patient data"],
  ["Revocation flag set by the lab", "Nothing about the data itself"],
];

export default function Overview() {
  const { data, loading, error } = useChainData(30000);
  const count = (n: number | undefined) => (loading && !data ? "…" : error ? "–" : (n ?? 0).toLocaleString("en-US"));

  return (
    <div className="shell">
      <section className="hero">
        <div className="hero__copy">
          <h1>Called first. Checked in private.</h1>
          <p className="lede">
            DrugRep finds new uses for approved drugs. The Proof Layer writes every prediction to Solana before any
            clinical result exists, then lets a lab confirm the hits with a zero knowledge proof. The lab&apos;s data
            never leaves the lab.
          </p>
          <p className="motto">{MOTTO}</p>
          <div className="hero__actions">
            <Link href="/run/" className="btn">
              Start with a DrugRep run
            </Link>
            <Link href="/timeline/" className="btn btn--ghost">
              See what is on chain
            </Link>
          </div>
        </div>

        <aside className="panel ledger" aria-label="Live counts from the chain">
          <div className="panel__head">
            <strong>On chain now</strong>
            <span className="net-chip">{CLUSTER}</span>
          </div>
          <dl className="ledger__rows">
            <div className="ledger__row">
              <dt>Prediction runs</dt>
              <dd data-testid="count-runs">{count(data?.runs.length)}</dd>
            </div>
            <div className="ledger__row">
              <dt>Lab datasets</dt>
              <dd data-testid="count-datasets">{count(data?.datasets.length)}</dd>
            </div>
            <div className="ledger__row">
              <dt>Validations</dt>
              <dd data-testid="count-validations">{count(data?.validations.length)}</dd>
            </div>
          </dl>
          <p className="small muted">
            Read live from the{" "}
            <a href={addrUrl(REGISTRY_PROGRAM_ID)} target="_blank" rel="noreferrer" className="mono">
              registry {shortAddress(REGISTRY_PROGRAM_ID)}
            </a>{" "}
            and{" "}
            <a href={addrUrl(VERIFIER_PROGRAM_ID)} target="_blank" rel="noreferrer" className="mono">
              verifier {shortAddress(VERIFIER_PROGRAM_ID)}
            </a>{" "}
            programs.
          </p>
          {error && <p className="small">Could not reach the RPC right now. The counts will retry.</p>}
        </aside>
      </section>

      <section className="diagram-section" aria-labelledby="engine-title">
        <h2 id="engine-title">Drug, disease, match. Then proof.</h2>
        <div className="engine">
          <article className="node">
            <span className="node__k">Layer 1 · Drug</span>
            <h3>Fragments to targets</h3>
            <p>Each molecule is split into functional motifs, and each motif is scored against the proteins it binds.</p>
            <span className="node__out">4,498 approved drugs → binding scores</span>
          </article>
          <article className="node">
            <span className="node__k">Layer 2 · Disease</span>
            <h3>Disease as proteins</h3>
            <p>Each disease becomes a molecular signature: a ranked list of the proteins that drive it.</p>
            <span className="node__out">5,574 diseases → signatures</span>
          </article>
          <article className="node">
            <span className="node__k">Layer 3 · Match</span>
            <h3>Score with a reason</h3>
            <p>Drug and disease are matched into a repurposing score, with the protein path that explains it.</p>
            <span className="node__out">9,208 proteins → score + path</span>
          </article>
        </div>

        <div className="proofband">
          <div className="proofband__head">
            <strong>Proof Layer on Solana</strong>
            <span>hashes, proofs and attestations only</span>
          </div>
          <ul className="proofband__items">
            <li>
              <h3>Traceability</h3>
              <p>Inputs, model version and each layer&apos;s output are hashed separately, so any result traces back layer by layer.</p>
              <Link href="/run/">Commit a run</Link>
            </li>
            <li>
              <h3>Timestamp</h3>
              <p>The run lands in a Solana slot before any outcome data is committed. The order is public and permanent.</p>
              <Link href="/timeline/">Read the timeline</Link>
            </li>
            <li>
              <h3>Private trial matching</h3>
              <p>A lab proves how many predictions its data confirms. Only a Groth16 proof leaves the lab, and a program checks it.</p>
              <Link href="/prove/">Prove a match</Link>
            </li>
            <li>
              <h3>Data sovereignty</h3>
              <p>Labels stay with their owner under the owner&apos;s key. Only a root goes on chain, and the owner can revoke it.</p>
              <Link href="/lab/">Open the lab console</Link>
            </li>
          </ul>
        </div>
      </section>

      <section className="split" aria-labelledby="private-title">
        <div className="stack--sm">
          <h2 id="private-title">What is on chain, and what is not</h2>
          <p className="lede">The chain holds commitments. The data behind them stays where it was made.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">On chain</th>
                <th scope="col">Stays private</th>
              </tr>
            </thead>
            <tbody>
              {ON_CHAIN.map(([pub, priv]) => (
                <tr key={pub}>
                  <td>{pub}</td>
                  <td className="muted">{priv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="split" aria-labelledby="walk-title">
        <div className="stack--sm">
          <h2 id="walk-title">Try the whole loop</h2>
          <p className="lede">
            Four steps on devnet with demo data. The headline case is sildenafil for pulmonary arterial hypertension, a
            well known repurposing story.
          </p>
        </div>
        <ol className="walk">
          <li>
            <span className="walk__n">1</span>
            <div>
              <strong>DrugRep run</strong>
              <p>Hash the three layers and commit the run.</p>
            </div>
            <Link href="/run/" className="btn btn--ghost btn--small">
              Open
            </Link>
          </li>
          <li>
            <span className="walk__n">2</span>
            <div>
              <strong>Lab console</strong>
              <p>Build a private dataset in the browser and commit only its root.</p>
            </div>
            <Link href="/lab/" className="btn btn--ghost btn--small">
              Open
            </Link>
          </li>
          <li>
            <span className="walk__n">3</span>
            <div>
              <strong>Prove and verify</strong>
              <p>Generate the proof in the browser and verify it on chain.</p>
            </div>
            <Link href="/prove/" className="btn btn--ghost btn--small">
              Open
            </Link>
          </li>
          <li>
            <span className="walk__n">4</span>
            <div>
              <strong>Timeline</strong>
              <p>Every run, dataset and validation, in order, from the chain.</p>
            </div>
            <Link href="/timeline/" className="btn btn--ghost btn--small">
              Open
            </Link>
          </li>
        </ol>
      </section>
      <p className="small muted">
        All drugs, scores and lab labels in this app are demo data shaped like real engine output. They are not model
        output and not trial or patient data.
      </p>
    </div>
  );
}
