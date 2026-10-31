# Trust, fintech credibility and Islamic-finance fit: round 2

## Score: 78/100
This is now strong, credible work. The Withdrawn, Not checked and purification failures from round 1 are fixed properly, and the records now carry real fiqh content. What keeps it below 80 is demo provenance that looks fake on inspection, one chronology error in the data, and a Replaced record that contradicts itself.

## What works
- **Withdrawal is now modelled as a retraction.**
  - The conclusion is struck through ("~~Approved~~ retracted 14 Aug 2026") with no check icon (`Status.tsx:38-44`). The sub-line shows both votes: "Approved 3–0; retracted 3–0. Void from 20 Nov 2025."
  - The scope now reads "Everything. The approval is void from the date of issue."
  - The fiqh reasoning is right. The vault never owned the assets, so there was no valid ijarah; the "rent" was in effect a fixed return on capital, which is riba. Purification is 100% of distributions since issue (`reviews.ts:139-151`, `r2-MZN-006.png`).
  - The rule text changed from "the conclusion never changes" to "…except by withdrawal" consistently (`rules.ts:28`, `RecordModal.tsx:273`, `Builders.tsx:9`). This was the single most important fix, and it is done well.
- **Investor guidance exists for every non-Active record, and it is correct.**
  - Expired: income during the period stands after purification; income after 30 Jun 2025 is unreviewed.
  - Needs review: hold, do not add.
  - Not approved: exit and give any interest to charity, which is the standard ruling.
  - Withdrawn: exit and purify everything.
  - The hero card turns each one into a plain verdict ("Do not rely on this approval today", `Hero.tsx:82`).
  - Purification now states a base and a method. MZN-003 links its 1.8% to interest earned on a deposit buffer, recalculated quarterly, and the activity screen states that source.
- **The "Not checked" rule is handled correctly.** It returns `requirementMet: null` with a neutral info icon, and the text says "It does not mean the product is compliant" (`rules.ts:30`, `r2-MZN-005.png`). The rule matrix shows only the two checking rules.
- **The oracle payload is now internally consistent for the cases that matter.**
  - Not approved: `validFrom` and `validUntil` are null (`rules.ts:102-103`).
  - The new `effectiveUntil` field gives the real end date. For Withdrawn it equals `voidFrom` (the issue date), and the docs say "Use this, not validUntil".
  - New fields: `statusChangedAt`, `supersededBy`, `scope`, `excludes`, `hasDissent`, `purification`, `reportUrl` and `tx`.
  - The signature is a full 65 bytes, and the signed message is stated (`Builders.tsx:126`).
  - There is a Solidity `isAccepted` interface whose comment says it never returns true for NOT_APPROVED, NEEDS_REVIEW or WITHDRAWN. That matches `RULE_MATRIX`.
- **Records now contain what a scholar looks for.**
  - Each record states its legal characterisation (takyīf): māl mutaqawwam for the token, sharikat al-milk for the pool, mudarabah for the vault, wadīʿah plus ujrah for the bridge, qarḍ with a stipulated increase for the lending pool, and a failed ijarah for MZN-006.
  - There is an activity screen, a recusal field and a note on the ṣarf/taqābuḍ question.
  - Every record labels its standards "applied by analogy", and §4 says plainly that AAOIFI has no dedicated crypto-asset standard (`WhoDecides.tsx:67`). That honesty raises trust.
- **Respectful handling of the Arabic and the āyah.** The Qur'an now has its own band, apart from the legal disclaimer. Āyah numbers are in ornate brackets (﴿٧﴾ ﴿٨﴾ ﴿٩﴾), and the citation reads "Sūrat al-Raḥmān", with full diacritics (`Footer.tsx:6-17`, `desktop/09-y7290.png`). The hero scale is level only while an approval holds (`Hero.tsx:107-108`).

## Problems

**Med-High: the demo provenance looks fake to anyone who reads hex.**
- `demoHex` seeds on `rec + suffix`, and every record starts with "MZN-00". As a result, every record's `reportHash`, `signature` and `tx` share the same first 48 hex characters: `c80bfd182ddfb0796022508b11051661200227cf5d64ee8e…`.
- Every record is also anchored at the same block, 18,460,269, including records issued two years apart (2024-06-30 and 2026-10-12).
- The modal's shortened forms make this visible at a glance: every record shows `sha256:c80bfd182…` and `tx 0xc80bfd18…` (`rules.ts:56-64, 79-87`, `r2-MZN-005.png` against `r2-MZN-006.png`).
- A builder or auditor will read this as mocked provenance, not demo provenance. It undercuts the section that is meant to carry the trust argument.

**Med: the status-change attestation is described but not delivered.**
- The modal says the status was "signed … as a separate signed and anchored entry" (`RecordModal.tsx:252`), and FIELDS repeats it.
- But the payload has a single `signature` and a single `anchoredAt.tx`. There is no signature or transaction for the status entry; `statusSignedAt` is only a date.
- The verification step signs `keccak256(recordId, reportHash, reviewStatus, statusChangedAt)`. So the one signature covers the *current* status, which means it is not the original approval signature. A verifier cannot check the history (approve, then withdraw) from this payload.

**Med: MZN-002 cites approvals that did not exist yet.**
- The pool was approved on 18 Jan 2026. Its activity screen says "Both pooled assets are themselves approved (MZN-001, MZN-008)" (`reviews.ts:94`).
- MZN-001 was issued 12 Oct 2026 and MZN-008 on 20 Jul 2026, so the reasoning depends on future records.
- A compliance officer reading dates will spot this, and it damages trust in the whole register.

