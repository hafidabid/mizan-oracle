# Trust, fintech credibility and Islamic-finance fit: round 3

## Score: 82/100
Excellent and credible. The status model, withdrawal handling, investor guidance, verifiable history and madhhab content would now survive a first read by a Shariʿah compliance officer. What keeps it from the high 80s is one overclaim in the "Approved when acquired" rule, one inaccurate claim in the Solidity interface, and a few loose ends in provenance.

## What works
- **The provenance now looks and behaves like real attestation.**
  - Hashes, signatures and transactions differ fully between records (`rules.ts:59-79`).
  - Block numbers follow the dates: 12-second blocks from block 18,000,000 on 1 Jan 2024 (`rules.ts:82`). MZN-003's approval sits at block 19,307,561 and MZN-006's withdrawal at 24,885,862.
  - `provenance.history` has one signed and anchored entry per status change. The record sheet shows it as a table (ACTIVE, then WITHDRAWN, each with its own block and transaction).
  - The verification steps name the exact encoding: `keccak256(abi.encode(recordId, reportHash, status, at))` (`Builders.tsx:134`, `r3-MZN-006.png`).
- **The cross-reference chronology is fixed.**
  - MZN-002 is now issued 20 Oct 2026, after MZN-001 (12 Oct 2026) and MZN-008 (20 Jul 2026), the two records it cites.
  - MZN-007 is replaced on 20 Jul 2026, the same day MZN-008 is issued.
  - The MZN-004 recusal cites 2025 advisory work, before its March 2026 review.
  - I found no remaining forward references.
- **The madhhab notes are now real scholarship.**
  - MZN-002 grounds the token-as-money question in the classical fulūs debate (`reviews.ts:95`). The positions are stated accurately:
    - Shāfiʿī: fulūs lack thamaniyyah.
    - Mālik: disliked their deferred exchange.
    - Ḥanafī: divided, with al-Shaybānī treating fulūs as currency.
    - Ḥanbalī: two reports.
  - MZN-003 adds a correct note on restricted mudarabah (muḍārabah muqayyadah). Ḥanafī and Ḥanbalī jurists allow restriction; Mālikī and Shāfiʿī jurists reject restrictions that unduly narrow the trade.
  - §4 now names each voting seat's school: Shāfiʿī, Ḥanafī, Mālikī (`WhoDecides.tsx:4-7`). The recusal is now by a voting member (the Mālikī), with a 2–0 vote recorded.
  - A scholar would read these notes with respect.
- **The standards mapping is tighter.**
  - MZN-001 now cites only SS 38; the SS 21 citation is gone.
  - MZN-004 (wadīʿah plus ujrah) now cites SS 9 plus SS 38 instead of SS 1.
  - MZN-003's riba screen now mentions the 5% tolerance for impermissible income, which matches the SS 21 convention, with purification.
- **The "Approved when acquired" rule has a defined meaning.** It takes an `asOf` date, compares it with `effectiveUntil`, appears in the payload and the HTTP example, and never accepts Needs review, Withdrawn or Closed (`rules.ts:8, 32-55`). MZN-007's holder text, its `effectiveUntil` and the rule now agree.
- **Purification is structured data.**
  - The payload carries `{ rate, base, from }`.
  - MZN-006 correctly excludes return of the holder's own capital.
  - The withdrawn record's seal is overprinted "VOID" (`Seal.tsx`, `r3-MZN-006.png`).
  - "Approved" is struck through and labelled "void, withdrawn 14 Aug 2026".

## Problems

**Med: "Approved when acquired" overclaims coverage after expiry.**
- For MZN-003 (Expired) the rule returns "Requirement met… A position bought then stays covered for what was reviewed" (`rules.ts:49`, `r3-MZN-003.png`).
- The same record says, in its exclusions, "Not covered: Any period after expiry" (`reviews.ts:104`). Its holder guidance says income after 30 Jun 2025 is unreviewed.
- So the rule says "still covered" while the record says "not covered".
- A Shariʿah reviewer would say the acquisition was valid, but the holding has been unreviewed since the expiry date.
- The rule's true answer is "was approved when acquired", not "stays covered". The verdict text and the label "Requirement met" should reflect that limit.

