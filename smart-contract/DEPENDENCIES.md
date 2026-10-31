# Pinned dependencies

Sources are bundled in `lib/` so the ZIP is usable without Git submodules or `forge install`.

| Dependency | Version | Commit |
|---|---|---|
| OpenZeppelin Contracts | v5.4.0 | c64a1edb67b6e3f4a15cca8909c9482ad33a02b0 |
| forge-std | v1.9.7 | 77041d2ce690e692d6e03cc812b57d1ddaa4d505 |

Original repositories:

- https://github.com/OpenZeppelin/openzeppelin-contracts
- https://github.com/foundry-rs/forge-std

Solidity compiler: 0.8.24. EVM target: Paris. Optimizer: 200 runs, no via-IR.

Third-party licenses are retained under `lib/`. Dependency Git histories, node_modules, and generated build artifacts are not needed in the distribution.
