// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MizanAIPreScreen} from "../src/MizanAIPreScreen.sol";
import {MizanAIReceiver} from "../src/MizanAIReceiver.sol";
import {MockForwarder} from "./MockForwarder.sol";
import {MockAsset} from "./MockAsset.sol";

contract MizanAIPreScreenTest is Test {
    bytes32 constant WORKFLOW = keccak256("mizan-ai-test-workflow");
    address constant AUTHOR = address(0xA1CAFE);

    MizanAIPreScreen store;
    MizanAIReceiver receiver;
    MockForwarder forwarder;
    address asset;

    function setUp() public {
        vm.warp(1_800_000_000);
        store = new MizanAIPreScreen(address(this));
        forwarder = new MockForwarder(address(this));
        receiver = new MizanAIReceiver(store, address(forwarder), WORKFLOW, AUTHOR);
        store.setReceiver(address(receiver));
        asset = address(new MockAsset());
    }

    function _metadata() internal pure returns (bytes memory) {
        return abi.encodePacked(WORKFLOW, bytes10("mizan-ai"), AUTHOR, bytes2(0));
    }

    function _input(uint8 score, uint64 generatedAt) internal pure returns (MizanAIPreScreen.PreScreenInput memory) {
        return MizanAIPreScreen.PreScreenInput({
            score: score,
            rationaleHash: keccak256("rationale bytes"),
            rationaleURI: "ipfs://ai-rationale",
            model: "openrouter:meta-llama/llama-3.1-8b-instruct:free",
            generatedAt: generatedAt
        });
    }

    function _report(address target, MizanAIPreScreen.PreScreenInput memory input) internal pure returns (bytes memory) {
        return abi.encode(uint8(1), target, input);
    }

    function testRecordAndRead() public {
        forwarder.deliver(receiver, _metadata(), _report(asset, _input(72, uint64(block.timestamp))));

        MizanAIPreScreen.PreScreen memory result = store.getPreScreen(asset);
        assertEq(result.score, 72);
        assertEq(result.model, "openrouter:meta-llama/llama-3.1-8b-instruct:free");
        assertEq(result.generatedAt, uint64(block.timestamp));
        assertTrue(store.hasPreScreen(asset));
    }

    function testUnknownAssetHasNoPreScreen() public view {
        MizanAIPreScreen.PreScreen memory result = store.getPreScreen(asset);
        assertEq(result.generatedAt, 0);
        assertFalse(store.hasPreScreen(asset));
    }

    function testOnlyReceiverCanRecord() public {
        vm.expectRevert(MizanAIPreScreen.OnlyReceiver.selector);
        store.record(asset, _input(50, uint64(block.timestamp)));
    }

    function testUntrustedForwarderFails() public {
        vm.expectRevert(MizanAIReceiver.UntrustedForwarder.selector);
        receiver.onReport(_metadata(), _report(asset, _input(50, uint64(block.timestamp))));
    }

    function testWrongWorkflowOwnerFails() public {
        bytes memory badMetadata = abi.encodePacked(WORKFLOW, bytes10("mizan-ai"), address(0xBAD), bytes2(0));
        vm.expectRevert(MizanAIReceiver.WrongWorkflow.selector);
        forwarder.deliver(receiver, badMetadata, _report(asset, _input(50, uint64(block.timestamp))));
    }

    function testMalformedMetadataFails() public {
        vm.expectRevert(MizanAIReceiver.InvalidMetadata.selector);
        forwarder.deliver(receiver, abi.encodePacked(WORKFLOW, bytes10("mizan-ai")), _report(asset, _input(50, uint64(block.timestamp))));
    }

    function testUnsupportedSchemaVersionFails() public {
        bytes memory badReport = abi.encode(uint8(2), asset, _input(50, uint64(block.timestamp)));
        vm.expectRevert(MizanAIReceiver.UnsupportedReport.selector);
        forwarder.deliver(receiver, _metadata(), badReport);
    }

    function testScoreAboveHundredFails() public {
        vm.expectRevert(MizanAIPreScreen.InvalidInput.selector);
        forwarder.deliver(receiver, _metadata(), _report(asset, _input(101, uint64(block.timestamp))));
    }

    function testZeroRationaleHashFails() public {
        MizanAIPreScreen.PreScreenInput memory input = _input(50, uint64(block.timestamp));
        input.rationaleHash = bytes32(0);
        vm.expectRevert(MizanAIPreScreen.InvalidInput.selector);
        forwarder.deliver(receiver, _metadata(), _report(asset, input));
    }

    function testEmptyModelFails() public {
        MizanAIPreScreen.PreScreenInput memory input = _input(50, uint64(block.timestamp));
        input.model = "";
        vm.expectRevert(MizanAIPreScreen.InvalidInput.selector);
        forwarder.deliver(receiver, _metadata(), _report(asset, input));
    }

    function testFutureGeneratedAtFails() public {
        vm.expectRevert(MizanAIPreScreen.InvalidInput.selector);
        forwarder.deliver(receiver, _metadata(), _report(asset, _input(50, uint64(block.timestamp + 1 days))));
    }

    function testStaleGeneratedAtRejected() public {
        forwarder.deliver(receiver, _metadata(), _report(asset, _input(60, uint64(block.timestamp))));
        vm.expectRevert(abi.encodeWithSelector(MizanAIPreScreen.StalePreScreen.selector, uint64(block.timestamp), uint64(block.timestamp)));
        forwarder.deliver(receiver, _metadata(), _report(asset, _input(80, uint64(block.timestamp))));
    }

    function testNewerReportOverwritesOlder() public {
        forwarder.deliver(receiver, _metadata(), _report(asset, _input(60, uint64(block.timestamp))));
        vm.warp(block.timestamp + 1 hours);
        forwarder.deliver(receiver, _metadata(), _report(asset, _input(85, uint64(block.timestamp))));

        MizanAIPreScreen.PreScreen memory result = store.getPreScreen(asset);
        assertEq(result.score, 85);
    }

    function testReceiverCanOnlyBeSetOnce() public {
        vm.expectRevert(MizanAIPreScreen.ReceiverAlreadySet.selector);
        store.setReceiver(address(receiver));
    }

    function testNonOwnerCannotSetReceiver() public {
        MizanAIPreScreen fresh = new MizanAIPreScreen(address(this));
        vm.prank(address(0xDEAD));
        vm.expectRevert();
        fresh.setReceiver(address(receiver));
    }

    function testERC165Interfaces() public view {
        assertTrue(receiver.supportsInterface(0x01ffc9a7));
        assertFalse(receiver.supportsInterface(0xffffffff));
    }
}
