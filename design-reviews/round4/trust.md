# Trust, fintech credibility and Islamic-finance fit: round 4 (final)

## Score: 84/100
Excellent and credible. Every rule verdict now matches what its record says, holder guidance and the oracle agree, and each status change carries its own signed notice. What remains is one on-chain claim that cannot be implemented as written, and some invented-looking detail in the history entries.

## What works
- **The rule verdicts are now correct for every status** (`rules.ts:16-67`, `Builders.tsx:80-104`).
  - **Active:** met.
  - **Expired and Replaced, under "Approved when acquired":** a distinct "limited" verdict, shown as "Met, covered through 30 Jun 2025" with a clock icon instead of a green check. It returns `coveredThrough` and says "Holding after that date is unreviewed". This now matches MZN-003's exclusion ("Any period after expiry") and its holder text.
  - **Needs review:** a "Hold, do not add" verdict with `advice: "HOLD_DO_NOT_ADD"` and `requirementMet: false`. MZN-004's holder text now says the same thing ("the oracle answers false meanwhile", `r4-MZN-004.png`).
  - **Withdrawn:** false "whenever the position was acquired". **Closed:** false. **Not checked:** null.
  - The matrix labels ("Yes", "Yes, up to a date", "Hold, do not add", "No") make the semantics clear to builders before they integrate.
- **The provenance is now a credible attestation design.**
  - Each board decision is signed over its own `noticeHash` (`keccak256(abi.encode(recordId, noticeHash, status, at))`) and anchored in its own transaction. A verifier can check the withdrawal separately from the approval it voids.
  - Expiry is marked `automatic: true` and left unsigned, because the registry derives it from `validUntil` (`rules.ts:107-130`). That is exactly right.
  - Block numbers follow the dates, hashes are distinct, and the caption changes with the record.
- **The payload is consistent from start to finish.**
  - `validFrom`, `validUntil` and `effectiveUntil` are null for Not approved.
  - For Withdrawn, `effectiveUntil` equals `voidFrom`, the issue date.
  - `coveredThrough` and `advice` appear only when they apply, and `purification` is structured.
  - The new `codeHash` binds an approval to the code that was reviewed.
  - `demoAsOf` is now computed in UTC, so answers no longer depend on the viewer's time zone.
- **The holder guidance is right and consistent.**
  - MZN-006 now says "apart from any return of your own capital", which matches the purification base.
  - MZN-003 says income up to expiry stands after purification and holding after expiry is unreviewed.
  - MZN-005 says to exit and give interest to charity.
  - MZN-007 says to migrate to v2.
  - Each matches its rule verdict.
- **The Islamic-finance substance holds up.**
  - The fulūs/thamaniyyah and muḍārabah muqayyadah notes are accurate.
  - Each seat's madhhab is named.
  - A voting member's recusal is shown, and the 2–0 vote reflects it.
  - The AAOIFI numbers are correct. The crypto-asset caveat is now dated ("As of October 2026").
  - Spelling follows AAOIFI's own "Shari'ah" convention throughout.

## Problems

**Med: the Solidity comment describes something a view call cannot do in general.**
- `isAccepted` claims to resolve "a proxy to its implementation (EIP-1967 slot)" and compare that code's hash (`rules.ts:186-190`).
- A contract cannot read another contract's storage slot. Transparent proxies restrict `implementation()` to the admin, UUPS proxies usually expose no getter, and beacon and diamond proxies use other layouts.
- So the oracle cannot discover a proxy upgrade by itself on-chain. It needs the registry to be updated, either by a keeper or by the board signing a NEEDS_REVIEW entry when the implementation changes. Or it can read `EXTCODEHASH` of a non-proxy directly.
- The record sheet repeats the claim: "the on-chain check stops matching" (`RecordModal.tsx:252`).
- A Solidity reviewer will catch this. It is the only technical claim on the page that is overstated.

**Low-Med: status entries reuse the approval vote.**
- `history()` copies the original approval vote onto NEEDS_REVIEW and REPLACED entries (`rules.ts:116`). MZN-004's suspension shows "2-0", and MZN-007's replacement shows "3-0".
- §4 says "Any material change moves a record to Needs review the same day" (`WhoDecides.tsx:71`), which reads as an administrative step, not a vote.
- A compliance reader will ask when that vote happened.
- Show suspension as "Chair's notice" or "Administrative", and give replacement the vote recorded on MZN-008.

**Low: the demo acquisition date can fall after "today".**
- For MZN-001 the "Approved when acquired" payload shows `asOf: "2026-11-11"`, after `checkedAt: "2026-10-29"`. MZN-002 has the same problem.
- The Active branch also ignores `asOf` entirely, including an `asOf` before the issue date.
- Clamp the demo `asOf` to no later than `checkedAt`, and return "not in force" for an `asOf` outside the validity window.

**Low: the hold verdict cannot be expressed on-chain.** The Solidity interface returns only `bool`, so a contract using APPROVED_WHEN_ACQUIRED cannot tell "hold" from "no". Return a small enum (`ACCEPTED`, `LIMITED`, `HOLD`, `REJECTED`) or a `coveredThrough` timestamp.

**Low: the custody standard is still mapped to SS 9.** It is acceptable, but a paid safekeeping service is closer to hiring of services (SS 34). A one-line note on the analogy would close it.

## Top 5 recommendations (ranked by score impact)
1. **Rewrite the Solidity comment and the "Reviewed code" line to match what is possible on-chain.**
   - Say: "The registry stores the reviewed implementation's code hash. When an implementation change is detected off-chain, the board's keeper moves the record to NEEDS_REVIEW in the same block range."
   - Or say: "For non-proxy contracts, `isAccepted` checks `EXTCODEHASH` directly."
2. **Record real decision metadata on each history entry.**
   - Suspension: "notice by the Chair, administrative".
   - Replacement: the vote cites MZN-008.
   - Withdrawal: keep its own vote, as now.
3. **Return a verdict enum from `isAccepted`,** so on-chain integrators get the same four answers as HTTP integrators.
4. **Clamp the demo `asOf` and validate it.** Keep it no later than `checkedAt`, and make the Active branch check that `asOf` falls inside `validFrom`–`effectiveUntil`.
5. **Add a footnote on the SS 9 versus SS 34 analogy** for the bridge's custody fee.

## What would get this to 85+
It is one step away. Make the on-chain upgrade claim true: a keeper or the board updates the registry, or `EXTCODEHASH` is used for non-proxies. Stop copying approval votes onto status entries that were not voted on. With those two fixed, I found nothing a Shari'ah compliance officer or a Solidity auditor would block on, and the score would sit at 86–88.

## Remaining issues worth fixing
1. **The Solidity and "Reviewed code" claims say a view call can resolve EIP-1967 proxies and detect upgrades by itself.** It cannot. Restate the claim as a registry updated by a keeper or the board, plus `EXTCODEHASH` for non-proxies (`rules.ts:186-190`, `RecordModal.tsx:252`).
2. **NEEDS_REVIEW and REPLACED history entries reuse the approval vote** (`rules.ts:116`). Label suspension as administrative, and cite MZN-008's vote for the replacement.
3. **`isAccepted` returns only `bool`, so "hold" and "limited" are lost on-chain.** Return a verdict enum or a `coveredThrough` timestamp.
4. **The demo `asOf` for Active records falls after `checkedAt`** (MZN-001: 2026-11-11), and the Active branch ignores `asOf`. Clamp and validate it.
5. **The bridge custody fee maps to SS 9.** Add a note on the SS 34 (hiring of services) analogy, or cite both.
