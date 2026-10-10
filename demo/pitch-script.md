# Pitch video script (for the founders to record)

Target length: 2 to 3 minutes. Two speakers is fine; split by section. Plain spoken English, no slides needed beyond the live app and the repo.

---

## 1. Who we are (about 20 seconds)

We are DrugRep. We build an AI engine that finds new uses for drugs that are already approved. It covers 4,498 approved drugs, 5,574 diseases and 9,208 proteins. Our motto is simple: every drug deserves a second chance.

## 2. The problem (about 30 seconds)

Repurposing has two trust problems.

The first is timing. Anyone can claim, after a trial reads out, that their model saw it coming. Without a public, tamper proof record of when a prediction was made, those claims are worth very little.

The second is data. The evidence that confirms a prediction lives in clinical trials and lab assays. Owners cannot hand that data to an AI company, for legal and ethical reasons, so good predictions often go unchecked.

## 3. What we built on Solana (about 45 seconds)

The DrugRep Proof Layer fixes both.

Every engine run is hashed, layer by layer, together with its inputs and model version, and anchored on Solana. The slot and the time are written by the program, so the order of events is public and permanent.

Then a lab can test our predictions against its own private data. The lab generates a zero knowledge proof, in its own browser, that says how many of our top predictions its data confirms. Only the proof leaves. A Solana program verifies it and writes an attestation that anyone can read, including whether our prediction came before the lab's data.

The lab keeps control. Its data never moves, and it can revoke at any time.

## 4. Why Solana (about 20 seconds)

Proof verification on Solana is cheap and fast: one verification costs around 130,000 compute units and confirms in seconds, so we can attest every run, not just a few. Slots give us a precise public clock, and Solana's ecosystem gives us a path to attestations, compression and private compute as we grow.

## 5. What exists today (about 20 seconds)

Everything in this demo is live on devnet and open source: two Anchor programs, a Groth16 circuit, in browser proving, an engine bridge, a lab simulator and the web app. The data in the demo is a fixture shaped like our real output; the real engine plugs into the same interface.

## 6. What comes next (about 25 seconds)

Next we want to move richer evaluation logic into SP1, so labs can prove ranking metrics, not just hit counts. We want Arcium for pooling several trial sites without any of them seeing the others. We want Solana Attestation Service credentials so labs and sponsors are verified identities, ZK Compression to anchor every single prediction cheaply, and then mainnet with our first partner labs.

## 7. Close (about 10 seconds)

Predictions you can date. Data that never moves. That is the DrugRep Proof Layer. Every drug deserves a second chance.

---

Things to avoid saying

- That the demo shows real model output or real trial data. It is demo data.
- That this is on mainnet or production ready. It is a devnet proof of concept with a test trusted setup.
- Hype words ("revolutionary", "game changing"). The facts are stronger.
