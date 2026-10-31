# Mizan

An illustrative Sharia review oracle for DeFi: a Sharia board signs its opinions onchain, a quorum
rule decides the published outcome, and an AI layer gives new/unlisted assets a non-binding
preliminary screen while the board reviews. **This is a hackathon demo, not a real Sharia
certification.**

## What's here

| Path | What it is |
| --- | --- |
| [`smart-contract/`](smart-contract/) | The oracle: `MizanRegistry` (board opinions, quorum, resolve()), `MizanReceiver` (Chainlink CRE callback), the AI pre-screen pair, and tests. Start with [smart-contract/README.md](smart-contract/README.md). |
| [`cre-workflow/ai-prescreen/`](cre-workflow/ai-prescreen/) | The Chainlink CRE workflow: fetches an asset, asks an LLM for a preliminary compliance screen, writes the result onchain. Verified working end-to-end against live Sepolia contracts. |
| [`frontend/`](frontend/) | Landing page / demo UI. See [frontend/README.md](frontend/README.md). |
| [`design-reviews/`](design-reviews/) | UX/trust/motion/a11y review notes. |

## Deployed on Sepolia

Source verified (`exact_match`) on Sourcify for every contract below; see
[smart-contract/deployments/sepolia.json](smart-contract/deployments/sepolia.json) for full
deployment details including the policy hash and CRE wiring.

| Contract | Address |
| --- | --- |
| MizanRegistry | [`0xAB7995471D8f075AE357c47AF884Ac814e6dBB38`](https://sepolia.etherscan.io/address/0xAB7995471D8f075AE357c47AF884Ac814e6dBB38) |
| MizanReceiver | [`0x6B2E8925bC577B79FA7aB3182Dd54afDDDE180AD`](https://sepolia.etherscan.io/address/0x6B2E8925bC577B79FA7aB3182Dd54afDDDE180AD) |
| MizanAIPreScreen | [`0x9952A0BBA59f1302BD9F707848c14D37C1fedE19`](https://sepolia.etherscan.io/address/0x9952A0BBA59f1302BD9F707848c14D37C1fedE19) |
| MizanAIReceiver | [`0x93Df89F20cd1cF145AaA6f07e339c58eaC02AdEe`](https://sepolia.etherscan.io/address/0x93Df89F20cd1cF145AaA6f07e339c58eaC02AdEe) |

`MizanRegistry`/`MizanReceiver` were redeployed from an earlier pair to wire the receiver to the
real Chainlink forwarder (the original deployment's forwarder was a placeholder). See
[smart-contract/deployments/sepolia.json](smart-contract/deployments/sepolia.json) for the
superseded addresses and why.

`MizanAIPreScreen`/`MizanAIReceiver` are deliberately separate from `MizanRegistry` — different
contract, different ABI shape — so an AI pre-screen can never be mistaken for a board ruling.
`resolve()` on the registry is the only thing that's ever board-signed.

## Disclaimer

- The AI pre-screen CRE workflow **is** live and verified: real OpenRouter calls, real onchain writes, readable via `getPreScreen(asset)`. See [smart-contract/docs/CRE-WORKFLOW-PLAN.md](smart-contract/docs/CRE-WORKFLOW-PLAN.md).
- Sharia board members are freshly generated demo wallets, not real scholars. Policy text is a demo policy, not a real fatwa or standard.
