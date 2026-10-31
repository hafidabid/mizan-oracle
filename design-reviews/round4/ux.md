# UX and information architecture review: Mizan (round 4, final)

**Score: 81/100.** Mizan now reads as a real fintech register with a clear spine. You can see what it is in seconds, the table scans quickly, every record is a linkable, verifiable document, and the status vocabulary is the same on every surface. What still holds it in the low 80s: the 3D desktop page runs about two screens longer than its content needs, and the builder reference does not quite fit on a phone.

## What works

- **The register now scans like a good fintech table.** The Type column was folded into the record line ("MZN-004 · Token / Sample Bridge D March 2026 release"). Names stay on one line (`global.css:275-276`), and rows are about 70 px tall, so 6 of 8 records sit above the fold at 1440×900 (`desktop/01-y810.png`); round 3 showed only 3. Status, validity and conclusion read left to right in the order the page teaches.
- **One fact per cell, with a non-colour cue on every state.** Approvals that are not in force now read "Approved · not in force" (`Status.tsx:52-56`). Withdrawn reads "~~Approved~~ void", with its date only in the validity cell ("Withdrawn 14 Aug 2026, void from issue"). Closed validity is "—". The conclusion column can no longer be misread on its own, in colour or in grayscale (`desktop/01-y810.png`, `mobile/02-y1519.png`).
- **The vocabulary and routing hold across all four rounds of change.** The hero chooser uses the real status names, and the header CTA is "Browse records". The scholar links go to the method first, then the board. Next steps gives issuers, scholars and builders one action each, and the demo email is labelled as a placeholder. The spelling is now "Shari'ah" throughout the copy.
- **The record sheet is complete without being overwhelming.** It has a sticky bar (record, status, copy link, close) and a properly signalled "The board's reasoning – Hide" disclosure (`desktop/modal.png`). Provenance includes the reviewed code hash ("an upgrade changes this hash, and the on-chain check stops matching") and a per-entry history with vote, block and transaction (`desktop/modal-bottom.png`). For a scholar or an auditor, this is the strongest surface on the site.
- **The builder reference is now readable and honest.** The Solidity signature is reformatted across several lines with nothing clipped on desktop (`desktop/08-y6480.png`). The rule matrix gives graded answers ("Yes, up to a date", "Hold, do not add"), and its caption explains `coveredThrough`, `HOLD_DO_NOT_ADD` and why "Not checked" is left out. A builder can implement from this page.
- **The 3D tracks are shorter and have an exit.** The tracks are down to 210vh/150vh (`global.css:178-179`), and §2 has a "Skip to who decides" link inside the pinned panel (`desktop/03-y2430.png`). The colliding "Feb 2028" tick label is gone (`desktop/05-y4050.png`).

## Problems

### Medium

1. **The 3D desktop page is still about 2 screens longer than its content.** It is 10.1 screens with 3D, against 8.2 for the same content in static mode (`report.json`). That is better than round 3 (11.3), but still longer than round 2 (9.3). §2 still spends about 0.4 screens of scroll per step on a panel whose only change is one paragraph (`desktop/03-y2430.png` against `04-y3240.png`). The new skip link mitigates this but does not remove it. It also exists only in §2 (`HowSection.tsx:107`); §3 has no "skip" (`desktop/05-y4050.png`), so a builder heading for §5 still scrolls through about 1.5 pinned screens of the hourglass.
2. **The builder reference is clipped on phones, with no sign that it scrolls.** At 390 px the Solidity block is cut off on the right (`IMizanOracle.Rule.CURRENT,…`). The rule matrix truncates its answers to "Yes, up to a da…" and "Hold, do not ac…" (`mobile/09-y6836.png`). Both scroll sideways, but nothing shows that they do, and the matrix is exactly where a builder reads the answer. On mobile, stack the matrix as one card per status, or abbreviate the cells and footnote them.
3. **The rule model grew more complex than its first explanation.** The sheet still has three binary tabs, "Current approval · Approved when acquired · Not checked", each ending in "Requirement met / not met" (`desktop/modal-bottom.png`). The §5 matrix now uses three-valued answers ("Yes, up to a date", "Hold, do not add"). A visitor who learns the rules in the sheet sees a different answer shape in §5. Under "Approved when acquired" the sheet's verdict should show the same graded wording as the matrix.

### Low

4. **On mobile, the Closed card's lone "—" in the top-right reads as a collapse control** (`mobile/02-y1519.png`). Hide the validity slot for Closed records on cards; the conclusion "✕ Not approved" already says it.
5. **The provenance table in the mobile sheet wraps badly.** The date breaks over three lines ("12 / Oct / 2026") and the transaction hash over two (`mobile/modal-bottom.png`). Use a stacked key/value list on phones.
6. **The §-number gutter on the doc sections costs about 120 px of width** (`desktop/06-y4860.png`, `08-y6480.png`). It now leaves a large empty left column under the code in §5 (`desktop/09-y7290.png`). It is a stylistic choice, but it is the main reason §5 feels long.
7. **"Try the rules on a withdrawn record" is the only call to action at the end of §5** (`desktop/09-y7290.png`). For builders, a "Copy interface" or "Download ABI (demo)" action would close the loop better than reopening the sheet.

### Regressions since round 3

- None of substance. The page is about 1.2 screens shorter on desktop with 3D (11.3 → 10.1) and slightly shorter on mobile (11.7 → 11.5). On mobile, the code and matrix clipping is more visible now that the matrix has longer cell text (item 2).

## Top 5 recommendations (ranked by score impact)

1. **Bring the 3D page to within about one screen of static.** Cut §2 to about 150vh with scroll-snap per step, and §3 to about 110vh. Add the same "Skip to who decides ↓" link to the §3 panel.
2. **Make §5 work on a phone.** Render the rule matrix as status cards ("Expired: Current approval ✕ · Approved when acquired: yes, up to its effective date"). Soft-wrap the Solidity block, or show a "scroll →" edge fade on `pre.code` and `.table-wrap`.
3. **Use one answer shape for the rules.** In the sheet, under "Approved when acquired", show the matrix's graded verdict ("Yes, up to 30 Jun 2025" / "Hold, do not add") instead of a plain "Requirement met / not met".
4. **Tidy the mobile sheet and cards.** Show provenance as a stacked list on phones. Leave the validity slot out of Closed cards.
5. **Give §5 a builder-grade exit.** Add a "Copy interface" button on the code tabs and a demo ABI/JSON download, and optionally reduce the gutter to recover width.

## What would get this to 85+

The structure, vocabulary and record design are now at the level of a professional product. What remains is efficiency on the two ends of the page. Desktop with 3D should cost no more than a screen beyond the static reading. The builder section should be as usable on a phone as the register already is. One consistent answer shape for the application rules would remove the last conceptual seam.

## Remaining issues worth fixing (ranked by impact)

1. **Shorten the 3D tracks and add a skip link to §3.** About 10.1 screens against 8.2 static; §3 has no exit (`global.css:178-179`, `HowSection.tsx:107`).
2. **The §5 rule matrix and Solidity block are clipped on phones with no scroll cue.** The answer cells read "Yes, up to a da…" (`mobile/09-y6836.png`).
3. **The application rule answers differ between the sheet (met / not met) and the §5 matrix (yes, up to a date / hold, do not add)** (`desktop/modal-bottom.png` against `desktop/08-y6480.png`).
4. **The mobile sheet's provenance table wraps dates and hashes over several lines** (`mobile/modal-bottom.png`).
5. **The Closed card's lone "—" reads like a control on mobile** (`mobile/02-y1519.png`).