**Med: the Solidity interface makes an inaccurate claim.**
- The comment says the interface is "Keyed by the deployed code, so an upgraded contract misses automatically", but the key is `address product` (`rules.ts:157-160`).
- A proxy upgrade keeps the same address. That is exactly MZN-004's case (a contract upgrade that changed the fee logic). So an address-keyed oracle would *not* miss automatically.
- Builders will copy this. Key on the implementation's `codehash` (resolving the EIP-1967 implementation slot for proxies), or remove the claim.

**Med-Low: "Approved when acquired" and the Needs review holder guidance disagree.**
- MZN-004 tells holders "Hold, but do not add."
- Yet a position acquired on 2 Apr 2026, while the approval was in force, gets "Requirement not met" under the rule built for positions already held.
- The rule description does say it "never accepts a suspended approval", so this is documented. But it contradicts the record's own advice.
- Either return a third state, `SUSPENDED` (hold, do not add), or align the holder text with the rule.

**Med-Low: the withdrawal entry signs the original report hash.**
- Every history entry signs `reportHash`, the approval report (`Builders.tsx:134`). A withdrawal should be backed by its own signed notice: the new facts, the withdrawal vote and the void-from reasoning. That notice needs its own document hash.
- As it stands, a verifier can confirm the board said WITHDRAWN on 14 Aug, but not what it relied on.
- An EXPIRED entry signed by the board on the expiry date is also odd. Expiry is automatic, so either the registry derives it or the entry should be labelled as automatic.

**Low: the provenance caption is the same on every record.** "…so a withdrawal can be checked as well as the approval it voids" appears on Expired and Closed records (`r3-MZN-003.png`). Phrase it in terms of status changes.

**Low: `demoAsOf` is time-zone dependent.**
- `parseDate` builds local midnight, and then `toISOString()` converts to UTC. East of UTC, "30 days after issue" comes out as 29 days.
- The payloads show `asOf: "2025-12-19"` for a 20 Nov issue, and `"2025-08-30"` for 1 Aug (`rules.ts:29`).
- An oracle demo whose answers depend on the viewer's time zone undercuts its own claim to determinism.

**Low: small wording mismatches remain.**
- MZN-006's holder text says "Purify all distributions received since issue", while the purification base excludes return of capital. Echo the exclusion.
- "Sharia" (hero H1, record notice, footer) and "Shariʿah" (§4, seal, attestor, Solidity "Shariah") are still mixed.
- "AAOIFI has no dedicated standard for crypto-assets yet" still lacks an "as of" date.

**Low: SS 9 for a custody fee is a reasonable fit but not the closest one.** A fee for safekeeping is closer to ijarah of services or hiring of persons (SS 34) than to SS 9's asset leasing. Neither is wrong, but a footnote would help.

## Top 5 recommendations (ranked by score impact)
1. **Fix the "Approved when acquired" verdict for Expired and Replaced records.**
   - Return `requirementMet: true` with `coveredThrough: effectiveUntil`.
   - Change the copy to "Approved when you acquired it (through 30 Jun 2025). Holding after that date is unreviewed."
   - Show it with a muted check or info icon, not the green "Requirement met".
2. **Correct the Solidity key.**
   - Use `isAccepted(address product, …)` that resolves the implementation and compares its `codehash` to the reviewed code hash stored in the record.
   - Add `codeHash` to the payload and to the record's "Covered" line.
   - That makes "an upgrade misses automatically" true, and it is the strongest technical trust signal available to builders.
3. **Give status entries their own evidence.**
   - Each history entry should carry a `noticeHash` (the withdrawal notice, the suspension notice) and the vote for that decision.
   - Sign `abi.encode(recordId, noticeHash, status, at)`.
   - Mark EXPIRED as `automatic: true` rather than board-signed.
4. **Resolve the Needs review contradiction.** Either add a `SUSPENDED_HOLD` answer for existing positions, or change MZN-004's holder text to match the rule. Then generalise the provenance caption.
5. **Clean up the details.**
   - Fix `demoAsOf` so it uses UTC throughout.
   - Echo the capital exclusion in MZN-006's holder text.
   - Use one spelling, "Shariʿah", in all formal labels.
   - Date the AAOIFI crypto-asset statement.
   - Footnote SS 9 versus SS 34 for the bridge fee.

## What would get this to 85+
Make the rule verdicts say exactly what the records say. "Approved when acquired" should never imply coverage after the approval stopped being in force, and Needs review should match its holder guidance. Make the on-chain claim true by keying approvals to the reviewed code hash. Give each status change its own signed notice and vote. With those three fixed, every answer the oracle gives would be one the board itself would sign.
