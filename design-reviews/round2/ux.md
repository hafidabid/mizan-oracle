# UX and information architecture review: Mizan (round 2)

**Score: 76/100.** This is now a real register with a clear spine: the product is the second thing you see, every record has its own link and can be checked against its provenance, and each audience has a next step. What holds it below 80 is the length (barely shorter than before), a status vocabulary that has split into near-synonyms, and a handful of rough edges in the 3D and mobile layouts.

## What works

- **The register leads.** The section order is now hero, then §1 Register, then the explainers (`App.tsx:81-88`). The register header sits at about 980 px on desktop, a little over one screen down (`desktop/01-y810.png`), where it used to be at about 4,790 px. The status legend is collapsed behind "What each status means" (`Register.tsx:72-84`), so the table opens on data: 4 rows above the fold on desktop, and the first card directly under the filters on mobile (`mobile/02-y1519.png`).
- **The hero teaches the model by outcome.** The chooser is now "Current · Lapsed · Retracted · Not approved", with the product type underneath (`Hero.tsx:6-11`). It adds a plain-language answer ("The approval holds today." / "Do not rely on this approval today."), and the scale is level only while an approval holds (`Hero.tsx:107-108`). The biggest visual on the page now follows the same rule as the copy. A first-time visitor gets the whole idea in about 5 seconds (`desktop/00-y0.png`).
- **The record sheet is now an addressable, verifiable document.** `#record/MZN-006` deep-links straight to the record, Back steps out, there is a "Copy link" action, and a sticky bar keeps the record number, status and close button in view (`App.tsx:19-66`, `desktop/modal-bottom.png`). A Provenance block shows the board key, report, hash, anchoring transaction and the separately signed status entry. That closes the round-1 gap between "verify a record yourself" and what a visitor can actually see.
- **"What holders should do" is the best piece of fintech UX on the page.** For MZN-006 it says: "Exit. Purify all distributions received since issue. The approval is void, not just ended." (`scratchpad/r2-m006.png`). The status, the two votes, the void-from date, the purification rate and method all agree. This turns a status into an action.
- **The conclusion is drawn differently for each status.** Struck through and marked "retracted" for Withdrawn, "suspended" for Needs review, "not current" for Expired and Replaced (`Status.tsx:28-57`). Renaming Rejected to Closed, and putting it back in the rule matrix, fixes the round-1 overlap between status and conclusion. Removing the all-ticks column cleans up the matrix (`desktop/07-y5670.png`).
- **Navigation and conversion are fixed.** On narrow screens a scrollable section strip replaces the hidden nav (`global.css:112`, `mobile/00-y0.png`). The "Demo" flag now shows at every width. A "Next steps" section gives one CTA each to issuers, scholars and builders (`Request.tsx`, `desktop/09-y7290.png`), and the footer now repeats the nav.

## Problems

### High

1. **The page is barely shorter, and the explainers after the register still repeat each other.** Desktop is 9.3 screens (was 9.8), mobile 12.8 (was 13.1), and the static/no-3D page grew from 7.7 to 8.2 screens (`report.json`). Some of the round-1 duplication is gone, but not all of it:
   - §2 step "Evidence" lists the three disciplines (`desktop/03-y2430.png`), and §4 lists the same five seats again (`desktop/06-y4860.png`).
   - §2 "Publish… Approvals last 12 months; any material change suspends them" is repeated in §4 "Changes and withdrawals".
   - §3 "An approval has a sunset" spends a whole pinned section (140vh, `global.css:173`) on one idea the hero "Lapsed" chip and the register's Expired row already show.

   Now that the register leads, everything after it is reference material. It should read like reference: dense, and faster to get through.
2. **The status vocabulary has split into near-synonyms.** One concept now goes by several words on different surfaces:
   - Expired is also called "Lapsed" (hero chip, validity column) and "not current" (conclusion note).
   - Withdrawn is also "Retracted" (hero chip), "retracted" (conclusion), "Void from" (validity) and "void" (holders).
   - Closed is also "Not approved" (hero chip and conclusion) and "No approval" (validity).
   - Needs review is also "suspended" and "Suspended since".

   The hero teaches four words (`Hero.tsx:6-11`), and only one of them ("Not approved") appears as a label in the register's status column or filter. A visitor who learned "Retracted" in the hero cannot filter for it. This is the round-1 "two axes" clarity problem coming back as a naming problem.

### Medium

