// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MizanAIPreScreen} from "./MizanAIPreScreen.sol";
import {IReportReceiver} from "./interfaces/IReportReceiver.sol";

/// @notice Thin, immutable adapter for the AI pre-screen CRE workflow. Same transport
///         authentication as MizanReceiver; a different, simpler report schema (no signatures
///         to check, because nothing here claims Sharia board authority).
contract MizanAIReceiver is IReportReceiver {
    MizanAIPreScreen public immutable store;
    address public immutable forwarder;
    bytes32 public immutable workflowId;
    address public immutable workflowOwner;

    error InvalidConfiguration();
    error UntrustedForwarder();
    error InvalidMetadata();
    error WrongWorkflow();
    error UnsupportedReport();

    event ReportApplied(address indexed asset, bytes32 indexed payloadHash);

    constructor(MizanAIPreScreen target, address trustedForwarder, bytes32 id, address author) {
        if (
            address(target).code.length == 0 || trustedForwarder.code.length == 0 || id == bytes32(0)
                || author == address(0)
        ) revert InvalidConfiguration();
        store = target;
        forwarder = trustedForwarder;
        workflowId = id;
        workflowOwner = author;
    }

    /// @dev Metadata prefix: workflowId (32), workflowName (10), owner (20). Accepts the 62-byte
    ///      tooling form and 64-byte production form with trailing reportId, same as MizanReceiver.
    function onReport(bytes calldata metadata, bytes calldata report) external {
        if (msg.sender != forwarder) revert UntrustedForwarder();
        if (metadata.length != 62 && metadata.length != 64) revert InvalidMetadata();
        if (bytes32(metadata[0:32]) != workflowId || address(bytes20(metadata[42:62])) != workflowOwner) {
            revert WrongWorkflow();
        }

        // Version 1. Flat tuple: no nested signature payload, unlike the board-opinion report.
        (uint8 version, address asset, MizanAIPreScreen.PreScreenInput memory input) =
            abi.decode(report, (uint8, address, MizanAIPreScreen.PreScreenInput));
        if (version != 1) revert UnsupportedReport();

        store.record(asset, input);
        emit ReportApplied(asset, keccak256(report));
    }

    /// @notice ERC-165 and IReceiver support, as required by the CRE forwarder.
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == type(IReportReceiver).interfaceId;
    }
}
