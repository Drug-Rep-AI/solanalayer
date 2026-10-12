/**
 * Records the happy path of the deployed app at 1920x1080 with Playwright.
 *
 *   DEMO_WALLET_KEYPAIR=~/.config/solana/drugrep/demo-wallet.json pnpm --filter @drugrep/demo record
 *   BASE_URL=http://localhost:3000 ...   # record against a local build instead
 *
 * The demo wallet is the app's "Demo wallet (devnet burner)" adapter, preloaded
 * with a funded devnet keypair through localStorage. Writes demo/raw/session.webm
 * and demo/raw/marks.json (chapter start and end times in seconds).
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium, type Page } from "playwright";

const BASE = (process.env.BASE_URL ?? "https://drugrep-proof-layer.vercel.app").replace(/\/$/, "");
const keyPath = (process.env.DEMO_WALLET_KEYPAIR ?? "~/.config/solana/drugrep/demo-wallet.json").replace(/^~/, homedir());
const secret = readFileSync(keyPath, "utf8").trim();
const RAW = join(import.meta.dirname, "raw");
mkdirSync(RAW, { recursive: true });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function caption(page: Page, title: string, body: string) {
  await page.evaluate(
    ([t, b]) => {
      let el = document.getElementById("demo-caption");
      if (!el) {
        el = document.createElement("div");
        el.id = "demo-caption";
        el.style.cssText = [
          "position:fixed", "left:48px", "bottom:44px", "z-index:9999", "max-width:760px",
          "padding:18px 22px", "border-radius:12px", "background:#1C4334", "color:#F7F9F4",
          "font-family:var(--font-inter),Inter,system-ui,sans-serif", "box-shadow:0 18px 50px -24px rgba(16,36,27,.6)",
          "transition:opacity .25s ease",
        ].join(";");
        document.body.appendChild(el);
      }
      el.innerHTML =
        `<div style="font-size:26px;font-weight:650;letter-spacing:-0.02em;line-height:1.2">${t}</div>` +
        `<div style="margin-top:6px;font-size:19px;line-height:1.45;color:#C8E0D5">${b}</div>`;
    },
    [title, body],
  );
}

async function smoothScroll(page: Page, selector: string, offset = -100, wait = 1400) {
  await page.evaluate(
    ([sel, off]) => {
      const el = document.querySelector(sel as string);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + (off as number), behavior: "smooth" });
    },
    [selector, offset],
  );
  await sleep(wait);
}

async function waitFor(page: Page, selector: string, timeout = 150_000) {
  await page.waitForSelector(selector, { timeout });
}

const marks: Record<string, [number, number]> = {};
let t0 = 0;
const now = () => (Date.now() - t0) / 1000;
const begin = (name: string) => (marks[name] = [now(), 0]);
const end = (name: string) => (marks[name][1] = now());

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } },
});
await context.addInitScript(
  ([s]) => {
    window.localStorage.setItem("drugrep.demoWallet.v1", s);
    window.localStorage.setItem("walletName", JSON.stringify("Demo wallet (devnet burner)"));
    // Larger type for a 1080p video: the app's content column is 1160 px wide.
    document.addEventListener("DOMContentLoaded", () => {
      document.documentElement.style.zoom = "1.2";
    });
  },
  [secret],
);
const page = await context.newPage();
t0 = Date.now();

try {
  // 2. The three layers (overview)
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => /\d/.test(document.querySelector("[data-testid=count-runs]")?.textContent ?? ""), null, { timeout: 90_000 });
  begin("overview");
  await caption(page, "DrugRep finds new uses for approved drugs", "The Proof Layer anchors each prediction on Solana before outcomes exist.");
  await sleep(4500);
  await smoothScroll(page, "#engine-title", -60, 1800);
  await caption(page, "Three layers: drug, disease, match", "Every score comes with the protein path that explains it.");
  await sleep(5000);
  await smoothScroll(page, ".proofband", -200, 1600);
  await caption(page, "What the Proof Layer adds", "Traceability, a timestamp, private trial matching and data sovereignty.");
  await sleep(5000);
  await smoothScroll(page, "#private-title", -80, 1600);
  await caption(page, "Only commitments go on chain", "Names, scores, labels and patient data stay with their owners.");
  await sleep(4500);
  end("overview");

  // 3. Commit a run
  await page.goto(`${BASE}/run/`, { waitUntil: "networkidle" });
  begin("run");
  await page.click("[data-testid=load-demo-run]");
  await caption(page, "A DrugRep run (demo data)", "Sildenafil for pulmonary arterial hypertension: PDE5A to PRKG1.");
  await sleep(4500);
  await smoothScroll(page, "details.fold", -90, 1600);
  await caption(page, "Each layer has its own hash", "Layer 1 drug, Layer 2 disease, Layer 3 match, plus model and inputs.");
  await sleep(4500);
  await smoothScroll(page, "[data-testid=commit-run]", -420, 1200);
  await caption(page, "Anchor the run on Solana", "One transaction, stamped with the slot and the cluster time.");
  await page.click("[data-testid=commit-run]");
  await waitFor(page, "[data-testid=tx-result]");
  await smoothScroll(page, "[data-testid=tx-result]", -260, 1200);
  await caption(page, "Committed on devnet", "This slot is the proof that the prediction came first.");
  await sleep(4500);
  end("run");

  // 4. The lab commits only a root
  await page.goto(`${BASE}/lab/`, { waitUntil: "networkidle" });
  begin("lab");
  await page.click("[data-testid=generate-dataset]");
  await caption(page, "The lab's private dataset", "22 simulated outcomes, salted and kept in this browser.");
  await sleep(4500);
  const flip = page.locator("tbody button.badge").nth(8);
  await flip.click();
  await caption(page, "Change one label, the root changes", "The root commits to every record without revealing any of them.");
  await sleep(2600);
  await flip.click();
  await sleep(1800);
  await caption(page, "Only the root leaves the browser", "dataset_root, record count and schema version. Nothing else.");
  await page.click("[data-testid=commit-dataset]");
  await waitFor(page, "[data-testid=tx-result]");
  await smoothScroll(page, "[data-testid=tx-result]", -360, 1200);
  await sleep(3500);
  end("lab");

  // 5. Prove in the browser, verify on chain
  await page.goto(`${BASE}/prove/`, { waitUntil: "networkidle" });
  begin("prove");
  await caption(page, "Prove the match in the browser", "Groth16 with snarkjs. The private witness never leaves the tab.");
  await sleep(2500);
  await smoothScroll(page, "[data-testid=generate-proof]", -380, 1000);
  await page.click("[data-testid=generate-proof]");
  await waitFor(page, "[data-testid=proof-result]");
  await caption(page, "Proof ready", "8 of the top 20 predictions are confirmed positives in the lab's data.");
  await sleep(4000);
  await smoothScroll(page, "[data-testid=verify-proof]", -300, 1000);
  await caption(page, "Verified by a Solana program", "drugrep_verifier checks the proof with the alt_bn128 syscalls.");
  await page.click("[data-testid=verify-proof]");
  await waitFor(page, "[data-testid=validation-result]");
  await smoothScroll(page, "[data-testid=validation-result]", -140, 1200);
  await caption(page, "Predicted before outcome", "The run's slot is earlier than the dataset's slot, so the badge is earned.");
  await sleep(5500);
  await page.click("[data-testid=replay-proof]");
  await waitFor(page, "[data-testid=replay-result]");
  await smoothScroll(page, "[data-testid=replay-result]", -500, 1000);
  await caption(page, "Replays are refused", "The nullifier account already exists, so the same proof cannot count twice.");
  await sleep(4500);
  end("prove");

  // 6. Timeline and revocation
  await page.goto(`${BASE}/timeline/`, { waitUntil: "networkidle" });
  await waitFor(page, "[data-testid=timeline] details");
  begin("timeline");
  await caption(page, "Everything, in order, from the chain", "Runs, datasets, validations and revocations, read by slot.");
  await page.locator("[data-testid=timeline] details").first().evaluate((d) => ((d as HTMLDetailsElement).open = true));
  await sleep(5000);
  await page.goto(`${BASE}/lab/`, { waitUntil: "networkidle" });
  await waitFor(page, "[data-testid=revoke-dataset]");
  await smoothScroll(page, "[data-testid=revoke-dataset]", -380, 1000);
  await caption(page, "The lab can revoke", "Revoking blocks new proofs and marks existing validations as revoked.");
  await page.locator("[data-testid=revoke-dataset]").first().click();
  await page.waitForSelector("text=Dataset revoked", { timeout: 90_000 });
  await sleep(6000); // let the public RPC rate limit window pass before the next read
  await page.goto(`${BASE}/timeline/`, { waitUntil: "networkidle" });
  await waitFor(page, "[data-testid=timeline] details");
  await caption(page, "Revocation is on the record", "The validation now reads as revoked, for anyone who looks.");
  await sleep(5500);
  end("timeline");
} finally {
  await page.close();
  const video = await page.video()?.path();
  await context.close();
  await browser.close();
  if (video) renameSync(video, join(RAW, "session.webm"));
  writeFileSync(join(RAW, "marks.json"), JSON.stringify(marks, null, 2));
  console.log("marks", marks);
}
