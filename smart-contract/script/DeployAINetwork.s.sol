// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MizanAIPreScreen} from "../src/MizanAIPreScreen.sol";
import {MizanAIReceiver} from "../src/MizanAIReceiver.sol";

/// @notice Ethereum/Sepolia deployment of the AI pre-screen layer. Entirely separate from
///         DeployNetwork.s.sol: different contracts, different CRE workflow, no shared state
///         with MizanRegistry.
contract DeployAINetwork is Script {
    function run() external {
        address admin = vm.envAddress("AI_ADMIN_ADDRESS");
        address forwarder = vm.envAddress("AI_CRE_FORWARDER");
        bytes32 workflow = vm.envBytes32("AI_CRE_WORKFLOW_ID");
        address author = vm.envAddress("AI_CRE_WORKFLOW_OWNER");

        // --sender must equal AI_ADMIN_ADDRESS so the one-time setReceiver wiring is authorized.
        vm.startBroadcast();
        MizanAIPreScreen store = new MizanAIPreScreen(admin);
        MizanAIReceiver receiver = new MizanAIReceiver(store, forwarder, workflow, author);
        store.setReceiver(address(receiver));
        vm.stopBroadcast();

        console2.log("AI pre-screen store:", address(store));
        console2.log("AI receiver:", address(receiver));
    }
}
