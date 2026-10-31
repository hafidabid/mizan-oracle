# UX and information architecture review: Mizan (round 3)

**Score: 78/100.** This round fixed most of what I raised in round 2: the status words are now the same everywhere, the header CTA serves the reader, the demo links are labelled, and the layout seams are closed. Two things cost it points. The longer 3D scroll tracks make desktop the longest it has ever been, and the register table got harder to scan.

## What works

- **One word per state, everywhere.** The hero chooser now uses the real status names, "Active · Expired · Withdrawn · Closed", with the product type underneath (`Hero.tsx:8-14`; the code comment states the intent). The validity column uses the same verb as the tag: "Expired 30 Jun 2025", "Under review since…", "Replaced…" (`lib/dates.ts:36-49`). What you learn in the hero is now exactly what you filter by in the register. This was my top round-2 issue, and it is fixed.
- **Header CTA and audience routing fixed.** The header CTA is "Browse records" again (`Nav.tsx:61`). "Request a review" now lives in Next steps with an honest "Demo: this opens an email to a placeholder address" note (`Request.tsx:16`). The scholar links now go to `#how` ("Scholars: method and board"), so the method comes first and the board follows.
- **The Withdrawn row explains itself.** "Withdrawn 14 Aug 2026, void from issue" (`desktop/02-y1620.png`) resolves the round-2 two-dates confusion. The sheet's Provenance block now lists each signed status entry (entry, date, block, transaction) and marks the report "MZN-001.pdf (demo, not hosted)" (`desktop/modal-bottom.png`). That makes it honest and connects it to "Verify a record yourself", which is now step-by-step per entry.
- **The seams are closed.** The §2 and §3 sticky panels are now separate cards (`desktop/05-y4050.png`). In static mode §3 has art in the right column and its slider tick lines up with the period end (`desktop-no3d/04-y3240.png`). On mobile the type filter becomes a select (`global.css:246`, `mobile/02-y1519.png`). The nav strip fades at the right edge and scrolls the active link into view (`global.css:113`, `Nav.tsx:38-43`).
- **Mobile is now the tightest version.** It is 11.7 screens (was 12.8). The reasoning in the sheet and the builders' "Fields"/"Verify" sections start folded on phones (`RecordModal.tsx:29,156`, `Builders.tsx:100-115`). Long reference material shows up only when asked for, which is right on a small screen.
- **Less duplication.** §2 step 2 now says "Their findings go to the three voting scholars (see §4)" (`data/reviews.ts:217`) instead of listing the roles again. §4 adds each member's school of law, which a scholar will look for.

## Problems

### High

1. **The longer 3D tracks are the wrong trade for the reader.** Desktop with 3D grew from 9.3 to 11.3 screens (`report.json`). The tracks are now 260vh and 190vh (`global.css:176-177`), about 4.5 screens of pinned panels for two ideas: five steps of a review, and "an approval expires". Each §2 step now gets about 0.5 screens of scroll. In `desktop/03-y2430.png` through `05-y4050.png` the panel is identical apart from the active step, so the reader scrolls a full screen to change one paragraph. The static page carries the same content in 8.4 screens.

   Because the register leads, the cost does not fall on the core task. It falls on the two audiences who need what comes after: scholars heading for §4 and builders heading for §5, who must scroll through about 5 screens of scroll-jacked panels or know to use the nav.

   Giving each step time to land is a fair motion goal. It should be met with a shorter dwell per step (around 35–40vh) plus snap points, not with more track. From the reader's side this is a regression.

### Medium