3. **The Withdrawn row shows two dates that seem to disagree, with no explanation.** "Void from 20 Nov 2025" sits next to "Approved, retracted 14 Aug 2026" (`desktop/02-y1620.png`, `mobile/03-y2279.png`). Void-from-issue (ab initio) is correct and the sheet explains it ("Void from 20 Nov 2025… The defect existed from the start"), but in the table it reads as a data error. Label it "Void from issue (20 Nov 2025)", or put the retraction date in the validity cell.
4. **The primary nav CTA serves the smallest audience.** "Request a review" (`Nav.tsx:38`) is the only filled button in the header on every screen. The headline promises checking a product, and most visitors are holders or scholars. In round 1 the header CTA pointed at the register; now it points at a mailto to `reviews@mizan.example` (`Request.tsx:14`), a dead end for anyone who clicks it. Make the header CTA "Browse records" (or a search field) and keep "Request a review" in Next steps.
5. **The 3D sticky panels collide.** At y=3240 the §2 panel shows about 200 px of empty card below "Publish", and the §3 panel starts directly against it, two cards fused into one (`desktop/04-y3240.png`). It reads as a layout bug during the handoff between the two sticky sections.
6. **"Scholars: the board and method" lands on a section that no longer contains the method.** The method steps moved to §2 "How a review works", but the hero link and the Next steps button still point to `#who` (`Hero.tsx:99`, `Request.tsx:22`). A scholar arrives at the board, independence and standards, and has to find the method two sections earlier.
7. **Some report links are dead.** The sheet's `MZN-001.pdf` link calls `preventDefault` (`RecordModal.tsx:238`). Verify step 1, "Download the report from `provenance.reportUrl`" (`desktop/08-y6480.png`), therefore still cannot be done. A demo is fine, but the link should look like a demo: a "demo, not hosted" note or a disabled style, not an active-looking link that does nothing.

### Low

8. **On mobile the type filter wraps raggedly:** "Yield Vault" drops alone onto a second row inside the bordered group (`mobile/02-y1519.png`). Use a select, or let the group scroll horizontally.
9. **The mobile nav strip cuts off with no affordance.** It ends at "Who d" with no fade or arrow (`mobile/00-y0.png`). "For builders" is reachable only by guessing that the strip scrolls.
10. **The two expiry ticks in the static §3 still disagree.** The sun-arc tick and the slider tick are about 8 px apart (`desktop-no3d/04-y3240.png`), unchanged from round 1. In static desktop the §3 card also leaves the right half of the viewport empty.
11. **The Solidity comment mixes the two axes.** "Never returns true for a NOT_APPROVED, NEEDS_REVIEW or WITHDRAWN record" (`desktop/07-y5670.png`) lists a conclusion alongside statuses, while the Fields list says CLOSED. Say "CLOSED" for consistency.
12. **The 3D hero caption floats in a white box low on the canvas** (`desktop/00-y0.png`, bottom right), detached from the scale it describes.

### What got worse

- The no-3D/static page is longer (7.7 to 8.2 screens).
- The header CTA moved from the reader's task (browse) to the issuer's (request), and it now leads to a placeholder mailto.

## Top 5 recommendations (ranked by score impact)

1. **Cut the post-register explainers by about 40%.**
   - Merge §2 "How a review works" into §4, renaming it "How a review works and who decides". Put the five steps on the left and the board table on the right, and state the roles once.
   - Turn §3 into a compact strip next to the register: the slider plus the two state boxes, not pinned, at most 60vh. Alternatively, move the sunset demo into the hero card ("Move the date" on the Current record).
   - Target ≤7 screens on desktop and ≤9 on mobile.
2. **Pick one word per state and use it everywhere.**
   - Hero chips should use the status names, with plain-language help underneath: "Active · current", "Expired · lapsed", "Withdrawn · void", "Closed · not approved".
   - The validity column uses the same verb as the tag.
   - Keep "suspended/retracted" only as conclusion annotations, and define each in the legend.
3. **Make the header CTA match the headline.** Use "Browse records", or an inline "Find a product" search that jumps to the register filtered. Keep "Request a review" in Next steps and the footer, and replace the `.example` mailto with an obviously demo form or a "(demo)" label.
4. **Remove the dates that read as errors, and the dead links.** Show the Withdrawn validity as "Void from issue" with the date on hover or in a second line. Mark the report PDF as a demo, or serve a stub PDF so verify step 1 actually works. Point the "board and method" links at the merged section from recommendation 1.
5. **Polish the layouts.** Fix the §2/§3 sticky handoff gap. Put a fade on the mobile nav strip. Use a select for the type filter on mobile. Align the two expiry ticks. Attach the 3D caption to the scale, or drop it.

## What would get this to 85+

The structure is now right; what remains is editing. Cut the explainers after the register to one tight reference section, so the page reads as "check a product, then (optionally) learn why". Use exactly one word for each state across the hero, table, sheet and oracle. Make the header's main action the reader's job, not the issuer's. With those changes, and the layout seams closed, this would hold up as a top-studio fintech register.
