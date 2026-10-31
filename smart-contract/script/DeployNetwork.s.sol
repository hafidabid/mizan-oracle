// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MizanRegistry} from "../src/MizanRegistry.sol";
import {MizanReceiver} from "../src/MizanReceiver.sol";
import {MizanConsumer} from "../src/examples/MizanConsumer.sol";

/// @notice Ethereum/Sepolia deployment. No mock forwarder or hardcoded production addresses.
contract DeployNetwork is Script {
    function run() external {
        address admin = vm.envAddress("ADMIN_ADDRESS");
        // Parallel lists. Names use ";" so they may contain commas.
        address[] memory accounts = vm.envAddress("SHARIA_BOARD_MEMBER_ADDRESSES", ",");
        string[] memory names = vm.envString("SHARIA_BOARD_MEMBER_NAMES", ";");
        string[] memory profiles = vm.envString("SHARIA_BOARD_MEMBER_PROFILE_URIS", ",");
        uint16 quorum = uint16(vm.envUint("SHARIA_BOARD_MEMBER_QUORUM"));
        address forwarder = vm.envAddress("CRE_FORWARDER");
        bytes32 workflow = vm.envBytes32("CRE_WORKFLOW_ID");
        address author = vm.envAddress("CRE_WORKFLOW_OWNER");
        bytes32 policy = vm.envBytes32("POLICY_ID");
        bytes32 policyHash = vm.envBytes32("POLICY_HASH");
        string memory policyURI = vm.envString("POLICY_URI");

        require(
            names.length == accounts.length && profiles.length == accounts.length, "Sharia Board Member list mismatch"
        );
        MizanRegistry.BoardInput memory board;
        board.quorum = quorum;
        board.shariaBoardMembers = new MizanRegistry.ShariaBoardMemberInput[](accounts.length);
        for (uint256 i; i < accounts.length; ++i) {
            board.shariaBoardMembers[i] = MizanRegistry.ShariaBoardMemberInput(accounts[i], names[i], profiles[i]);
        }

        // --sender must equal ADMIN_ADDRESS so initial one-time wiring is authorized.
        vm.startBroadcast();
        MizanRegistry registry =
            new MizanRegistry(admin, MizanRegistry.PolicyInput(policy, policyURI, policyHash), board);
        MizanReceiver receiver = new MizanReceiver(registry, forwarder, workflow, author);
        registry.setReceiver(address(receiver));
        MizanConsumer consumer = new MizanConsumer(registry);
        vm.stopBroadcast();
        console2.log("Registry:", address(registry));
        console2.log("Receiver:", address(receiver));
        console2.log("Consumer:", address(consumer));
    }
}
