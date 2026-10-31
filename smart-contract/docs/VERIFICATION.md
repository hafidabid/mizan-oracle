# Verification results

Executed on 29 October 2026; re-run on 31 October 2026 after adding the Sharia board (per-member opinions and quorum). This is an engineering test record, not a security audit.

## Toolchain

- Foundry v1.3.1: forge, cast, anvil (reference toolchain for the packaged project).
- Solidity 0.8.24, optimizer 200 runs, Paris EVM, no via-IR.
- OpenZeppelin Contracts v5.4.0 and forge-std v1.9.7, bundled and pinned.
- The unit suite also passed with forge v1.8.6 during development; formatting and the Anvil smoke run use v1.3.1.
- The 31 October Sharia board member-board re-run (build, tests, `forge fmt --check`, Anvil smoke) used forge v1.2.2.

## Results

| Check | Result |
|---|---|
| Compile all contracts and scripts | Passed |
| Foundry unit/fuzz suite | 64 tests passed, 0 failed, 0 skipped |
| Fuzz expiry | 256 runs |
| Fuzz tampered evidence hashes | 256 runs |
| Foundry formatting check | Passed with reference toolchain |
| Anvil deploy and initial approval | Real local transactions succeeded |
| Active approval rules | Modes 0, 1, 2 return true |
| Sharia board member opinions | 3 Sharia board members recorded: 2 Approved, 1 NeedsReview (quorum 2) |
| Time advance beyond expiry | Mode 0 true, mode 1 true, mode 2 false |
| Signed revocation | Real local transaction succeeded, 2 revoking Sharia board members recorded |
| Revoked assessment rules | Mode 0 true, modes 1 and 2 false |
| Latest ID after revocation | Remains 1 |

The smoke script ends with `ANVIL SMOKE PASSED`. Local transaction receipts are summarized in `LOCAL-RECEIPTS.json` (from the 29 October single-signer run; not regenerated for the Sharia board member-board version). They belong to an ephemeral local chain, not an Ethereum explorer.

## Contract size check

| Contract | Runtime bytes | Initcode bytes |
|---|---:|---:|
| MizanRegistry | 14,626 | 17,942 |
| MizanReceiver | 3,876 | 4,246 |
| MizanConsumer | 1,388 | 1,532 |

Core deployments are below Ethereum's 24,576-byte runtime and 49,152-byte initcode limits. Sizes come from `forge build --sizes`; compiler metadata can change after source/configuration edits.

## Tested security behavior

- Wrong or non-Sharia board member signature; changed outcome, evidence URI/hash, chain, or registry domain.
- Per-member opinions recorded with dissent; split boards stored as NeedsReview with counts; too few signers rejected; duplicate or unsorted Sharia board members; relabelled opinions; revocation quorum and revokers.
- Reused nonces, nonce reuse across actions, and stale predecessors.
- Exact expiry/deadline boundaries, invalid dates, and oversized/empty evidence URIs.
- Rejection and revocation never fall back to old approval.
- Historical revocation does not revoke a newer replacement.
- Suspended boards, deactivated/added Sharia board members, and quorum bounds behave as documented.
- Direct registry calls and untrusted receiver calls are rejected.
- Wrong workflow/owner, malformed metadata/report, unsupported versions/actions.
- Both 62-byte tooling and 64-byte production-shaped metadata are accepted.
- Ownership transfer requires acceptance; receiver wiring is one-time.

## Not tested or not implemented

- No public Sepolia/mainnet deployment, funded production account, or explorer verification.
- No live Chainlink forwarder/DON delivery, CRE CLI simulation, or deployment access.
- No actual Sharia certification, review-board credential validation, or policy interpretation.
- No ERC-1271 Sharia board member wallets, proxies, upgrade monitor, multi-chain oracle, or Uniswap hook.
- No audit, formal verification, network outage testing, or production availability guarantee.

The receiver is designed against the documented callback and metadata layout, but local mock tests do not prove correct network/workflow configuration or live integration. The full CRE workflow is the next integration task for bounty 1362.
