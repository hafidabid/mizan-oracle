# Trust, fintech credibility and Islamic-finance fit: round 1

## Score: 66/100
The two-axis model (conclusion vs status) is the right foundation and the references are accurate, but the Withdrawn state, purification and provenance are not yet at a level a Sharia scholar or compliance officer would sign off on.

## What works
- **Conclusion and status are kept apart, and the copy holds to that throughout.** Register columns, the modal's two boxes, the §2 sunset demo and the oracle's `boardConclusion` / `reviewStatus` split all say the same thing. Status is shown as a filled tag with an icon and comes first, and a non-current conclusion drops to neutral ink with "(historic)" (`Status.tsx:19-28`, `t-register.png`). Most Sharia-certificate products get this wrong.
- **The AAOIFI references are accurate.** SS 1 Trading in Currencies, SS 9 Ijarah, SS 12 Sharikah, SS 13 Mudarabah, SS 17 Investment Sukuk, SS 19 Qard, SS 21 Financial Paper and SS 38 Online Financial Dealings all match their real numbers and titles (`reviews.ts:52-61`). The mapping is mostly plausible: qard for the lending pool, ijarah for the rent vault, mudarabah for the profit-share vault.
- **The governance posture is correct.** "Reviews and conclusions, not fatwas", "advisory and not a regulator", "other boards may reach different conclusions", a flat fee agreed before the review, a no-holding rule, and scholars vote while technical and economic reviewers only advise (`WhoDecides.tsx:4-19, 55-70`). A three-member voting board also fits AAOIFI's governance minimum.
- **Dissent is shown, not hidden.** MZN-003 passes 2–1 with a published dissent whose substance is right: thin counterparty disclosure could hide fixed-return receivables. Showing a split vote builds more credibility than eight unanimous votes would.
- **The Qur'an citation is correct and handled with respect.** The Arabic of 55:7–9 is accurate and fully voweled, the translation is a faithful Sahih International text with attribution, `lang="ar" dir="rtl"` is set, and the text renders cleanly (`Footer.tsx:7-15`, `desktop/10-y8100.png`). The scale-and-star seal and the paper-cut minarets and arches use Islamic visual language without kitsch.
- **Scope and exclusions are first-class.** "Not covered" sits beside "Covered" on every record, and the bridge record correctly excludes the very upgrade that triggered Needs review.

## Problems

**High: a Withdrawn record still shows "✓ Approved (historic)".** On MZN-006 the conclusion box shows a check mark and the word Approved (`t-006-top.png`, `t-register.png` row 006). `ConclusionText` treats Withdrawn like Expired and Replaced (`Status.tsx:21`). Withdrawal means the board retracted its conclusion (rujūʿ) because the facts it relied on were false. The record says "Treat it as void", yet the most prominent glyph in the box is a check. A compliance officer would block this. The claim that "the board's conclusion does not change" is also untrue for Withdrawn, because withdrawal is the board changing its conclusion.

**High: the Withdrawn ijarah record gets the Sharia substance wrong.** MZN-006 was withdrawn because "leased assets were never transferred" (`reviews.ts:122`). The lessor never owned the assets, so the ijarah was defective from the start, not from 14 Aug 2026. Yet the record says Not covered: "All activity after the withdrawal date" (`reviews.ts:125`), which implies earlier income was fine, and Purification: "Not required" (`RecordModal.tsx:111`, `t-006-top.png`). Any scholar would first ask what investors should do with rent already received. The page gives no answer and in effect says nothing needs to be done. This is the record investors most need guidance on.

**High: a riba product shows a green "✓ Requirement met".** With the "No review required" rule, MZN-005 (the record that says "This is riba") shows a green check and "Requirement met" (`t-005-none.png`, `rules.ts:29`). The explanation text is technically accurate, but the visual says compliant, and the sheet is a Sharia record. The tone is wrong, and someone will screenshot it.

**Med: the oracle payload contradicts its own spec and is unsafe for integrators.**
- The `FIELDS` table says "validFrom / validUntil … Null when there was no approval" (`Builders.tsx:11`), but the Rejected MZN-005 returns `"validFrom": "2026-05-10"` (`rules.ts:75`, `t-005-json.png`).
- Withdrawn MZN-006 returns `validUntil: "2026-11-20"`, a future date, for a void approval. A naive contract that checks `validUntil > now` would accept it.
- The payload has no `statusChangedAt`, `supersededBy`, `purification`, `dissent`, `scope` or `excludes`. Investors and screening apps need purification most of all.

**Med: provenance is shown but cannot be verified.**
- The verification steps say "Fetch the full report from the record's report link", but the response has no `reportUrl` field (`Builders.tsx:85`).
- The signature is truncated with "…" (`rules.ts:85`).
- `anchoredAt` gives a block but no transaction hash or registry contract address.
- Step 3 says "board key published on this page", but the key appears only inside the JSON.
- Most important: it never says who signs a **status change** (withdrawal, Needs review) or whether status changes are anchored too. Status is the field the site says matters most, and its provenance is undefined.
- There is one board key and no per-member signature, which does not match "who decides".
- "Smart contracts read it through the oracle" (`Hero.tsx:29`), but only a REST GET is shown (`rules.ts:93`). There is no on-chain read interface.