2. **The register table got harder to scan.** The Record column is now so narrow that names wrap to 3–5 lines ("Sample / Bridge D / March / 2026 / release", `desktop/02-y1620.png`). Meanwhile Validity and Board conclusion take up roughly 40% of the width. Rows are about 115 px tall (they were about 90 px), so only 3 records fit above the fold (`desktop/01-y810.png`, was 4). The record name is the thing a visitor scans for, and it is now the least readable column. Give Record `min-width: 200px` or `white-space: nowrap` on the name, put the version on its own line, and narrow Validity.
3. **The conclusion column dropped its "why", so it reads as approved at a glance.** For Expired, Needs review and Replaced, the conclusion is now a bare grey "Approved" with no icon and no note (`Status.tsx:50-52`, `desktop/02-y1620.png`: MZN-004 "Needs review … Approved"). Status-first is the right model, but the only thing separating "✓ Approved" (green) from "Approved" (grey) is colour and a missing tick. Anyone scanning the conclusion column, or reading it in grayscale or with low colour vision, sees four approvals. Add back a quiet suffix ("not in force"), or show these in the same struck or neutral treatment used for Withdrawn, with the tag doing the explaining.
4. **The same row says things twice.** In the Withdrawn row, "Withdrawn 14 Aug 2026, void from issue" (validity) sits next to "~~Approved~~ void, withdrawn 14 Aug 2026" (conclusion). In the Closed row, "Not approved" appears in both columns (`desktop/02-y1620.png`). One cell should carry each fact. Use "—" or "No review period" for Closed validity, and drop the date from the conclusion note.

### Low

5. **On desktop the Solidity snippet is clipped on the right.** `uint64 asO…`, `bytes32 recordId…` and `IMizanOracle.Ru…` are all cut off (`desktop/09-y7290.png`). It is the first thing a builder reads. Wrap the lines or reformat the signature over several lines.
6. **"The board's reasoning" disclosure looks like a link heading.** It is blue and bold, with no visible chevron (`desktop/modal.png`), and on desktop it starts open, so its fold-ability is invisible. Use the same "+/−" affordance as the builders' `.ref` sections (`global.css:322-323`).
7. **The rule renaming spreads across surfaces.** The rule is now called "Approved when acquired" (with an `asOf` date), and a "Not checked" tab was added in the sheet. The sheet has three rule tabs, but the §5 matrix shows only two (`desktop/09-y7290.png` against `desktop/modal-bottom.png`). That is defensible, but say in the matrix caption that "Not checked" always returns null.
8. **The §3 tick labels collide in 3D mode.** "Ends 12 Oct 2027" and "Feb 2028" sit almost on top of each other (`desktop/06-y4860.png`).
9. **The §-number gutter costs width.** The new left gutter on the doc sections (`desktop/08-y6480.png`, `09-y7290.png`) narrows the content by about 120 px without adding information, and it pushes the builders' code into the clipping in item 5.

### What got worse since round 2

- Desktop (3D) length grew from 9.3 to 11.3 screens.
- Register rows are taller, with names wrapping, so 3 rows are visible instead of 4.
- The "not current / suspended" annotations on non-current approvals were removed without a replacement.

## Top 5 recommendations (ranked by score impact)

1. **Pace the tracks with less length.** Cut §2 to about 150vh and §3 to about 110vh. Add CSS scroll-snap or a "settle" to each step so each still gets its moment. Add a visible "Skip to Who decides ↓" link inside the pinned panels. Target ≤9 screens on desktop with 3D.
2. **Rebalance the register columns.** Make Record the widest text column and keep names on one line (version beneath in muted text). Cap Validity at about 180 px and Board conclusion at about 160 px. Let Scope wrap. Aim for rows of about 80 px and at least 5 records above the fold at 1440×900.
3. **Bring back a non-colour cue on approvals that are not in force.** Use a short muted suffix ("not in force") or an outline treatment for Expired, Needs review and Replaced, so the conclusion column cannot be misread on its own.
4. **Say each fact once per row.** Closed validity becomes "—". The Withdrawn conclusion becomes "~~Approved~~ void" (the date stays in validity). Check the mobile cards follow the same rule.
5. **Builder polish.** Reformat the Solidity signature over several lines so nothing clips. Explain in the matrix caption why the "Not checked" rule is not shown. Give "The board's reasoning" a proper disclosure affordance.

## What would get this to 85+

The IA and vocabulary are now sound. What remains is efficiency. The 3D tracks should give each step its moment through snapping rather than extra length, so desktop is no longer than the static page plus a screen or two. The register should scan as fast as a good fintech table: one-line names, at least 5 rows above the fold, and one fact per cell. Fix those and the remaining polish, and this is excellent work that holds up next to a top-studio register.
