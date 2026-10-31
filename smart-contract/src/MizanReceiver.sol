// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MizanRegistry} from "./MizanRegistry.sol";
import {IReportReceiver} from "./interfaces/IReportReceiver.sol";

/// @notice Thin, immutable adapter: authenticate transport, then let the registry validate content.
contract MizanReceiver is IReportReceiver {
    MizanRegistry public immutable registry;
    address public immutable forwarder;
    bytes32 public immutable workflowId;
    address public immutable workflowOwner;

    error InvalidConfiguration();
    error UntrustedForwarder();
    error InvalidMetadata();
    error WrongWorkflow();
    error UnsupportedReport();

    event ReportApplied(uint8 indexed action, bytes32 indexed payloadHash);

    constructor(MizanRegistry target, address trustedForwarder, bytes32 id, address author) {
        if (
            address(target).code.length == 0 || trustedForwarder.code.length == 0 || id == bytes32(0)
                || author == address(0)
        ) revert InvalidConfiguration();
        registry = target;
        forwarder = trustedForwarder;
        workflowId = id;
        workflowOwner = author;
    }

    /// @dev Metadata prefix: workflowId (32), workflowName (10), owner (20).
    ///      Accept the 62-byte tooling form and 64-byte production form with trailing reportId.
    function onReport(bytes calldata metadata, bytes calldata report) external {
        if (msg.sender != forwarder) revert UntrustedForwarder();
        if (metadata.length != 62 && metadata.length != 64) {
            revert InvalidMetadata();
        }
        if (bytes32(metadata[0:32]) != workflowId || address(bytes20(metadata[42:62])) != workflowOwner) {
            revert WrongWorkflow();
        }

        // Version 2. action 0 = issue + Opinion[]; action 1 = revoke + ShariaBoardMemberSignature[]. No arbitrary target calls.
        (uint8 version, uint8 action, bytes memory payload, bytes memory signatures) =
            abi.decode(report, (uint8, uint8, bytes, bytes));
        if (version != 2 || action > 1) revert UnsupportedReport();
        if (action == 0) {
            registry.publish(
                abi.decode(payload, (MizanRegistry.Issue)), abi.decode(signatures, (MizanRegistry.Opinion[]))
            );
        } else {
            registry.revoke(
                abi.decode(payload, (MizanRegistry.Revoke)),
                abi.decode(signatures, (MizanRegistry.ShariaBoardMemberSignature[]))
            );
        }
        emit ReportApplied(action, keccak256(payload));
    }

    /// @notice ERC-165 and IReceiver support, as required by the CRE forwarder.
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == type(IReportReceiver).interfaceId;
    }
}
