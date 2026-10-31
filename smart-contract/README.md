# Mizan Oracle - readable Solidity MVP

Each member of a Sharia board signs their own opinion on an assessment. A delivery receiver authenticates its transport. A registry verifies every Sharia board member signature, records who gave which opinion and how many, even when the board is split, and only lets an outcome take effect when a quorum agrees with it. Applications read the latest result and apply their own rules.

This is the onchain portion of Mizan — deployed and source-verified on Sepolia, see the
[root README's deployment table](../README.md#deployed-on-sepolia) for addresses, and driven by two
real Chainlink CRE workflows (see `cre-workflow/`). **It is a hackathon demo, not a real Sharia
certification;** no funds are held and no trades are executed.

## Start here

1. Read [the contract design](docs/ONCHAIN-DESIGN.md).
2. Follow [the Foundry + Anvil guide](docs/HOW-TO.md).
3. For CRE integration, read [the report format](docs/CRE-INTEGRATION.md).
4. See [verification results and limits](docs/VERIFICATION.md).

## Quick start

Install Foundry from the official instructions: https://getfoundry.sh/introduction/installation/

The ZIP includes pinned OpenZeppelin and forge-std sources; **no `forge install` is required**.

```bash
cd mizan-contracts
forge build
forge test -vv
bash scripts/anvil-smoke.sh
```

The smoke script starts its own Anvil node on `127.0.0.1:18545`, deploys contracts, publishes an approval, advances time, revokes the record, checks application rules, and stops that node. Requires Bash, Python 3, and `forge`, `cast`, `anvil` on PATH. An occupied port is rejected; override with `ANVIL_PORT=18546`.

## Files

```text
src/MizanRegistry.sol          Sharia board roster/quorum, per-member opinions, records, lifecycle, reads
src/MizanReceiver.sol          Forwarder/workflow checks and report decoding
src/examples/MizanConsumer.sol Example application requirements, no custody
src/interfaces/               Small receiver interface
script/DeployLocal.s.sol       Anvil-only deployment using public test keys
script/LocalDemo.s.sol         Local approval and revocation transactions
script/DeployNetwork.s.sol     Configured Ethereum/Sepolia deployment
scripts/anvil-smoke.sh         Real local transaction smoke test
test/                         Foundry tests and local test doubles
evidence/                     Illustrative public JSON files
docs/                         Design, commands, CRE format, test results
lib/                          Pinned dependencies, including licenses
```

## Deliberately small scope

- One Sharia board (up to 32 active, owner-managed roster and quorum), one immutable policy, one chain per deployment.
- Normal updates must arrive through the configured receiver. Board and transport authorization are separate checks.
- `Approved`, `expired`, `revoked`, and `boardActive` are separate facts. Expiry is not a new religious judgment.

The contracts compile for Ethereum-compatible EVMs using Solidity 0.8.24 and the Paris EVM target, with both an Anvil smoke test and a live Sepolia deployment behind real Chainlink CRE transport. Review configuration and obtain independent security/professional review before production use.

## Dependencies and license

Project source: MIT, see LICENSE. Vendored dependencies retain their own license notices. Exact revisions are in DEPENDENCIES.md. See docs/VERIFICATION.md for the tools actually used.
