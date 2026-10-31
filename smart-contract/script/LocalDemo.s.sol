// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MizanRegistry} from "../src/MizanRegistry.sol";
import {MizanReceiver} from "../src/MizanReceiver.sol";
import {MockForwarder} from "../test/MockForwarder.sol";

/// @notice Real Anvil transactions through a test double, NOT a CRE CLI simulation.
contract LocalDemo is Script {
    uint256 constant LOCAL_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    // Same mock Sharia board members as DeployLocal. Quorum is 2 of 3.
    uint256[3] SHARIA_BOARD_MEMBER_KEYS = [uint256(0x5C01), 0x5C02, 0x5C03];

    /// @notice Two Sharia board members approve and one asks for further review: published as Approved, 2 of 3.
    function run() external {
        (MizanRegistry registry, MizanReceiver receiver, MockForwarder forwarder, address asset) = _load();
        string memory evidence = vm.readFile("evidence/sample-review.json");
        MizanRegistry.Issue memory input = MizanRegistry.Issue({
            asset: asset,
            subjectVersion: keccak256("mock-contract-v1"),
            outcome: MizanRegistry.Outcome.Approved,
            evidenceHash: keccak256(bytes(evidence)),
            evidenceURI: "file://evidence/sample-review.json",
            boardIssuedAt: uint64(block.timestamp),
            expiresAt: uint64(block.timestamp + 1 days),
            deadline: uint64(block.timestamp + 1 hours),
            previousId: registry.latestId(asset),
            nonce: 1
        });
        uint256[] memory keys = _sortedKeys();
        MizanRegistry.Opinion[] memory signed = new MizanRegistry.Opinion[](keys.length);
        for (uint256 i; i < keys.length; ++i) {
            MizanRegistry.Outcome opinion = keys[i] == SHARIA_BOARD_MEMBER_KEYS[2]
                ? MizanRegistry.Outcome.NeedsReview
                : MizanRegistry.Outcome.Approved;
            signed[i] =
                MizanRegistry.Opinion(vm.addr(keys[i]), opinion, _sign(keys[i], registry.hashOpinion(input, opinion)));
        }
        vm.startBroadcast(LOCAL_KEY);
        forwarder.deliver(receiver, _metadata(), abi.encode(uint8(2), uint8(0), abi.encode(input), abi.encode(signed)));
        vm.stopBroadcast();
        MizanRegistry.Resolution memory r = registry.resolve(asset);
        console2.log("Published assessment:", r.assessmentId);
        console2.log(
            "Approvals / opinions:", r.tally.approvals, r.tally.approvals + r.tally.rejections + r.tally.needsReview
        );
    }

    /// @notice Revocation signed by the first two Sharia board members (meets quorum).
    function revoke() external {
        (MizanRegistry registry, MizanReceiver receiver, MockForwarder forwarder, address asset) = _load();
        string memory reason = vm.readFile("evidence/sample-revocation.json");
        MizanRegistry.Revoke memory input = MizanRegistry.Revoke({
            assessmentId: registry.latestId(asset),
            reasonHash: keccak256(bytes(reason)),
            reasonURI: "file://evidence/sample-revocation.json",
            deadline: uint64(block.timestamp + 1 hours),
            nonce: 2
        });
        bytes32 digest = registry.hashRevoke(input);
        uint256[] memory keys = _sortedKeys();
        MizanRegistry.ShariaBoardMemberSignature[] memory signed = new MizanRegistry.ShariaBoardMemberSignature[](2);
        for (uint256 i; i < 2; ++i) {
            signed[i] = MizanRegistry.ShariaBoardMemberSignature(vm.addr(keys[i]), _sign(keys[i], digest));
        }
        vm.startBroadcast(LOCAL_KEY);
        forwarder.deliver(receiver, _metadata(), abi.encode(uint8(2), uint8(1), abi.encode(input), abi.encode(signed)));
        vm.stopBroadcast();
        console2.log("Revoked assessment:", input.assessmentId);
    }

    /// @dev The registry requires signatures in strictly ascending Sharia board member-address order.
    function _sortedKeys() private view returns (uint256[] memory keys) {
        keys = new uint256[](3);
        for (uint256 i; i < 3; ++i) {
            keys[i] = SHARIA_BOARD_MEMBER_KEYS[i];
            for (uint256 j = i; j > 0 && vm.addr(keys[j]) < vm.addr(keys[j - 1]); --j) {
                (keys[j], keys[j - 1]) = (keys[j - 1], keys[j]);
            }
        }
    }

    function _sign(uint256 key, bytes32 digest) private pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _metadata() private pure returns (bytes memory) {
        return abi.encodePacked(keccak256("mizan-local-workflow"), bytes10("mizan"), vm.addr(LOCAL_KEY), bytes2(0));
    }

    function _load() private view returns (MizanRegistry, MizanReceiver, MockForwarder, address) {
        require(block.chainid == 31337, "Local demo only");
        string memory json = vm.readFile("deployments/local.json");
        return (
            MizanRegistry(vm.parseJsonAddress(json, ".registry")),
            MizanReceiver(vm.parseJsonAddress(json, ".receiver")),
            MockForwarder(vm.parseJsonAddress(json, ".forwarder")),
            vm.parseJsonAddress(json, ".asset")
        );
    }
}
