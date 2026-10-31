# How to build, test, deploy, and read Mizan

All commands run from the `mizan-contracts` folder. Bash, Python 3, and Foundry (`forge`, `cast`, `anvil`) are required. Use the official installation guide: https://getfoundry.sh/introduction/installation/

The ZIP already contains its two pinned source dependencies. The first build may download Solidity 0.8.24. No Node.js, npm, Docker, or database is needed for these onchain exercises.

## 1. Build and run Foundry tests

```bash
forge --version
anvil --version
cast --version
forge build
forge test -vv
forge fmt --check
```

The suite tests approval, expiry boundaries, replacement, revocation, signatures, nonces, stale predecessors, board suspension, Sharia board member roster/quorum, per-member opinions and dissent, and receiver authorization. Each fuzz test uses 256 runs. Read the test names in `test/Mizan.t.sol`.

## 2. One-command Anvil smoke test

```bash
bash scripts/anvil-smoke.sh
```

This creates a new local chain, sends real local transactions, checks all three application modes for active/expired/revoked records, checks which Sharia board members gave which opinion, and stops its own node. It refuses to attach to a pre-existing chain. If port 18545 is occupied:

```bash
ANVIL_PORT=18546 bash scripts/anvil-smoke.sh
```

This script is an **Anvil test**, not a CRE CLI simulation and not a public Ethereum deployment.

## 3. Manual local deployment

Terminal A:

```bash
anvil --host 127.0.0.1 --port 8545 --chain-id 31337
```

Terminal B:

```bash
forge script script/DeployLocal.s.sol:DeployLocal \
  --rpc-url http://127.0.0.1:8545 --broadcast --non-interactive
```

It deploys the registry, mock forwarder, receiver, example consumer, and mock subject; wires the receiver once; and writes addresses to `deployments/local.json`.

The local scripts contain a public Anvil account key and three fixed mock Sharia board member keys (quorum 2 of 3). They refuse chains other than 31337. **Never reuse or fund these keys outside local development.** Anvil must be a fresh default chain for the local deployment account to be funded.

## 4. Publish a mock approval

```bash
forge script script/LocalDemo.s.sol:LocalDemo \
  --rpc-url http://127.0.0.1:8545 --broadcast --non-interactive
```

This reads the exact bytes of `evidence/sample-review.json`, hashes them, has two mock Sharia board members sign `Approved` and one sign `NeedsReview`, encodes a version-2 issue report, and submits it through the mock transport. The review is valid for one day from its declared issue time.

Each action uses a fixed demo nonce. Run it once per fresh local deployment; repeated runs are rejected intentionally. For replacement, create a new signed input using `previousId = latestId(asset)` and a new nonce.

## 5. Read the application rule result

Set task-local shell variables from the generated file:

```bash
mizan_consumer="$(python3 -c 'import json; print(json.load(open("deployments/local.json"))["consumer"])')"
mizan_asset="$(python3 -c 'import json; print(json.load(open("deployments/local.json"))["asset"])')"
mizan_registry="$(python3 -c 'import json; print(json.load(open("deployments/local.json"))["registry"])')"

cast call "$mizan_consumer" 'isAllowed(address,uint8)(bool)' \
  "$mizan_asset" 2 --rpc-url http://127.0.0.1:8545
```

Expected: `true`. Mode 0 means no review requirement; mode 1 accepts prior approval; mode 2 requires current approval.

Read the raw oracle result (the long tuple matches `Resolution` in source):

```bash
cast call "$mizan_registry" \
  'resolve(address)((bool,uint256,uint8,bool,bool,bool,(uint16,uint16,uint16,uint16,uint16,bool),bytes32,bytes32,string,uint64,uint64,uint64))' \
  "$mizan_asset" --rpc-url http://127.0.0.1:8545
```

The nested tuple is the tally: `(approvals, rejections, needsReview, quorum, boardSize, quorumMet)`; expect `(2, 0, 1, 2, 3, true)`.

See who gave which opinion (opinion `1` = Approved, `2` = Rejected, `3` = NeedsReview), and look up a Sharia board member's name:

```bash
cast call "$mizan_registry" 'getOpinions(uint256)((address,uint8)[])' 1 --rpc-url http://127.0.0.1:8545
cast call "$mizan_registry" 'shariaBoardMembers(address)(string,string,bool)' 0xSHARIA_BOARD_MEMBER_ADDRESS --rpc-url http://127.0.0.1:8545
```

No wallet or transaction is needed for these reads.

## 6. Advance time and see expiry

```bash
cast rpc --rpc-url http://127.0.0.1:8545 evm_increaseTime 86401
cast rpc --rpc-url http://127.0.0.1:8545 evm_mine
cast call "$mizan_consumer" 'isAllowed(address,uint8)(bool)' \
  "$mizan_asset" 1 --rpc-url http://127.0.0.1:8545
cast call "$mizan_consumer" 'isAllowed(address,uint8)(bool)' \
  "$mizan_asset" 2 --rpc-url http://127.0.0.1:8545
```

