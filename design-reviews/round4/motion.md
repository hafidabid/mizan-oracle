# Motion and interaction review: Mizan (round 4, final)

**Score: 81/100.** The framing issues from round 3 are fixed: the numbered lapis arch now sits fully in frame for the whole hold, the hero scale stays in its arch window as you scroll, the step card no longer changes height, and 3D is back for common laptop sizes. The tracks were shortened again, though, so the hold on each gate is now brief. Every scroll position in §2 still includes a short stretch where no active arch is in view.

## What works

- **The hold is now framed correctly.** The badge moved down to y=6.9 inside the opening and the look-at rose to 5.4 (`world.ts:354`, `world.ts:466`). In every mid-step frame the full star and number sit in the upper third of the arch, clear of the nav bar (`scratchpad/shots-tool/r4-how-0.3.png`, `desktop/03-y2430.png`). The frames at 0.3 and 0.38 of the track are identical, which confirms the hold is a real rest rather than a slow drift. Panel and scene now say the same thing at a glance.
- **The hero subject rides with its window.** The vertical view offset now adds `y / vh` while the hero scrolls (`world.ts:492-496`), so the scale moves up with the arch mask. At y=450 the plinth and brass ring are still framed in the visible part of the window (`r4-y450.png`) rather than round 3's empty beige sky. Lamps now start behind the scale (`world.ts:261`), so nothing stands in front of the plinth.
- **The step card is stable and cross-fades both ways.** The bodies share one grid cell again, with a symmetric opacity and transform transition and delayed `visibility` for the outgoing step (`global.css:195-196`). All five measure 174 px, so the card stays at 435 px with no dead block and no edge jump. The outgoing step now fades out instead of vanishing.
- **3D is back for laptops.** `compact` is now `(max-width: 900px), (max-height: 599px)` (`App.tsx:29`). A 1366×680 viewport gets the full scene with the arch window intact (`r4-1366.png`). Phones and small tablets still get the coherent still page with the SVG sky.
- **The render cost is unchanged and good.** I measured 0 draws when idle and about 72 draws per pass while settling. Shadows are soft 2048² with texel snapping. The covered-section skip and the snap on large jumps are still in place. There were no console errors and axe found no issues on desktop or mobile.
- **The whole scroll path carries meaning.** It runs from the scale (current or not) to five arches (what a record states) to an afternoon that ends at sunset with the hourglass empty (expiry), and fades to paper. It never uses generic reveal choreography.

## Problems

- **Med (regression): The tracks were cut again.** `.track-how` is now 210vh and `.track-time` 150vh (`global.css:178-179`), down from 260vh and 190vh in round 3. I measured **990 px for five steps (198 px per step)** and **450 px for the 460-day year**, against 1440 and 810 in round 3. With the 30/40/30 dwell, each gate's hold is now about 80 px, less than one mouse-wheel notch. One notch in §3 moves about 100 days, so the sunset and the Active-to-Expired flip pass in two flicks. The "Skip to who decides" link already gives impatient readers an exit, so the track no longer needs to be short.
- **Med (unchanged): A dead zone in each pass-through.** The lapis colour and badge are still keyed to `st.gate === step` (`world.ts:625-632`). For the last ~30% of each step the camera is passing through or past the active arch, and the next arch is still paper and unnumbered. `desktop/04-y3240.png` shows the panel on "5 Publish" with only the plain road and hourglass in frame. With the shorter track this is now about 60 px per step, so it reads more as a flicker than a pause. It is still the one place where scene and panel disagree.
- **Low: The §2 and §3 cards collide at the hand-off.** As §3 scrolls in, its card slides up against the still-pinned §2 card. For a stretch the two sheets stack edge to edge in the left column over the scene (`desktop/04-y3240.png`). A short un-pin overlap or a fade on the outgoing card would make it read as a page turn.
- **Low: The hero ground is still flat.** The lower 40% of the arch is a uniform grey-brown ground plane (`desktop/00-y0.png`, `r4-1366.png`). The line-art poster it replaces is crisper, and the 3D hero is the least refined frame of the run.
- **Low: The 900 px width cut-off is broad.** `max-width: 900px` also sends landscape tablets and half-width desktop windows to the still page. That is defensible, but it is a breakpoint, not a measured fit.

## Top 5 recommendations (ranked by score impact)

1. **Restore the track length.** Return to about 260vh for §2 and 190–200vh for §3, or size it per beat: `100vh + 5 × 32vh`, so each hold gets at least 110 px of scroll. Keep the Skip link for readers who want out.
2. **Hand off the active state at the pass-through.** Light the next arch, show its badge and cross-fade the panel when the dwell enters its last phase (t > 0.7), not at the step boundary. Or simply define `step = floor(p * 5 + 0.3)` for both world and panel. Then there is exactly one numbered lapis arch on screen at all times.
3. **Smooth the §2 to §3 hand-off.** Give the §2 sticky panel `opacity` tied to the last 15% of its track, or end the §2 sticky block 120 px earlier, so the cards never butt together.
4. **Improve the hero frame.** Lower the hero camera by about 1 unit and tilt it up slightly so the sky and distant skyline take more of the arch. Add a soft vertex-colour gradient or a few road-edge cards to the foreground ground so it reads as paper layers, not a flat plane.
5. **Make the compact rule a fit test.** Use the 3D page when `innerWidth ≥ 960 && innerHeight ≥ navH + panelH + 40`, measured at runtime, instead of fixed breakpoints.

## What would get this to 85+

The concept, fallbacks, render discipline and framing are now at a professional level. Two choreography details remain. Give each beat enough scroll to land again, at round 3's length. Move the active-state hand-off to the pass-through, so a numbered lapis arch is always in view. Those two changes, plus a softer card hand-off between §2 and §3, would make this an 85: a scroll story that means something at every position.

## Remaining issues worth fixing

1. **Track length (regression).** Restore about 260vh and 190vh so each gate hold and the sunset get more than a single wheel notch (`global.css:178-179`).
2. **Active-arch dead zone.** Switch the lapis colour, badge and panel step at dwell t > 0.7 so there is always one numbered active arch in frame (`world.ts:625-632`, `useScrollModel.ts` step calculation).
3. **§2 to §3 card collision.** Fade or un-pin the §2 panel before the §3 panel meets it (`desktop/04-y3240.png`).
4. **Flat hero ground.** Reframe the hero camera toward the sky and skyline and add foreground paper layering so the first 3D frame matches the poster's quality.
5. **Breakpoint-based 3D cut-off.** Replace `(max-width: 900px), (max-height: 599px)` with a measured fit test so landscape tablets and half-width windows get the scene when the panel fits.
