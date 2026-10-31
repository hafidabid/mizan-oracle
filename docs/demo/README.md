# Dashboard demo media

Screenshots and a walkthrough video of the `#/dashboard` feature (see root
[README.md](../../README.md) and [frontend/README.md](../../frontend/README.md)), all from a real
run against the actual deployed `MizanRegistry` on Sepolia and the real `frontend/api/*.ts`
backend — not mockups.

- `01-landing-page.png` — the existing landing page, with the new "Live dashboard" nav link.
- `02-dashboard-browse.png` — the browse tab, live-reading `assessmentCount()` from Sepolia.
- `03-dashboard-board-no-wallet.png` — the Sharia board tab's no-wallet-detected state.
- `04-dashboard-board-quorum-reached.png` — a real propose → sign ×3 flow (recovered via
  EIP-712 signature verification against `MizanRegistry`'s exact domain/types) reaching quorum,
  produced by `frontend/scripts/e2e-board-flow.ts`.
- `walkthrough.mp4` — a recorded run through the real app (`frontend/scripts/record-demo.ts`):
  landing page → live dashboard → browse/lookup → connect wallet → propose → sign.

The quorum-reached proposal in `04-dashboard-board-quorum-reached.png` was additionally verified
to be acceptable onchain: `frontend/scripts/verify-quorum-onchain.ts` took that exact proposal and
simulated `MizanReceiver.onReport()` as the real Chainlink forwarder address, which succeeded.