**Med: the Replaced record contradicts itself.**
- MZN-007's holder guidance says "Version 1 holdings remained approved until 20 Jul 2026" (`reviews.ts:163`), and `effectiveUntil` is 2026-07-20, which FIELDS says to use instead of `validUntil`.
- Yet the "Approval on record" rule returns `requirementMet: true` today (`r2-MZN-007`).
- The same tension exists for Expired. FIELDS says to use `effectiveUntil`, while the on-record rule accepts records whose `effectiveUntil` has passed.
- Either the on-record rule needs a defined meaning (for example "was approved at the time of acquisition", which implies an `asOf` parameter), or the guidance must say `effectiveUntil` is informational for that rule.

**Med: the madhhab note is mislabelled and thin.**
- "Where the schools differ" appears on only one record, and its content is a contemporary characterisation question (are tokens thaman?), not a difference between schools (`reviews.ts:95`).
- There is a real classical anchor available: the disagreement over whether fulūs carry thamaniyyah, which divides the Ḥanafī and Shāfiʿī/Mālikī positions and the reports within the Ḥanbalī school. Naming it would make the note credible.
- §4 still claims voting members come from "at least two schools", but the seat table names no school per member (`WhoDecides.tsx:4-10, 41`).

**Low-Med: some standards still do not match the characterisation.**
- MZN-004 is characterised as wadīʿah with a fee (ujrah), but cites SS 1 (currencies) and SS 38. A paid custody service fits ijarah of services better: SS 9, or SS 34 (hiring of persons).
- MZN-001 still cites SS 21 (shares and bonds) for a utility token. Now that the record says māl mutaqawwam and "spot sale", the SS 21 citation looks borrowed rather than reasoned.

**Low-Med: purification in the payload is free text.** The value `"100% of all distributions received since 20 Nov 2025"` cannot be parsed. Screening apps need `{ rate, base, from, method }` as fields, which the data model already has (`reviews.ts:52`, `rules.ts:111`).

**Low: the Solidity interface is keyed by `productId` with no version binding.** Approvals are per version. The key should be the contract address or code hash, so an upgraded contract (as in MZN-004's case) automatically misses. Also, the hash encoding (`abi.encode` or `encodePacked`) is unspecified in the verification step.

**Low: smaller fiqh points.**
- The board stamps the same seal on a void record without any "VOID" mark (`Seal.tsx`, `r2-MZN-006.png`).
- The recusal on MZN-004 is by a non-voting technical reviewer, which is the least meaningful case to showcase. Show a voting member's recusal instead.
- MZN-003's riba screen says "a share of profit, not a fixed rate", while its activity screen reports interest income. Mention the de-minimis tolerance in the riba line.
- MZN-006's "100% of all distributions" should say whether any portion was return of capital, which would not need purifying.

**Low: wording inconsistencies remain.**
- "Sharia" and "Shariʿah" are still mixed: hero and notices against §4, the attestor and the footer. The seal says "SHARIA BOARD" while the payload says "Shariʿah Supervisory Board".
- "AAOIFI has no dedicated standard for crypto-assets yet" needs an "as of" date, because AAOIFI has been working on digital-asset guidance.

## Top 5 recommendations (ranked by score impact)
1. **Make the demo provenance look real.**
   - Seed `demoHex` with a proper hash of the full seed (for example `crypto.subtle` SHA-256 precomputed into the data, or FNV over a reversed seed) so values differ from the first character.
   - Derive the block from the issue date, so older records sit in older blocks.
   - Expose a `history` array, each entry `{ status, at, signature, tx }`, so approval and withdrawal are separately verifiable. Make the verification steps refer to it.
2. **Fix the MZN-002 chronology.** Either move the pool's issue date after 20 Jul 2026 and 12 Oct 2026, or cite an earlier record, or describe the assets without record numbers. Then add a build-time check that every cross-referenced record was issued no later than the record that cites it.
3. **Define the on-record rule precisely.**
   - Add an `asOf` (acquisition date) parameter. "On record" then means approved and effective at `asOf`.
   - Align the MZN-007 holder text and FIELDS so `effectiveUntil`, the rule and the guidance all say the same thing.
4. **Ground the scholarly layer.**
   - Rename the field to "Points of difference". Anchor it in the classical fulūs/thamaniyyah disagreement, and add one more record with a madhhab note.
   - List each voting seat's madhhab in §4.
   - Re-map MZN-004 to SS 9 or SS 34, and drop or justify SS 21 on MZN-001.
5. **Make purification machine-readable and mark void seals.**
   - Return `purification: { rate: 1.0, base: "distributions", from: "2025-11-20", method }`.
   - Overprint a "VOID" band on the seal for Withdrawn records.
   - Use one spelling throughout ("Shariʿah" in formal labels).

## What would get this to 85+
The status model, investor guidance and fiqh content are now credible. What remains is mostly the integrity of the evidence. Provenance has to look like real cryptographic output, with a separately signed and anchored entry for each status change. Cross-references have to respect chronology, and every field, rule and holder instruction has to give the same answer for Replaced and Expired. With those fixed, plus a madhhab note grounded in a real classical disagreement, a Shariʿah compliance officer could use this as a reference design.
