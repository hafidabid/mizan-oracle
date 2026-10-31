# CRE receiver integration boundary

## Included and not included

Included: an Ethereum contract with the CRE `onReport(bytes,bytes)` callback, ERC-165 detection, forwarder/workflow checks, and ABI-decoded Sharia-board-member-signed actions. Tests exercise the callback through a local mock transport.

Not included: an external production assessment API, a CRE TypeScript/Go workflow, a successful CRE CLI simulation, a DON deployment, or a live KeystoneForwarder transaction. This ZIP alone does not satisfy the CRE bounty's complete workflow demonstration requirement.

## Report schema (version 2)

The callback's `report` argument is:

```solidity
abi.encode(
    uint8(2),             // schema version
    uint8(action),        // 0 = issue, 1 = revoke
    abi.encode(input),    // MizanRegistry.Issue or MizanRegistry.Revoke
    abi.encode(signed)    // issue: MizanRegistry.Opinion[]  (address shariaBoardMember, uint8 opinion, bytes signature)
                          // revoke: MizanRegistry.ShariaBoardMemberSignature[]  (address shariaBoardMember, bytes signature)
)
```

Each signature is a 65-byte ECDSA `r || s || v`. Sort entries by strictly ascending Sharia board member address. For an issue, each Sharia board member signs `hashOpinion(issue, opinion)` with their own opinion. At least `quorum` members must sign. If fewer than `quorum` opinions match `issue.outcome`, the record is still stored, with effective outcome `NeedsReview` and `tally.quorumMet = false`. Version 1 (single board signature) is rejected.

`abi.encode(input)` includes a dynamic string, so do not hand-concatenate bytes or use `abi.encodePacked` for the report. Use an ABI encoder with the exact tuple order from the Solidity struct. Use `uint8` for the enum field in offchain ABI definitions.

The EIP-712 Issue type has the immutable policy ID as an additional signed field. The ABI Issue struct does not contain that field. Do not confuse the report encoding with the signature encoding.

The two clocks differ: `expiresAt` ends the assessment period; `deadline` ends permission to submit this particular signature. A review may be expired while a newly signed import is still deliverable.

## Metadata

The trusted forwarder supplies metadata, not an arbitrary UI user:

```solidity
abi.encodePacked(
    bytes32(workflowId),
    bytes10(workflowName),
    address(workflowOwner),
    bytes2(reportId) // production form; omitted by some tooling
)
```

Documented identity prefix length is 62 bytes. Production delivery includes the trailing two-byte report ID, for 64 bytes. Mizan accepts both forms, checks exact workflow ID and owner, and ignores workflowName/reportId for authorization. It never treats metadata alone as proof: the caller must also be the configured forwarder.

The receiver advertises IReceiver (`onReport` selector) and ERC-165, returns false for `0xffffffff`, and supports no arbitrary target calls.

## Suggested workflow

1. Fetch an immutable signed action ID from a fixed assessment API.
2. Validate schema, Sharia board member signatures, quorum, size limits and evidence references offchain.
3. Read `latestId(asset)` / nonce state to detect stale or already applied actions.
4. ABI-encode the report above.
5. Use CRE's supported report generation and EVM write capability to deliver it.
6. Distinguish simulation output from a broadcast transaction receipt.
7. Mark delivered only after checking accepted onchain state.

The registry repeats authorization and ordering checks even if the workflow has checked them. Never weaken these checks because delivery is decentralized.

## Configurations must match

- Chain ID in Sharia board member EIP-712 domain.
- Registry address and policy ID in signing data.
- Registry's one-time receiver address.
- Receiver's trusted forwarder, expected workflow ID, and expected workflow owner.
- CRE target chain/receiver and gas limit.
- Correct tooling/simulation forwarder versus production forwarder.

Receiver configuration is immutable. Deploy a new receiver AND registry for a different fixed workflow/transport; do not expect an owner setter to exist.

## Sources

- https://docs.chain.link/cre/guides/workflow/using-evm-client/onchain-write/building-consumer-contracts
- https://docs.chain.link/cre/overview
- https://docs.chain.link/cre/guides/operations/deploying-workflows
- https://eips.ethereum.org/EIPS/eip-712

Reviewed 29 October 2026. Recheck the supported network and current CRE SDK/report configuration before deployment. No network address in the local scripts is a production configuration.
