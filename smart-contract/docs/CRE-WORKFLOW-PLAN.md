# CRE workflow plan for Mizan

This is a build plan for the Chainlink CRE workflow that the onchain contracts
([ONCHAIN-DESIGN.md](ONCHAIN-DESIGN.md), [CRE-INTEGRATION.md](CRE-INTEGRATION.md)) are already shaped
to receive. It is not built yet — this document is the plan, not the implementation.

## 1. What the workflow's job actually is

`MizanReceiver.onReport` only trusts one caller: Chainlink's Forwarder contract. The workflow is the
program Chainlink's DON runs that produces the bytes handed to that call. It does **not** sign
anything on behalf of the Sharia board — board members sign their own opinions offline, with their
own keys, before the workflow ever sees the payload. The workflow's job is narrower than it sounds:
assemble an already-signed, already-valid report and deliver it through CRE's EVM write capability.

```
Sharia board members          Assessment source           CRE workflow                  Chain
(sign offline, own keys)  →   (API / file / your app) →   (fetch, validate,    →   MizanReceiver.onReport
                                                             encode, deliver)         → MizanRegistry
```

## 2. Minimum viable workflow (what to actually build given the deadline)

Given the hackathon deadline, build the smallest workflow that proves the real integration — not a
production pipeline. A good MVW:

1. **Trigger**: HTTP/manual trigger (invoked via `cre workflow simulate` / a CLI call), not a cron
   job. A manual trigger is enough to prove the DON → Forwarder → `onReport` path works; scheduling
   is a feature, not a proof point.
2. **Input**: a pre-assembled JSON payload containing the signed `Issue` + board `Opinion[]` array —
   generated ahead of time by a small offline signer script (see §4), not computed live by the
   workflow.
3. **Logic**: validate shape, ABI-encode per schema v2, read `latestId(asset)` to avoid resubmitting
   a stale nonce, then call CRE's EVM write capability.
4. **Output**: log the transaction hash and the registry's resulting `resolve(asset)` state.

That's the whole MVW. Everything below is the "if time allows" / "for the real product" layer —
don't build it before the MVW works end-to-end on Sepolia.

## 3. Full workflow responsibilities (production shape, for later)

| Step | What it does | Source |
|---|---|---|
| 1. Fetch | Pull an assessment request from a real assessment API (asset, evidence, proposed outcome) | [CRE-INTEGRATION.md §Suggested workflow, step 1](CRE-INTEGRATION.md#L50) |
| 2. Validate | Check schema, board member signatures, quorum, size limits, evidence hash references, off-chain | step 2 |
| 3. Read state | Call `latestId(asset)` to detect stale/already-applied actions before spending gas | step 3 |
| 4. Encode | ABI-encode `abi.encode(uint8(2), uint8(action), abi.encode(input), abi.encode(signed))` — **must** use a real ABI encoder, never `encodePacked`, because `Issue` contains a dynamic `string` | step 4, [CRE-INTEGRATION.md §Report schema](CRE-INTEGRATION.md#L9-L25) |
| 5. Deliver | CRE's EVM write capability → Chainlink Forwarder → `onReport` | step 5 |
| 6. Distinguish | Tell simulation output apart from an actual broadcast receipt | step 6 |
| 7. Confirm | Mark "delivered" only after reading back accepted onchain state, never optimistically | step 7 |

## 4. The piece that isn't "CRE" but has to exist first: the offline signer

The workflow consumes signatures; it doesn't produce them. Since the 5 demo board wallets
(`smart-contract/board-keys.local`, gitignored) are plain EOAs, you need a small script — plain
Node/TS or a Foundry script like `LocalDemo.s.sol` but parameterized for Sepolia — that:

1. Builds the EIP-712 `Issue` struct (must include the deployed registry's `policyId`, see
   [MizanRegistry.sol:369](../src/MizanRegistry.sol#L369)).
2. Has each board member sign `hashOpinion(issue, opinion)` with their own key, sorted by ascending
   address (contract requires strict ascending order — [CRE-INTEGRATION.md:19](CRE-INTEGRATION.md#L19)).
3. Writes the result as the JSON payload the workflow's trigger will consume.

This can be a one-off script run by hand for the demo — it does not need to be "live" or automated
for the MVW.

## 5. Configuration that must match exactly

Per [CRE-INTEGRATION.md §Configurations must match](CRE-INTEGRATION.md#L60-L67), get these right
once — the receiver is immutable, so a mismatch means redeploying `MizanRegistry` + `MizanReceiver`:

- Chain ID in the board members' EIP-712 domain = the chain you actually deploy to.
- `policyId` used when signing = the one baked into the deployed registry.
- `CRE_FORWARDER` = Chainlink's real Forwarder address for Sepolia (looked up from Chainlink's
  current docs at deploy time, not guessed).
- `CRE_WORKFLOW_ID` / `CRE_WORKFLOW_OWNER` = whatever the CRE CLI assigns when you deploy the
  workflow — you don't choose these, you read them back after deploying.
- Gas limit on the CRE target chain config needs to cover an `onReport` call with a full board's
  worth of signatures (quorum 3-of-5 here).

## 6. Build order

1. Write the offline signer script against the already-deployed Sepolia registry (needs the real
   `policyId` from the deploy, so do contract deployment first).
2. Scaffold a CRE workflow project (`cre init`), stub the trigger with a hardcoded JSON payload from
   step 1.
3. Implement encode → read `latestId` → EVM write.
4. `cre workflow simulate` locally against the stub payload — confirms encoding without spending gas
   or touching a live DON.
5. `cre workflow deploy` targeting Sepolia — this is what actually produces `CRE_WORKFLOW_ID` and
   confirms the real `CRE_FORWARDER` address for the network.
6. **Stop here and redeploy the registry/receiver** with the real forwarder/workflow values (the
   placeholder deploy used your own address as a stand-in forwarder; swap it for the real one before
   calling this "CRE integrated").
7. Trigger the workflow for real, confirm the transaction, then read `resolve(asset)` on the deployed
   registry to show the opinion actually landed through the real Chainlink path.

## 7. What to explicitly *not* build for this hackathon

- A real external assessment API — a static/mocked JSON payload is enough to prove the pipeline.
- Cron/webhook triggers — manual trigger is sufficient proof.
- Any workflow-side signing — board members sign offline; the workflow must never hold their keys.
- Retry/idempotency hardening beyond the contract's existing nonce/replay checks — the registry
  already rejects replays ([CRE-INTEGRATION.md: "Never weaken these checks"](CRE-INTEGRATION.md#L58)).

## 8. Sources

- https://docs.chain.link/cre/overview
- https://docs.chain.link/cre/guides/workflow/using-evm-client/onchain-write/building-consumer-contracts
- https://docs.chain.link/cre/guides/operations/deploying-workflows
- [CRE-INTEGRATION.md](CRE-INTEGRATION.md) (this repo's receiver-side contract of what the workflow must produce)
