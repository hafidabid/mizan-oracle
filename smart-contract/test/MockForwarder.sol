// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IReportReceiver} from "../src/interfaces/IReportReceiver.sol";

/// @notice LOCAL TEST ONLY. Does not verify DON signatures or represent a CRE simulation.
contract MockForwarder {
    address public immutable operator;

    constructor(address allowedOperator) {
        operator = allowedOperator;
    }

    function deliver(IReportReceiver receiver, bytes calldata metadata, bytes calldata report) external {
        require(msg.sender == operator, "Only mock operator");
        receiver.onReport(metadata, report);
    }
}