**Med: methodology claims are not backed by the data.**
- "A record notes where the schools differ" (`WhoDecides.tsx:50`), but no record has a madhhab field or any note on differences between schools.
- "Recusals are noted on the record" (`WhoDecides.tsx:61`), but there is no recusal field.
- The withdrawal decision has no vote, date of decision or notice; the 3–0 shown on MZN-006 is the original approval vote.
- A scholar who reads §4 and then opens a record will see the gap at once.

**Med: the legal characterisation (takyīf fiqhī) is missing, and some standard mappings are stretched.** A scholar's first question is what contract this is.
- Records list screens and standards but never state the characterisation: is the token māl? Is the LP position a sharikat al-milk? Is a swap a sarf?
- Applying SS 1 (currencies) to the swap pool and bridge quietly assumes that tokens are thaman (currency), which is a contested position, and it never addresses spot settlement (taqābuḍ).
- SS 21 (shares and bonds) for a *utility* token is a weak fit.
- No record admits that AAOIFI has no settled standard for crypto-assets. Saying so openly would increase credibility, not reduce it.

**Med: the screens are too thin for a Sharia review.**
- Only riba, gharar and maysir are screened. There is no screen of the underlying activity (impermissible sectors), and no financial-ratio screen of the kind SS 21 actually prescribes (interest-bearing debt and impermissible income thresholds).
- Purification has no stated base or method. "1.8% of distributions" of what, and computed how?
- Purification wording is inconsistent: "0% (no non-compliant income identified)" on MZN-002 against "Not required" elsewhere.

**Low: Needs review uses the "info" (blue) tone** (`reviews.ts:156`), but the validity column says "Suspended since…" (`dates.ts:43`). A suspended approval reads as warning, not information.

**Low: the hero scale carries the wrong signal for stale records.** The caption says "The scale stays level for any approved product" (`Hero.tsx:89`), so Expired and Withdrawn approvals sit visually "in balance". Using Qur'anic mizan imagery as the badge of compliance for a voided product is a poor fit.

**Low: "Rejected" as a status duplicates the "Not approved" conclusion.** It muddies an otherwise clean two-axis model. A status such as "Closed" or "Final", with resubmission allowed, would keep the axes clean.

**Low: the Arabic and transliteration need small fixes.**
- The ۝ end-of-āyah marks in the footer have no verse numbers inside them, and the final verse has no closing mark (`Footer.tsx:10`). Use ﴿…﴾ or ۝ with ٧ ٨ ٩.
- "Sharia" and "Shariʿah" are mixed, and "Surat al-Rahman" lacks the ḥ that the other transliterations carry.
- AAOIFI's own term is "Shariʿah Supervisory Board".

**Low: the Qur'an sits directly above a legal disclaimer in the footer.** Some readers will find this placement casual. Consider giving it its own short band, or placing it next to the brand explanation.

## Top 5 recommendations (ranked by score impact)
1. **Model withdrawal as a retraction.** For Withdrawn, render the conclusion as "~~Approved~~ Retracted 14 Aug 2026", with no check icon and the bad tone. Add `retractedAt`, a withdrawal vote and an `effectiveFrom` field. For MZN-006, set `effectiveFrom` to the issue date, because the defect existed from the start. Change "The board's conclusion does not change" to "…does not change, except by withdrawal".
2. **Give every non-Active record an investor action block.** Answer "What should a holder do?" with exit guidance and a purification instruction for income already received, including the base, the method and who calculates it. Apply this to Withdrawn (purify all rent received), Needs review (hold or do not add) and Expired. Make purification consistent: a percentage, a base and the governing standard (for example SS 21's purification rules), or "None identified".
3. **Fix the oracle contract.**
   - Return `validFrom` and `validUntil` as null for NOT_APPROVED, and set `validUntil` to the retraction or suspension date for WITHDRAWN and NEEDS_REVIEW.
   - Add `statusChangedAt`, `supersededBy`, `purification`, `scope`, `excludes`, `hasDissent` and `reportUrl`.
   - For the NONE rule, return `requirementMet: null` (not checked) and show a neutral "Not checked" in the UI instead of a green check.
   - Show a tiny Solidity read interface, for example `isAccepted(recordId, rule) returns (bool, Status)`.
4. **Make provenance end to end.**
   - Publish the board key and the registry contract address as visible text in §5.
   - Show a full (demo) signature and a transaction hash.
   - State what bytes are signed.
   - State that status transitions are separately signed and anchored, with their own hash.
   - Show a per-record "Verification" row in the modal: report hash ✓, signature ✓, anchored tx.
5. **Back the scholar-facing claims in the data.**
   - Add a takyīf line ("Characterised as: sharikat al-milk among LPs; swaps as spot exchange"), a madhhab-differences note (at least one record should have one), and a recusal field.
   - Add an activity screen and the SS 21 ratio screen.
   - Add one sentence acknowledging that there is no dedicated AAOIFI crypto-asset standard, and that the standards cited are applied by analogy.

## What would get this to 85+
The Withdrawn state must read unmistakably as void, both visually and in the payload. Every lapsed or voided record must tell investors what to do with income already received, including purification with a stated basis. The oracle response must be internally consistent and verifiable end to end, including signed status transitions. Finally, the records need the fiqh substance a scholar looks for (characterisation, madhhab notes, activity and ratio screens), so that the methodology in §4 is visibly carried out in each record rather than only asserted.
