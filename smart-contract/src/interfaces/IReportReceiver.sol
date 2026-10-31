// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice CRE's callback shape. The trusted forwarder verifies DON reports upstream.
interface IReportReceiver {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}
