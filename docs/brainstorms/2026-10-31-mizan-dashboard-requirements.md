---
date: 2026-10-31
topic: mizan-dashboard
---

## Summary

A standalone dashboard page, separate from the illustrative landing page, gives asset issuers a
live Sepolia view of board resolutions — a free browsable list plus an address lookup — and AI
pre-screen scores, with no backend or indexer. A second phase adds a board-member view where
members connect a wallet, sign EIP-712 opinions in-browser, and have them delivered on-chain
through the same CRE forwarder pipeline already proven for AI pre-screen.

---

## Problem Frame

The only way to see Mizan's real on-chain state today is the terminal — `cast call` commands run
by hand. The existing frontend is a polished illustrative demo (a Three.js scroll with a fictional
`REVIEWS` array); none of it reads live data. Anyone who wants to check a real asset's status, or
see any board activity at all, has no page to visit. Separately, submitting a board opinion today
only happens through a Foundry script run by whoever holds the deployer key — not something a
board member can do themselves.

---

## Actors

- A1. Asset issuer / DeFi protocol — knows their own asset's address, wants to see its board
  resolution and AI pre-screen score.
- A2. Sharia board member — holds one of the registered board wallets, wants to see assessments
  awaiting their opinion and sign them without running a script.
- A3. General visitor — lands on the dashboard without a specific address in mind, browses the
  list of board-reviewed assessments.

---

## Key Decisions

- **No backend, no indexer.** Wallet-connect replaces real Sign-In With Ethereum (no server exists
  to issue a session), and direct RPC reads replace an indexer. `MizanRegistry` already supports a
  full browse list for free — assessments are sequentially numbered (`assessmentCount` +
  `getAssessment(id)`), so looping over them client-side needs no backend. `MizanAIPreScreen` has
  no equivalent counter; see Scope Boundaries for how that's handled.
- **Board opinion delivery reuses the CRE forwarder pipeline**, not a new relay. The real Sepolia
  mock-forwarder path was already proven working this session for AI pre-screen; board opinions
  use the same mechanism instead of a bespoke submission script.
- **The dashboard is a new, separate page.** The existing illustrative landing page (Three.js
  world, fictional data in `frontend/src/data/reviews.ts`) is untouched.

---

## Requirements

**Seed data**

- R1. At least one real board-signed assessment is submitted to the live registry — a one-off
  script reusing the existing `smart-contract/board-keys.local` wallets — so the dashboard has
  real data to show rather than an empty state for every asset.

**Issuer / public view**

- R2. A dashboard page exists at a new route, separate from the existing landing page.
- R3. The page shows a browsable list of every real board-reviewed assessment, read directly from
  `MizanRegistry` by looping `assessmentCount`/`getAssessment(id)` — no backend.
- R4. The page offers an address lookup: paste an address or connect a wallet to prefill it, then
  show that asset's `resolve()` result and, if present, its `MizanAIPreScreen.getPreScreen()`
  result.
- R5. AI pre-screen results are shown for a known/config list of demo assets (reusing the CRE
  workflow's existing asset list) plus whatever address the user looks up directly — not a full
  browse of every AI-prescreened asset.
- R6. Wallet connection is read-only (address + prefill), not a session — no login persists across
  visits.

**Board member view**

- R7. Board members connect their wallet to see assessments where their opinion is outstanding.
- R8. A board member signs their opinion (EIP-712) in their browser wallet; no gas, no
  transaction, just a signature.
- R9. Signed opinions are delivered on-chain through the same CRE forwarder pipeline already
  working for AI pre-screen, not a new relay mechanism.

---

## Key Flows

- F1. Board member signs an opinion
  - **Trigger:** Board member visits the board view and sees an assessment awaiting their opinion.
  - **Actors:** A2
  - **Steps:** Connect wallet → see outstanding assessment → sign EIP-712 opinion in wallet (no
    tx) → signature picked up by the CRE forwarder pipeline → delivered on-chain once quorum is
    reached.
  - **Covered by:** R7, R8, R9

---

## Acceptance Examples

- AE1. **Covers R4.** Given an address with a board resolution but no AI pre-screen entry, when
  looked up, then the page shows the resolution and indicates no AI pre-screen exists for that
  asset — not an error.
- AE2. **Covers R4.** Given an address with neither a resolution nor a pre-screen entry, when
  looked up, then the page shows a clear "not yet reviewed" state, not an empty/blank page.
- AE3. **Covers R8, R9.** Given a board member signs an opinion but quorum hasn't been reached
  yet, when they check back later, then the assessment still shows as pending until quorum
  delivers it on-chain.

---

## Scope Boundaries

- Deferred for later: browsing every AI-prescreened asset beyond the known demo list — would need
  a backend/indexer since `MizanAIPreScreen` has no enumerator.
- Out of scope: real Sign-In With Ethereum / session backend.
- Out of scope: any change to the existing illustrative landing page or
  `frontend/src/components/Register.tsx`.

---

## Dependencies / Assumptions

- The board member view (R7-R9) depends on wiring the CRE-pipeline delivery mechanism for board
  opinions the same way AI pre-screen's was wired — proven working this session, but only for the
  simpler AI pre-screen payload shape, not yet built or tested for opinions specifically.

---

## Outstanding Questions

**Deferred to planning:**

- Exact wallet-connect library choice (e.g. wagmi + viem) and RPC provider for client-side reads.
- Exact trigger mechanism for the board-opinion CRE pipeline (scheduled vs. triggered by a UI
  action) — mirrors the AI pre-screen workflow's pattern but wasn't built or tested this session
  for opinions specifically.

---

## Sources / Research

- `smart-contract/src/MizanRegistry.sol` — `Resolution`, `Assessment`, `Opinion` shapes;
  `assessmentCount`/`getAssessment(id)` sequential pattern (lines ~127, 231, 268).
- `smart-contract/src/MizanAIPreScreen.sol` — `PreScreen` shape; no enumerator, only
  `getPreScreen(address)`.
- `smart-contract/deployments/sepolia.json` — live addresses; registry `assessmentCount` confirmed
  0 as of this brainstorm.
- `frontend/src/components/Register.tsx`, `frontend/src/data/reviews.ts` — existing
  illustrative/fictional demo; confirmed no live reads, no wallet deps in `frontend/package.json`.
- `cre-workflow/ai-prescreen/` — proven working CRE forwarder delivery pattern (real Sepolia
  mock-forwarder `0x15fC6ae953E024d975e77382eEeC56A9101f9F88`), the mechanism board-opinion
  delivery will reuse.
