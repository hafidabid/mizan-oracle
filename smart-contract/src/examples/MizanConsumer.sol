// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MizanRegistry} from "../MizanRegistry.sol";

/// @notice Example acceptance rules. This contract has no custody or trading functions.
contract MizanConsumer {
    enum Requirement {
        None,
        PriorApproval,
        CurrentApproval
    }

    MizanRegistry public immutable oracle;

    constructor(MizanRegistry registry) {
        oracle = registry;
    }

    function isAllowed(address asset, Requirement requirement) external view returns (bool) {
        if (requirement == Requirement.None) return true;
        MizanRegistry.Resolution memory r = oracle.resolve(asset);
        if (!r.exists || !r.boardActive || r.revoked || r.outcome != MizanRegistry.Outcome.Approved) {
            return false;
        }
        return requirement == Requirement.PriorApproval || !r.expired;
    }
}
