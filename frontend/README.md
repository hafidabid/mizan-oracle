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

## Live dashboard (`#/dashboard`)

Separate from the fictional landing-page demo, `#/dashboard` is a real dashboard reading live from
the deployed `MizanRegistry` on Sepolia, plus a minimal serverless backend that coordinates Sharia
board members signing an assessment before it goes onchain.

- **Browse / lookup** (`#/dashboard`) — no wallet needed. Lists published assessments
  (`assessmentCount()` + `getAssessment(id)`) and looks up any asset address via `resolve()`,
  reading the registry directly client-side.
- **Sharia board** (`#/dashboard/board`) — connects a wallet (any EIP-1193 provider, e.g. MetaMask),
  checks it against `shariaBoardMembers(address)`, and if active lets that member:
  - **Propose** an assessment for an asset (signed with `personal_sign` to authenticate as a board
    member, not yet an onchain commitment).
  - **Sign** a pending proposal's `Issue` with the exact EIP-712 typed data `MizanRegistry` expects
    (`frontend/src/lib/eip712.ts`, mirrored server-side in `frontend/api/_eip712.ts`).

  Once enough members sign to meet quorum, the proposal is picked up by
  `cre-workflow/board-opinion/` — a Chainlink CRE workflow, same pattern as the AI pre-screen
  workflow — which delivers it onchain via `MizanReceiver.onReport()` and calls back to close the
  loop.

Source: `src/components/dashboard/`, `src/lib/{chain,wallet,api,eip712,board}.ts`, and the
serverless store at `api/*.ts` (see root README's architecture note and `api/_store.ts`).

### Deploying to Vercel

1. Set the environment variables in `.env.example` on the Vercel project (Project Settings →
   Environment Variables). `SEPOLIA_RPC_URL` and `WORKFLOW_RESOLVE_SECRET` are required server-side;
   `KV_REST_API_URL`/`KV_REST_API_TOKEN` (Vercel KV, Upstash-backed) are strongly recommended — without
   them, pending-proposal state only lives in a single serverless invocation's memory.
2. Deploy. Vercel auto-detects the Vite app and serves `api/*.ts` as Edge Functions alongside it, no
   `vercel.json` needed — the dashboard's own routing is hash-based (`#/dashboard`), so there's
   nothing for Vercel to rewrite either.
3. Update `cre-workflow/board-opinion/config.staging.json`'s (and `config.production.json`'s)
   `apiBaseUrl` to `https://<your-deployment>/api`, set `WORKFLOW_RESOLVE_SECRET` identically in
   `cre-workflow/secrets.yaml` (see `secrets.yaml.example`), and run the workflow — see
   `smart-contract/docs/CRE-WORKFLOW-PLAN.md` for the `cre workflow simulate --broadcast` pattern
   already proven for the AI pre-screen workflow.

### Local dev against the backend

`npm run dev` proxies `/api` to `frontend/scripts/dev-api-server.ts` (a plain Node server wrapping
the same `api/*.ts` handlers Vercel runs) — start it separately:

```bash
PORT=8787 npx tsx scripts/dev-api-server.ts
```

`scripts/test-board-flow.ts` and `scripts/e2e-board-flow.ts` are smoke tests that exercise the real
propose → sign → quorum flow (the latter through an actual rendered browser page via Playwright)
using the demo board wallets in `smart-contract/board-keys.local`.