Expected: mode 1 `true`; mode 2 `false`. The outcome is still Approved. No expiry transaction was sent; the reader derives freshness from time.

## 7. Revoke and verify

```bash
forge script script/LocalDemo.s.sol:LocalDemo --sig 'revoke()' \
  --rpc-url http://127.0.0.1:8545 --broadcast --non-interactive
cast call "$mizan_consumer" 'isAllowed(address,uint8)(bool)' \
  "$mizan_asset" 1 --rpc-url http://127.0.0.1:8545
```

Expected: `false`. Mode 2 also fails. `latestId(asset)` stays 1; no old approval is restored. Mode 0 continues to skip the review gate.

## 8. Ethereum / Sepolia deployment

The same core contracts use standard Ethereum EVM features; they are not tied to Anvil. `DeployNetwork.s.sol` deploys no mock assets or forwarder. Start with Sepolia before considering mainnet.

Choose verified values yourself. This package intentionally contains no guessed Chainlink network addresses or workflow IDs.

```bash
export ADMIN_ADDRESS=0xYOUR_DEPLOYER_ADDRESS
export SHARIA_BOARD_MEMBER_ADDRESSES=0xSHARIA_BOARD_MEMBER_A,0xSHARIA_BOARD_MEMBER_B,0xSHARIA_BOARD_MEMBER_C
export SHARIA_BOARD_MEMBER_NAMES="Dr. A;Dr. B;Dr. C"          # ';'-separated, same order
export SHARIA_BOARD_MEMBER_PROFILE_URIS=ipfs://a,ipfs://b,ipfs://c
export SHARIA_BOARD_MEMBER_QUORUM=2
export CRE_FORWARDER=0xVERIFIED_FORWARDER_ON_TARGET_CHAIN
export CRE_WORKFLOW_ID=0xYOUR_32_BYTE_WORKFLOW_ID
export CRE_WORKFLOW_OWNER=0xYOUR_WORKFLOW_OWNER
export POLICY_ID=0xYOUR_32_BYTE_POLICY_IDENTIFIER
export POLICY_HASH=0xKECCAK256_OF_EXACT_PUBLIC_POLICY_BYTES
export POLICY_URI=ipfs://YOUR_POLICY_DOCUMENT
export RPC_URL=https://YOUR_ETHEREUM_OR_SEPOLIA_RPC
```

These are placeholders, not executable addresses. Import a production deployer into Foundry's encrypted keystore:

```bash
cast wallet import mizan-deployer --interactive
```

Dry-run, with `--sender` matching `ADMIN_ADDRESS`:

```bash
forge script script/DeployNetwork.s.sol:DeployNetwork \
  --rpc-url "$RPC_URL" --sender "$ADMIN_ADDRESS" --account mizan-deployer
```

When the configuration is reviewed and gas is funded, broadcasting uses:

```bash
forge script script/DeployNetwork.s.sol:DeployNetwork \
  --rpc-url "$RPC_URL" --sender "$ADMIN_ADDRESS" --account mizan-deployer --broadcast
```

A dry-run does not deploy publicly. The broadcast does, and costs gas. A public deployment was not performed while preparing this package. Retain its addresses and receipts, verify contracts on the appropriate explorer, and confirm the receiver's immutable configuration before using it. The broadcaster must initially be the configured admin to perform `setReceiver`; transfer ownership afterward through `transferOwnership` + `acceptOwnership` if needed.

A new chain/registry has a different EIP-712 domain: Sharia board member signatures must be regenerated. Production CRE configuration and live report delivery need a separate end-to-end test. The local `MockForwarder` must never be used as a substitute for a real trusted Chainlink forwarder on a public chain.

## Troubleshooting

- **No compiler available:** allow Foundry to download solc 0.8.24 or configure the matching local compiler.
- **Missing file permissions:** run commands from the project root; `foundry.toml` permits reading `evidence/` and writing `deployments/`.
- **NonceUsed / StaleAssessment:** the action already ran or the registry changed. Sign a new nonce and correct predecessor; do not remove replay checks.
- **WrongWorkflow / UntrustedForwarder:** check target-chain forwarder and workflow identity. Do not disable authorization to make a report pass.
- **SignatureExpired:** regenerate a signed payload with a fresh delivery deadline.
- **Board clock ahead:** `boardIssuedAt` cannot be later than the acceptance block time.
- **Local file evidence URI:** demonstration only; use public content-addressed or HTTPS evidence for a real consumer.
- **Changed evidence:** any whitespace or newline change changes the hash. Hash exact published bytes.
