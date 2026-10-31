// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MizanRegistry} from "../src/MizanRegistry.sol";
import {MizanReceiver} from "../src/MizanReceiver.sol";
import {MizanConsumer} from "../src/examples/MizanConsumer.sol";
import {MockForwarder} from "../test/MockForwarder.sol";
import {MockAsset} from "../test/MockAsset.sol";

contract DeployLocal is Script {
    // Public Anvil account #0. Never fund or use this key on a public chain.
    uint256 constant LOCAL_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    // Fixed mock Sharia board member keys, shared with LocalDemo. Quorum is 2 of 3.
    uint256[3] SHARIA_BOARD_MEMBER_KEYS = [uint256(0x5C01), 0x5C02, 0x5C03];

    function run() external {
        require(block.chainid == 31337, "Local deployment only");
        address admin = vm.addr(LOCAL_KEY);
        bytes32 workflow = keccak256("mizan-local-workflow");
        string memory policy = vm.readFile("evidence/demo-policy.json");
        MizanRegistry.BoardInput memory board;
        board.quorum = 2;
        board.shariaBoardMembers = new MizanRegistry.ShariaBoardMemberInput[](3);
        for (uint256 i; i < 3; ++i) {
            board.shariaBoardMembers[i] = MizanRegistry.ShariaBoardMemberInput(
                vm.addr(SHARIA_BOARD_MEMBER_KEYS[i]),
                string.concat("Mock Sharia Board Member ", vm.toString(i + 1)),
                string.concat("file://evidence/mock-sharia-board-member-", vm.toString(i + 1), ".json")
            );
        }
        vm.startBroadcast(LOCAL_KEY);
        MizanRegistry registry = new MizanRegistry(
            admin,
            MizanRegistry.PolicyInput(
                keccak256("demo-policy-v1"), "file://evidence/demo-policy.json", keccak256(bytes(policy))
            ),
            board
        );
        MockForwarder forwarder = new MockForwarder(admin);
        MizanReceiver receiver = new MizanReceiver(registry, address(forwarder), workflow, admin);
        registry.setReceiver(address(receiver));
        MizanConsumer consumer = new MizanConsumer(registry);
        MockAsset asset = new MockAsset();
        vm.stopBroadcast();

        string memory object = "deployment";
        vm.serializeAddress(object, "registry", address(registry));
        vm.serializeAddress(object, "receiver", address(receiver));
        vm.serializeAddress(object, "forwarder", address(forwarder));
        vm.serializeAddress(object, "consumer", address(consumer));
        string memory json = vm.serializeAddress(object, "asset", address(asset));
        vm.writeJson(json, "deployments/local.json");
        console2.log("Registry:", address(registry));
        console2.log("Receiver:", address(receiver));
        console2.log("Consumer:", address(consumer));
        console2.log("Mock asset:", address(asset));
    }
}
