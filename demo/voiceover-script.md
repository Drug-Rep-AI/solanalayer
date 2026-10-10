# Voiceover script: DrugRep Proof Layer technical demo

About 2 minutes 45 seconds at a calm pace (roughly 140 words a minute). Section markers match the title cards in the video. Read it plainly; let the screen carry the detail.

---

**[Card 1 · The problem] 0:00**

Drug repurposing is about finding new uses for drugs that are already approved. A prediction like that is only worth something if you can show you made it before the evidence came in. And the evidence usually sits in trial and lab data that nobody is allowed to share.

**[Card 2 · Three layers] 0:15**

DrugRep works in three layers. First, it breaks each drug into functional fragments and scores which proteins they bind. Second, it turns each disease into a ranked list of the proteins behind it. Third, it matches the two, and every score comes with the protein path that explains it.

**[Overview screen] 0:32**

The Proof Layer is what we built on Solana around that engine. It does four things: it makes every result traceable, it timestamps every prediction, it lets a lab check our predictions against private data, and it leaves that data with its owner. Only hashes, roots and proofs go on chain.

**[Card 3 · Commit and timestamp] 0:50**

Here is a run. The data is a demo fixture, shaped like real engine output. At the top is a well known case: sildenafil for pulmonary arterial hypertension, through PDE5A and PRKG1.

Each layer gets its own hash, and so do the inputs and the model version. One transaction anchors all of them, plus a root over the ranked predictions. The program stamps it with the slot and the time. That slot is our "we called it first".

**[Card 4 · Private lab data] 1:20**

Now we switch sides. This is a lab with its own outcomes. The records are salted and stay in the browser. If I flip one label, the root changes, so the root commits to every record without showing any of them.

When the lab commits, only three things leave: the root, the number of records, and a schema version.

**[Card 5 · Prove and verify] 1:45**

The lab now proves how many of our top twenty predictions its data confirms. The proof is generated right here in the browser, in about two seconds. Eight of twenty.

A Solana program checks the proof on chain. It also checks that both roots are registered, and that the run came before the data. It did, so the record carries the "predicted before outcome" badge.

If anyone tries to submit the same proof again, the program refuses it. Each proof can count once.

**[Card 6 · Timeline and revocation] 2:20**

Everything we just did is on this timeline, read straight from the chain, in slot order. Anyone can rebuild it.

And the lab stays in control. It can revoke its dataset. New proofs against it are refused, and the validation now reads as revoked.

**[Card 7 · Closing] 2:38**

That is the DrugRep Proof Layer: predictions you can date, checked against data that never moves. It runs on Solana devnet today, and the code is open. Every drug deserves a second chance.

---

Notes for recording

- Say "Groth16" only if asked; the screen shows it.
- All drugs, scores and labels shown are demo data. Do not describe them as model output or trial results.
- Do not mention mainnet or production security; this is a devnet proof of concept with a test trusted setup.
