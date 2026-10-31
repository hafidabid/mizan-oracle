# Mizan Paper Valley

A landing page for **Mizan**, an illustrative Sharia review oracle for DeFi.
The whole page is one Three.js paper-cut valley fixed behind the content. Scrolling walks a
camera down a road from dawn to night:

| Scroll position | Time of day | What you see |
| --- | --- | --- |
| Hero | Dawn | A brass mizan (balance scale) on a stone plinth. It tips out of balance when you pick the expired Yield Vault. |
| How it works | Morning to midday | Five paper gates over the road. The gate you are walking through turns gold and the panel shows that step. |
| Status over time | Afternoon to sunset | An hourglass. Scrolling runs Sample Token A's review year. The sun sets when the period ends on 12 Oct 2027 and the status flips to Expired. |
| Register | Dusk | City windows and road lamps light up behind a searchable table of sample records. |
| Closing | Night | Sky lanterns rise over the valley. |

Every record is fictional demo data from an illustrative board. It is not a Sharia ruling.

## Run it

Requires Node.js 18 or newer (20 or 22 recommended).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check, then build to dist/
npm run preview    # serve the production build
```

`dist/` is plain static files, so it can be hosted anywhere (Netlify, Vercel, GitHub Pages, S3).

## Stack

- React 19 + TypeScript (strict)
- Vite 6
- three.js 0.170 (no React Three Fiber; the scene is plain three.js driven by refs)
- Fonts from Google Fonts: Gloock (display), Figtree (body), DM Mono (data), Reem Kufi (Arabic wordmark)

## Project layout

```
src/
  App.tsx                  page composition and shared state (selected product, open record)
  main.tsx                 entry point
  data/reviews.ts          sample records, statuses, the five gates   ← edit content here
  lib/dates.ts             demo "today", review period, date helpers
  lib/rules.ts             application rules and the sample oracle response
  hooks/useScrollModel.ts  turns scroll position into gate, day and active section
  hooks/useTilt.ts         cards that tilt toward the pointer
  hooks/useReducedMotion.ts
  three/world.ts           the 3D valley: scene, camera path, time of day, render loop
  three/shapes.ts          paper geometry (hills, skyline, arches, clouds) and canvas textures
  components/              Nav, Hero, HowSection, TimeSection, Register, Closing, RecordModal, ...
  styles/global.css        all styles and design tokens
```

## How the 3D is driven

- `useScrollModel` measures each section and keeps the positions in a ref.
- `World3D` builds the scene once. The selected product and current gate reach the scene through
  refs, so changing them never rebuilds anything.
- Every frame, `world.ts` maps `window.scrollY` to a camera position, a look target and a time of
  day, then eases toward them. Change the stations in `heroStation`, `howStation`, `timeStation`,
  `registerStation` and `closingStation`.
- The sky colours, sun strength and fill light for each time of day live in the `TOD` table.

## Things to know

- **Colour handling.** The palette was picked by eye in sRGB, so `world.ts` turns off three's colour
  management and outputs linear colour. Light intensities are multiplied by π because modern three.js
  uses physical light units. If you upgrade three.js and the scene looks washed out or too dark,
  check these two settings first.
- **No WebGL 2.** Browsers without WebGL 2 get a flat sky gradient. All content and interactions still
  work.
- **Reduced motion.** With "reduce motion" on, the camera jumps instead of easing and the idle
  animations (sway, clouds, lanterns) stop.
- **Performance.** On small screens the shadow map is 1024px and antialiasing is off. If older phones
  struggle, set `renderer.shadowMap.enabled = false` when `small` is true in `world.ts`.
- **Today.** The demo uses a fixed "today" of 29 Oct 2026 (`lib/dates.ts`) so the day counts match the
  copy. Change `TODAY` to `new Date()` to make it live.
