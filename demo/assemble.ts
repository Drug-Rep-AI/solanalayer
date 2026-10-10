/**
 * Builds demo/drugrep-proof-layer-demo.mp4 from demo/raw/session.webm.
 *
 * Title cards are HTML rendered to PNG with Playwright (brand fonts and colours),
 * then ffmpeg cuts each recorded chapter and concatenates cards and chapters
 * into a 1920x1080, 30 fps H.264 file. Long chapters are sped up slightly so
 * the whole video stays under 3 minutes.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const DIR = import.meta.dirname;
const RAW = join(DIR, "raw");
const FRAMES = join(DIR, "frames");
mkdirSync(FRAMES, { recursive: true });
const marks = JSON.parse(readFileSync(join(RAW, "marks.json"), "utf8")) as Record<string, [number, number]>;
const LIVE_URL = process.env.LIVE_URL ?? "https://drugrep-proof-layer.vercel.app";
const REPO_URL = "github.com/Drug-Rep-AI/solanalayer";
const MAX_SECONDS = 172;

interface Card {
  id: string;
  kicker: string;
  title: string;
  body: string;
  seconds: number;
  closing?: boolean;
}

const CARDS: Card[] = [
  {
    id: "c1",
    kicker: "1 · The problem",
    title: "A repurposing call is only worth something if it came first.",
    body: "Today there is no public, tamper proof record of when a prediction was made, and labs cannot share trial data to check it.",
    seconds: 6,
  },
  {
    id: "c2",
    kicker: "2 · Three layers",
    title: "Drug, disease, match.",
    body: "DrugRep scores approved drugs against diseases and explains each score with a protein path.",
    seconds: 4,
  },
  {
    id: "c3",
    kicker: "3 · Commit and timestamp",
    title: "Every layer hashed, every run timestamped.",
    body: "The engine run is anchored on Solana with a slot and a time before any outcome exists.",
    seconds: 4,
  },
  {
    id: "c4",
    kicker: "4 · Private lab data",
    title: "The data stays with the lab.",
    body: "Only a Poseidon root of the lab's salted labels goes on chain.",
    seconds: 4,
  },
  {
    id: "c5",
    kicker: "5 · Prove and verify",
    title: "Proof in the browser, check on chain.",
    body: "A Groth16 proof says how many predictions the data confirms. A Solana program verifies it.",
    seconds: 4,
  },
  {
    id: "c6",
    kicker: "6 · Timeline and revocation",
    title: "Readable by anyone. Revocable by the owner.",
    body: "Every run, dataset and validation is on the timeline, and a lab can withdraw its data.",
    seconds: 4,
  },
  {
    id: "c7",
    kicker: "DrugRep Proof Layer",
    title: "Every drug deserves a second chance.",
    body: `${LIVE_URL.replace(/^https?:\/\//, "")}<br/>${REPO_URL}`,
    seconds: 6,
    closing: true,
  },
];

const html = (c: Card) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=block" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0}
  body{width:1920px;height:1080px;background:#F7F9F4;color:#10241B;font-family:Inter,sans-serif;display:grid;grid-template-rows:auto 1fr auto;padding:96px 120px}
  .top{display:flex;align-items:baseline;gap:14px}
  .wm{font-weight:700;font-size:34px;letter-spacing:-0.03em}
  .tag{font-family:'JetBrains Mono',monospace;font-size:20px;color:#036C4D}
  .mid{align-self:center;display:grid;gap:34px;max-width:1420px}
  .kicker{font-family:'JetBrains Mono',monospace;font-size:26px;color:#036C4D}
  h1{font-size:${c.closing ? 104 : 88}px;line-height:1.05;letter-spacing:-0.035em;font-weight:700}
  p{font-size:36px;line-height:1.4;color:#1C4334;max-width:1300px}
  .bottom{display:flex;justify-content:space-between;align-items:center;font-size:22px;color:#1C4334;border-top:1px solid #C8E0D5;padding-top:28px}
  .sol{display:flex;align-items:center;gap:14px;font-weight:600}
  .demo{font-family:'JetBrains Mono',monospace;font-size:18px;color:#8a5a12;border:1px dashed #b07a2a;border-radius:6px;padding:4px 10px}
  ${c.closing ? "p{font-family:'JetBrains Mono',monospace;font-size:34px;color:#036C4D}" : ""}
</style></head><body>
<div class="top"><span class="wm">DrugRep</span><span class="tag">proof layer</span></div>
<div class="mid"><div class="kicker">${c.kicker}</div><h1>${c.title}</h1><p>${c.body}</p></div>
<div class="bottom"><span class="demo">Devnet POC · demo data, not real model output or trial data</span>
<span class="sol">Built on <img src="data:image/svg+xml;base64,${readFileSync(join(DIR, "..", "app", "public", "brand", "solana-logomark.svg")).toString("base64")}" height="26"> Solana</span></div>
</body></html>`;

// 1. Render cards
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (const c of CARDS) {
  await page.setContent(html(c), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(FRAMES, `${c.id}.png`) });
}
await browser.close();

const ff = (args: string[]) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30"];

// 2. Plan durations, speeding up chapters if the total would exceed MAX_SECONDS
const chapters = ["overview", "run", "lab", "prove", "timeline"] as const;
const cardTime = CARDS.reduce((s, c) => s + c.seconds, 0);
const recTime = chapters.reduce((s, k) => s + (marks[k][1] - marks[k][0]), 0);
const speed = Math.max(1, recTime / (MAX_SECONDS - cardTime));
console.log(`cards ${cardTime}s, recorded ${recTime.toFixed(1)}s, speed x${speed.toFixed(2)}`);

// 3. Encode cards and chapters
const parts: string[] = [];
const card = (id: string) => {
  const c = CARDS.find((x) => x.id === id)!;
  const out = join(FRAMES, `${id}.mp4`);
  ff(["-loop", "1", "-t", String(c.seconds), "-i", join(FRAMES, `${id}.png`), "-vf", "fade=t=in:st=0:d=0.4,fade=t=out:st=" + (c.seconds - 0.4) + ":d=0.4", ...ENC, out]);
  parts.push(out);
};
const chapter = (name: (typeof chapters)[number]) => {
  const [s, e] = marks[name];
  const out = join(FRAMES, `${name}.mp4`);
  ff(["-ss", s.toFixed(2), "-to", e.toFixed(2), "-i", join(RAW, "session.webm"), "-vf", `setpts=PTS/${speed.toFixed(4)},scale=1920:1080`, "-an", ...ENC, out]);
  parts.push(out);
};

card("c1");
card("c2");
chapter("overview");
card("c3");
chapter("run");
card("c4");
chapter("lab");
card("c5");
chapter("prove");
card("c6");
chapter("timeline");
card("c7");

// 4. Concatenate
const list = join(FRAMES, "parts.txt");
writeFileSync(list, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
const final = join(DIR, "drugrep-proof-layer-demo.mp4");
ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", final]);
const dur = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", final]).toString().trim();
console.log(`wrote ${final} (${Number(dur).toFixed(1)} s)`);
