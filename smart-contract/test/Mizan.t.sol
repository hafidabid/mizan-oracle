// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MizanRegistry} from "../src/MizanRegistry.sol";
import {MizanReceiver} from "../src/MizanReceiver.sol";
import {MizanConsumer} from "../src/examples/MizanConsumer.sol";
import {IReportReceiver} from "../src/interfaces/IReportReceiver.sol";
import {MockForwarder} from "./MockForwarder.sol";
import {MockAsset} from "./MockAsset.sol";

contract MizanTest is Test {
    // Three Sharia board members, quorum 2. Keys sorted by address in setUp.
    uint256[] keys;
    bytes32 constant WORKFLOW = keccak256("mizan-test-workflow");
    address constant AUTHOR = address(0xCAFE);
    MizanRegistry registry;
    MizanReceiver receiver;
    MizanConsumer consumer;
    MockForwarder forwarder;
    address asset;
    address secondAsset;

    function setUp() public {
        vm.warp(1_800_000_000);
        keys = _sorted([uint256(0x5C01), 0x5C02, 0x5C03]);
        registry = new MizanRegistry(
            address(this),
            MizanRegistry.PolicyInput(keccak256("demo-policy-v1"), "ipfs://demo-policy", keccak256("policy bytes")),
            _board(2)
        );
        forwarder = new MockForwarder(address(this));
        receiver = new MizanReceiver(registry, address(forwarder), WORKFLOW, AUTHOR);
        registry.setReceiver(address(receiver));
        consumer = new MizanConsumer(registry);
        asset = address(new MockAsset());
        secondAsset = address(new MockAsset());
    }

    function _issue(address subject, uint256 nonce) internal view returns (MizanRegistry.Issue memory) {
        return MizanRegistry.Issue(
            subject,
            keccak256("version-1"),
            MizanRegistry.Outcome.Approved,
            keccak256("evidence bytes"),
            "ipfs://evidence",
            uint64(block.timestamp),
            uint64(block.timestamp + 7 days),
            uint64(block.timestamp + 1 days),
            0,
            nonce
        );
    }

    function _sorted(uint256[3] memory input) internal pure returns (uint256[] memory out) {
        out = new uint256[](3);
        for (uint256 i; i < 3; ++i) {
            out[i] = input[i];
            for (uint256 j = i; j > 0 && vm.addr(out[j]) < vm.addr(out[j - 1]); --j) {
                (out[j], out[j - 1]) = (out[j - 1], out[j]);
            }
        }
    }

    function _board(uint16 quorum) internal view returns (MizanRegistry.BoardInput memory board) {
        board.quorum = quorum;
        board.shariaBoardMembers = new MizanRegistry.ShariaBoardMemberInput[](keys.length);
        for (uint256 i; i < keys.length; ++i) {
            board.shariaBoardMembers[i] = MizanRegistry.ShariaBoardMemberInput(
                vm.addr(keys[i]),
                string.concat("Sharia Board Member ", vm.toString(i)),
                "ipfs://sharia-board-member-profile"
            );
        }
    }

    function _opinion(MizanRegistry.Issue memory input, uint256 key, MizanRegistry.Outcome opinion)
        internal
        view
        returns (MizanRegistry.Opinion memory)
    {
        return MizanRegistry.Opinion(vm.addr(key), opinion, _sign(registry.hashOpinion(input, opinion), key));
    }

    /// @dev Every Sharia board member gives the same opinion as the final outcome.
    function _unanimous(MizanRegistry.Issue memory input) internal view returns (MizanRegistry.Opinion[] memory ops) {
        ops = new MizanRegistry.Opinion[](keys.length);
        for (uint256 i; i < keys.length; ++i) {
            ops[i] = _opinion(input, keys[i], input.outcome);
        }
    }

    function _revokeSigs(MizanRegistry.Revoke memory input, uint256 count)
        internal
        view
        returns (MizanRegistry.ShariaBoardMemberSignature[] memory sigs)
    {
        sigs = new MizanRegistry.ShariaBoardMemberSignature[](count);
        for (uint256 i; i < count; ++i) {
            sigs[i] =
                MizanRegistry.ShariaBoardMemberSignature(vm.addr(keys[i]), _sign(registry.hashRevoke(input), keys[i]));
        }
    }

    function _sign(bytes32 digest, uint256 key) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _metadata() internal pure returns (bytes memory) {
        return abi.encodePacked(WORKFLOW, bytes10("mizan"), AUTHOR, bytes2(0));
    }

    function _report(MizanRegistry.Issue memory input, MizanRegistry.Opinion[] memory ops)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encode(uint8(2), uint8(0), abi.encode(input), abi.encode(ops));
    }

    // External test helpers keep expectRevert on the whole delivery, not on hashOpinion().
    function deliverIssue(MizanRegistry.Issue memory input) external {
        forwarder.deliver(receiver, _metadata(), _report(input, _unanimous(input)));
    }

    function deliverWithOpinions(MizanRegistry.Issue memory input, MizanRegistry.Opinion[] memory ops) external {
        forwarder.deliver(receiver, _metadata(), _report(input, ops));
    }

    function _revoke(uint256 id, uint256 nonce) internal view returns (MizanRegistry.Revoke memory) {
        return MizanRegistry.Revoke(id, keccak256("reason"), "ipfs://reason", uint64(block.timestamp + 1 days), nonce);
    }

    function deliverRevocationSigs(
        MizanRegistry.Revoke memory input,
        MizanRegistry.ShariaBoardMemberSignature[] memory sigs
    ) external {
        forwarder.deliver(receiver, _metadata(), abi.encode(uint8(2), uint8(1), abi.encode(input), abi.encode(sigs)));
    }

    function deliverRevocation(uint256 id, uint256 nonce) external {
        MizanRegistry.Revoke memory input = _revoke(id, nonce);
        this.deliverRevocationSigs(input, _revokeSigs(input, 2));
    }

    function testPublishAndResolve() public {
        this.deliverIssue(_issue(asset, 1));
        MizanRegistry.Resolution memory r = registry.resolve(asset);
        assertTrue(r.exists);
        assertEq(r.assessmentId, 1);
        assertEq(uint8(r.outcome), uint8(MizanRegistry.Outcome.Approved));
        assertEq(r.tally.approvals, 3);
        assertEq(r.tally.rejections, 0);
        assertEq(r.tally.needsReview, 0);
        assertEq(r.tally.quorum, 2);
        assertEq(r.tally.boardSize, 3);
        assertTrue(r.tally.quorumMet);
        assertEq(r.recordedAt, block.timestamp);
        assertFalse(r.expired);
        assertFalse(r.revoked);
        assertEq(r.evidenceURI, "ipfs://evidence");
    }

    function testUnknownAssetHasNoAssessment() public view {
        MizanRegistry.Resolution memory r = registry.resolve(asset);
        assertFalse(r.exists);
        assertEq(r.assessmentId, 0);
        assertTrue(r.boardActive);
    }

    function testConsumerUnassessedMatrix() public view {
        assertTrue(consumer.isAllowed(asset, MizanConsumer.Requirement.None));
        assertFalse(consumer.isAllowed(asset, MizanConsumer.Requirement.PriorApproval));
        assertFalse(consumer.isAllowed(asset, MizanConsumer.Requirement.CurrentApproval));
    }

    function testConsumerCurrentMatrix() public {
        this.deliverIssue(_issue(asset, 1));
        assertTrue(consumer.isAllowed(asset, MizanConsumer.Requirement.None));
        assertTrue(consumer.isAllowed(asset, MizanConsumer.Requirement.PriorApproval));
        assertTrue(consumer.isAllowed(asset, MizanConsumer.Requirement.CurrentApproval));
    }

    function testExactExpiryBoundaryPreservesOutcome() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        this.deliverIssue(input);
        vm.warp(input.expiresAt - 1);
        assertFalse(registry.resolve(asset).expired);
        vm.warp(input.expiresAt);
        MizanRegistry.Resolution memory r = registry.resolve(asset);
        assertTrue(r.expired);
        assertEq(uint8(r.outcome), uint8(MizanRegistry.Outcome.Approved));
        assertTrue(consumer.isAllowed(asset, MizanConsumer.Requirement.None));
        assertTrue(consumer.isAllowed(asset, MizanConsumer.Requirement.PriorApproval));
        assertFalse(consumer.isAllowed(asset, MizanConsumer.Requirement.CurrentApproval));
    }

    function testFuzzExpiry(uint32 elapsed) public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        this.deliverIssue(input);
        vm.warp(uint256(input.boardIssuedAt) + elapsed);
        assertEq(registry.resolve(asset).expired, elapsed >= 7 days);
    }

    function testReplaceWithRejectionDoesNotFallBack() public {
        this.deliverIssue(_issue(asset, 1));
        MizanRegistry.Issue memory input = _issue(asset, 2);
        input.previousId = 1;
        input.outcome = MizanRegistry.Outcome.Rejected;
        this.deliverIssue(input);
        assertEq(registry.latestId(asset), 2);
        assertFalse(consumer.isAllowed(asset, MizanConsumer.Requirement.PriorApproval));
        assertFalse(consumer.isAllowed(asset, MizanConsumer.Requirement.CurrentApproval));
        assertTrue(consumer.isAllowed(asset, MizanConsumer.Requirement.None));
        assertEq(uint8(registry.getAssessment(1).review.outcome), uint8(MizanRegistry.Outcome.Approved));
    }

    function testNeedsReviewDoesNotPass() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        input.outcome = MizanRegistry.Outcome.NeedsReview;
        this.deliverIssue(input);
        assertTrue(consumer.isAllowed(asset, MizanConsumer.Requirement.None));
        assertFalse(consumer.isAllowed(asset, MizanConsumer.Requirement.PriorApproval));
        assertFalse(consumer.isAllowed(asset, MizanConsumer.Requirement.CurrentApproval));
    }

    function testRevokePreservesLatestAndReason() public {
        this.deliverIssue(_issue(asset, 1));
        this.deliverRevocation(1, 2);
        assertTrue(registry.resolve(asset).revoked);
        assertEq(registry.latestId(asset), 1);
        assertEq(registry.getAssessment(1).revocationReasonURI, "ipfs://reason");
        assertTrue(consumer.isAllowed(asset, MizanConsumer.Requirement.None));
        assertFalse(consumer.isAllowed(asset, MizanConsumer.Requirement.PriorApproval));
        assertFalse(consumer.isAllowed(asset, MizanConsumer.Requirement.CurrentApproval));
    }

    function testRevocationOfOldRecordDoesNotRevokeReplacement() public {
        this.deliverIssue(_issue(asset, 1));
        MizanRegistry.Issue memory replacement = _issue(asset, 2);
        replacement.previousId = 1;
        this.deliverIssue(replacement);
        this.deliverRevocation(1, 3);
        assertFalse(registry.resolve(asset).revoked);
        assertTrue(registry.getAssessment(1).revoked);
        assertEq(registry.latestId(asset), 2);
    }

    function testRevocationIsPermanentButNewAssessmentRestoresApproval() public {
        this.deliverIssue(_issue(asset, 1));
        this.deliverRevocation(1, 2);
        MizanRegistry.Issue memory replacement = _issue(asset, 3);
        replacement.previousId = 1;
        this.deliverIssue(replacement);
        assertTrue(registry.getAssessment(1).revoked);
        assertTrue(consumer.isAllowed(asset, MizanConsumer.Requirement.CurrentApproval));
    }

    function testCannotRevokeTwice() public {
        this.deliverIssue(_issue(asset, 1));
        this.deliverRevocation(1, 2);
        vm.expectRevert(MizanRegistry.AlreadyRevoked.selector);
        this.deliverRevocation(1, 3);
    }

    function testUnknownAssessmentCannotBeReadOrRevoked() public {
        vm.expectRevert(MizanRegistry.UnknownAssessment.selector);
        registry.getAssessment(0);
        vm.expectRevert(MizanRegistry.UnknownAssessment.selector);
        this.deliverRevocation(99, 1);
    }

    function testStalePredecessorFails() public {
        this.deliverIssue(_issue(asset, 1));
        MizanRegistry.Issue memory stale = _issue(asset, 2);
        vm.expectRevert(abi.encodeWithSelector(MizanRegistry.StaleAssessment.selector, 0, 1));
        this.deliverIssue(stale);
    }

    function testReplayNonceCannotBeUsedOnAnotherAsset() public {
        this.deliverIssue(_issue(asset, 1));
        MizanRegistry.Issue memory input = _issue(secondAsset, 1);
        vm.expectRevert(MizanRegistry.NonceUsed.selector);
        this.deliverIssue(input);
    }

    function testNonceIsSharedAcrossIssueAndRevocation() public {
        this.deliverIssue(_issue(asset, 1));
        vm.expectRevert(MizanRegistry.NonceUsed.selector);
        this.deliverRevocation(1, 1);
    }

    function testProductsCanUpdateIndependently() public {
        this.deliverIssue(_issue(asset, 100));
        this.deliverIssue(_issue(secondAsset, 3));
        assertEq(registry.latestId(asset), 1);
        assertEq(registry.latestId(secondAsset), 2);
    }

    function testWrongSignerFails() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        MizanRegistry.Opinion[] memory ops = _unanimous(input);
        ops[0].signature = _sign(registry.hashOpinion(input, input.outcome), 0xBAD);
        vm.expectRevert(MizanRegistry.InvalidSignature.selector);
        this.deliverWithOpinions(input, ops);
    }

    function testTamperedEvidenceURIFails() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        MizanRegistry.Opinion[] memory ops = _unanimous(input);
        input.evidenceURI = "ipfs://tampered";
        vm.expectRevert(MizanRegistry.InvalidSignature.selector);
        this.deliverWithOpinions(input, ops);
    }

    function testFuzzTamperedEvidenceHashFails(bytes32 hash) public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        vm.assume(hash != bytes32(0) && hash != input.evidenceHash);
        MizanRegistry.Opinion[] memory ops = _unanimous(input);
        input.evidenceHash = hash;
        vm.expectRevert(MizanRegistry.InvalidSignature.selector);
        this.deliverWithOpinions(input, ops);
    }

    function testTamperedOutcomeFails() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        MizanRegistry.Opinion[] memory ops = _unanimous(input);
        input.outcome = MizanRegistry.Outcome.Rejected;
        for (uint256 i; i < ops.length; ++i) {
            ops[i].opinion = MizanRegistry.Outcome.Rejected;
        }
        vm.expectRevert(MizanRegistry.InvalidSignature.selector);
        this.deliverWithOpinions(input, ops);
    }

    function testDifferentChainInvalidatesSignature() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        MizanRegistry.Opinion[] memory ops = _unanimous(input);
        vm.chainId(1);
        vm.expectRevert(MizanRegistry.InvalidSignature.selector);
        this.deliverWithOpinions(input, ops);
    }

    function testDifferentRegistryHasDifferentDigest() public {
        MizanRegistry another = new MizanRegistry(
            address(this),
            MizanRegistry.PolicyInput(registry.policyId(), registry.policyURI(), registry.policyHash()),
            _board(2)
        );
        MizanRegistry.Outcome approved = MizanRegistry.Outcome.Approved;
        assertNotEq(registry.hashOpinion(_issue(asset, 1), approved), another.hashOpinion(_issue(asset, 1), approved));
    }

    function testExpiredSignatureFails() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        input.deadline = uint64(block.timestamp - 1);
        vm.expectRevert(MizanRegistry.SignatureExpired.selector);
        this.deliverIssue(input);
    }

    function testSignatureAcceptedAtExactDeadline() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        input.deadline = uint64(block.timestamp);
        this.deliverIssue(input);
        assertEq(registry.assessmentCount(), 1);
    }

    function testFutureIssueDateFails() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        input.boardIssuedAt += 1;
        vm.expectRevert(MizanRegistry.InvalidInput.selector);
        this.deliverIssue(input);
    }

    function testInvalidExpiryFails() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        input.expiresAt = input.boardIssuedAt;
        vm.expectRevert(MizanRegistry.InvalidInput.selector);
        this.deliverIssue(input);
    }

    function testExpiredAssessmentCanBeImportedWithoutLookingActive() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        input.boardIssuedAt = uint64(block.timestamp - 2 days);
        input.expiresAt = uint64(block.timestamp - 1 days);
        this.deliverIssue(input);
        assertTrue(registry.resolve(asset).expired);
        assertFalse(consumer.isAllowed(asset, MizanConsumer.Requirement.CurrentApproval));
    }

    function testInvalidAssetFails() public {
        vm.expectRevert(MizanRegistry.InvalidInput.selector);
        this.deliverIssue(_issue(address(0x123), 1));
    }

    function testEmptyEvidenceURIFails() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        input.evidenceURI = "";
        vm.expectRevert(MizanRegistry.InvalidInput.selector);
        this.deliverIssue(input);
    }

    function testOversizedEvidenceURIFails() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        input.evidenceURI = string(new bytes(513));
        vm.expectRevert(MizanRegistry.InvalidInput.selector);
        this.deliverIssue(input);
    }

    function testUnsetOutcomeFails() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        input.outcome = MizanRegistry.Outcome.Unset;
        vm.expectRevert(MizanRegistry.InvalidInput.selector);
        this.deliverIssue(input);
    }

    function testSuspensionBlocksPublishingAndConsumersButPermitsRevocation() public {
        this.deliverIssue(_issue(asset, 1));
        registry.setBoardActive(false);
        assertFalse(consumer.isAllowed(asset, MizanConsumer.Requirement.PriorApproval));
        assertFalse(consumer.isAllowed(asset, MizanConsumer.Requirement.CurrentApproval));
        assertTrue(consumer.isAllowed(asset, MizanConsumer.Requirement.None));
        vm.expectRevert(MizanRegistry.BoardSuspended.selector);
        this.deliverIssue(_issue(secondAsset, 2));
        this.deliverRevocation(1, 3);
        assertTrue(registry.resolve(asset).revoked);
    }

    function testDeactivatedShariaBoardMemberKeepsHistoryButCannotSignAgain() public {
        this.deliverIssue(_issue(asset, 1));
        registry.setShariaBoardMember(
            vm.addr(keys[2]), "Sharia Board Member 2", "ipfs://sharia-board-member-profile", false
        );
        assertEq(registry.getOpinions(1)[2].shariaBoardMember, vm.addr(keys[2]));
        assertTrue(consumer.isAllowed(asset, MizanConsumer.Requirement.CurrentApproval));
        vm.expectRevert(abi.encodeWithSelector(MizanRegistry.NotActiveShariaBoardMember.selector, vm.addr(keys[2])));
        this.deliverIssue(_issue(secondAsset, 2));
    }

    function testOnlyReceiverCanPublish() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        MizanRegistry.Opinion[] memory ops = _unanimous(input);
        vm.expectRevert(MizanRegistry.OnlyReceiver.selector);
        registry.publish(input, ops);
    }

    function testUntrustedCallerCannotSpoofMetadata() public {
        vm.expectRevert(MizanReceiver.UntrustedForwarder.selector);
        receiver.onReport(_metadata(), "");
    }

    function testWrongWorkflowFails() public {
        bytes memory bad = abi.encodePacked(bytes32(uint256(9)), bytes10("mizan"), AUTHOR);
        vm.expectRevert(MizanReceiver.WrongWorkflow.selector);
        forwarder.deliver(receiver, bad, "");
    }

    function testWrongWorkflowOwnerFails() public {
        bytes memory bad = abi.encodePacked(WORKFLOW, bytes10("mizan"), address(0xBAD));
        vm.expectRevert(MizanReceiver.WrongWorkflow.selector);
        forwarder.deliver(receiver, bad, "");
    }

    function testMetadata62ByteToolingFormWorks() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        forwarder.deliver(
            receiver, abi.encodePacked(WORKFLOW, bytes10("mizan"), AUTHOR), _report(input, _unanimous(input))
        );
        assertEq(registry.assessmentCount(), 1);
    }

    function testMalformedMetadataFails() public {
        vm.expectRevert(MizanReceiver.InvalidMetadata.selector);
        forwarder.deliver(receiver, hex"1234", "");
    }

    function testUnsupportedSchemaFails() public {
        vm.expectRevert(MizanReceiver.UnsupportedReport.selector);
        forwarder.deliver(receiver, _metadata(), abi.encode(uint8(1), uint8(0), bytes(""), bytes("")));
    }

    function testUnsupportedActionFails() public {
        vm.expectRevert(MizanReceiver.UnsupportedReport.selector);
        forwarder.deliver(receiver, _metadata(), abi.encode(uint8(2), uint8(2), bytes(""), bytes("")));
    }

    function testMalformedReportFails() public {
        vm.expectRevert();
        forwarder.deliver(receiver, _metadata(), hex"00");
    }

    function testERC165Interfaces() public view {
        assertTrue(receiver.supportsInterface(0x01ffc9a7));
        assertTrue(receiver.supportsInterface(type(IReportReceiver).interfaceId));
        assertFalse(receiver.supportsInterface(0xffffffff));
    }

    function testReceiverCanOnlyBeSetOnce() public {
        vm.expectRevert(MizanRegistry.ReceiverAlreadySet.selector);
        registry.setReceiver(address(receiver));
    }

    function testNonOwnerCannotChangeBoardOrSuspend() public {
        vm.startPrank(address(0xBAD));
        vm.expectRevert();
        registry.setShariaBoardMember(address(0x123), "Intruder", "ipfs://x", true);
        vm.expectRevert();
        registry.setQuorum(1);
        vm.expectRevert();
        registry.setBoardActive(false);
        vm.stopPrank();
    }

    function testOwnershipTransferNeedsAcceptance() public {
        registry.transferOwnership(address(0x123));
        assertEq(registry.owner(), address(this));
        vm.prank(address(0x123));
        registry.acceptOwnership();
        assertEq(registry.owner(), address(0x123));
    }

    // ---- Sharia board: who gave which opinion, and how many ----

    function testRecordsWhoGaveWhichOpinionIncludingDissent() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        MizanRegistry.Opinion[] memory ops = new MizanRegistry.Opinion[](3);
        ops[0] = _opinion(input, keys[0], MizanRegistry.Outcome.Approved);
        ops[1] = _opinion(input, keys[1], MizanRegistry.Outcome.NeedsReview);
        ops[2] = _opinion(input, keys[2], MizanRegistry.Outcome.Approved);
        this.deliverWithOpinions(input, ops);

        MizanRegistry.Resolution memory r = registry.resolve(asset);
        assertEq(r.tally.approvals, 2);
        assertEq(r.tally.rejections, 0);
        assertEq(r.tally.needsReview, 1);
        assertEq(r.tally.quorum, 2);
        assertEq(r.tally.boardSize, 3);
        assertTrue(r.tally.quorumMet);

        MizanRegistry.OpinionRecord[] memory recorded = registry.getOpinions(1);
        assertEq(recorded.length, 3);
        assertEq(recorded[1].shariaBoardMember, vm.addr(keys[1]));
        assertEq(uint8(recorded[1].opinion), uint8(MizanRegistry.Outcome.NeedsReview));
        (string memory name,, bool active) = registry.shariaBoardMembers(recorded[1].shariaBoardMember);
        assertEq(name, "Sharia Board Member 1");
        assertTrue(active);
        assertTrue(consumer.isAllowed(asset, MizanConsumer.Requirement.CurrentApproval));
    }

    function testSubsetOfBoardMeetingQuorumIsAccepted() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        MizanRegistry.Opinion[] memory ops = new MizanRegistry.Opinion[](2);
        ops[0] = _opinion(input, keys[0], MizanRegistry.Outcome.Approved);
        ops[1] = _opinion(input, keys[2], MizanRegistry.Outcome.Approved);
        this.deliverWithOpinions(input, ops);
        assertEq(registry.resolve(asset).tally.approvals, 2);
        assertEq(registry.getOpinions(1).length, 2);
    }

    /// 1 approves, 2 reject, but Approved was proposed: stored with the split visible, effective outcome NeedsReview.
    function testProposalWithoutQuorumIsStoredAsNeedsReview() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        MizanRegistry.Opinion[] memory ops = new MizanRegistry.Opinion[](3);
        ops[0] = _opinion(input, keys[0], MizanRegistry.Outcome.Approved);
        ops[1] = _opinion(input, keys[1], MizanRegistry.Outcome.Rejected);
        ops[2] = _opinion(input, keys[2], MizanRegistry.Outcome.Rejected);
        this.deliverWithOpinions(input, ops);

        MizanRegistry.Resolution memory r = registry.resolve(asset);
        assertEq(uint8(r.outcome), uint8(MizanRegistry.Outcome.NeedsReview));
        assertFalse(r.tally.quorumMet);
        assertEq(r.tally.approvals, 1);
        assertEq(r.tally.rejections, 2);
        assertEq(uint8(registry.getOutcome(1)), uint8(MizanRegistry.Outcome.NeedsReview));
        assertEq(uint8(registry.getAssessment(1).review.outcome), uint8(MizanRegistry.Outcome.Approved));
        assertFalse(consumer.isAllowed(asset, MizanConsumer.Requirement.PriorApproval));
        assertFalse(consumer.isAllowed(asset, MizanConsumer.Requirement.CurrentApproval));
    }

    /// 1 approves, 2 reject, Rejected proposed: quorum agrees, so the record is Rejected.
    function testMajorityRejectionIsRecordedWithMinorityApproval() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        input.outcome = MizanRegistry.Outcome.Rejected;
        MizanRegistry.Opinion[] memory ops = new MizanRegistry.Opinion[](3);
        ops[0] = _opinion(input, keys[0], MizanRegistry.Outcome.Approved);
        ops[1] = _opinion(input, keys[1], MizanRegistry.Outcome.Rejected);
        ops[2] = _opinion(input, keys[2], MizanRegistry.Outcome.Rejected);
        this.deliverWithOpinions(input, ops);

        MizanRegistry.Resolution memory r = registry.resolve(asset);
        assertEq(uint8(r.outcome), uint8(MizanRegistry.Outcome.Rejected));
        assertTrue(r.tally.quorumMet);
        assertEq(r.tally.approvals, 1);
        assertEq(r.tally.rejections, 2);
        MizanRegistry.OpinionRecord[] memory who = registry.getOpinions(1);
        assertEq(who[0].shariaBoardMember, vm.addr(keys[0]));
        assertEq(uint8(who[0].opinion), uint8(MizanRegistry.Outcome.Approved));
    }

    /// 1 approves, 1 rejects, 1 does not sign: no agreement, but the split is public.
    function testSplitBoardIsRecordedAsNeedsReview() public {
        this.deliverIssue(_issue(asset, 1));
        MizanRegistry.Issue memory input = _issue(asset, 2);
        input.previousId = 1;
        MizanRegistry.Opinion[] memory ops = new MizanRegistry.Opinion[](2);
        ops[0] = _opinion(input, keys[0], MizanRegistry.Outcome.Approved);
        ops[1] = _opinion(input, keys[2], MizanRegistry.Outcome.Rejected);
        this.deliverWithOpinions(input, ops);

        MizanRegistry.Resolution memory r = registry.resolve(asset);
        assertEq(r.assessmentId, 2);
        assertEq(uint8(r.outcome), uint8(MizanRegistry.Outcome.NeedsReview));
        assertFalse(r.tally.quorumMet);
        assertEq(r.tally.approvals, 1);
        assertEq(r.tally.rejections, 1);
        assertEq(r.tally.needsReview, 0);
        assertEq(registry.getOpinions(2).length, 2);
        // The split replaces the earlier approval: apps that need approval now block.
        assertFalse(consumer.isAllowed(asset, MizanConsumer.Requirement.CurrentApproval));
    }

    function testLoneMemberCannotPublish() public {
        this.deliverIssue(_issue(asset, 1));
        MizanRegistry.Issue memory input = _issue(asset, 2);
        input.previousId = 1;
        input.outcome = MizanRegistry.Outcome.Rejected;
        MizanRegistry.Opinion[] memory ops = new MizanRegistry.Opinion[](1);
        ops[0] = _opinion(input, keys[1], MizanRegistry.Outcome.Rejected);
        vm.expectRevert(abi.encodeWithSelector(MizanRegistry.QuorumNotMet.selector, 1, 2));
        this.deliverWithOpinions(input, ops);
        assertTrue(consumer.isAllowed(asset, MizanConsumer.Requirement.CurrentApproval));
    }

    function testNoOpinionsFails() public {
        vm.expectRevert(abi.encodeWithSelector(MizanRegistry.QuorumNotMet.selector, 0, 2));
        this.deliverWithOpinions(_issue(asset, 1), new MizanRegistry.Opinion[](0));
    }

    function testDuplicateShariaBoardMemberCannotBeCountedTwice() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        MizanRegistry.Opinion[] memory ops = new MizanRegistry.Opinion[](2);
        ops[0] = _opinion(input, keys[0], MizanRegistry.Outcome.Approved);
        ops[1] = ops[0];
        vm.expectRevert(MizanRegistry.ShariaBoardMembersNotSorted.selector);
        this.deliverWithOpinions(input, ops);
    }

    function testUnsortedOpinionsFail() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        MizanRegistry.Opinion[] memory ops = _unanimous(input);
        (ops[0], ops[1]) = (ops[1], ops[0]);
        vm.expectRevert(MizanRegistry.ShariaBoardMembersNotSorted.selector);
        this.deliverWithOpinions(input, ops);
    }

    function testNonShariaBoardMemberSignatureFails() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        MizanRegistry.Opinion[] memory ops = new MizanRegistry.Opinion[](1);
        ops[0] = _opinion(input, 0xBAD, MizanRegistry.Outcome.Approved);
        vm.expectRevert(abi.encodeWithSelector(MizanRegistry.NotActiveShariaBoardMember.selector, vm.addr(0xBAD)));
        this.deliverWithOpinions(input, ops);
    }

    function testOpinionCannotBeRelabelled() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        MizanRegistry.Opinion[] memory ops = _unanimous(input);
        ops[2].opinion = MizanRegistry.Outcome.Rejected;
        vm.expectRevert(MizanRegistry.InvalidSignature.selector);
        this.deliverWithOpinions(input, ops);
    }

    function testUnsetOpinionFails() public {
        MizanRegistry.Issue memory input = _issue(asset, 1);
        MizanRegistry.Opinion[] memory ops = _unanimous(input);
        ops[0] = _opinion(input, keys[0], MizanRegistry.Outcome.Unset);
        vm.expectRevert(MizanRegistry.InvalidInput.selector);
        this.deliverWithOpinions(input, ops);
    }

    function testRevocationNeedsQuorumAndRecordsRevokers() public {
        this.deliverIssue(_issue(asset, 1));
        MizanRegistry.Revoke memory input = _revoke(1, 2);
        MizanRegistry.ShariaBoardMemberSignature[] memory one = _revokeSigs(input, 1);
        vm.expectRevert(abi.encodeWithSelector(MizanRegistry.QuorumNotMet.selector, 1, 2));
        this.deliverRevocationSigs(input, one);

        this.deliverRevocationSigs(input, _revokeSigs(input, 2));
        address[] memory who = registry.getRevokers(1);
        assertEq(who.length, 2);
        assertEq(who[0], vm.addr(keys[0]));
        assertEq(who[1], vm.addr(keys[1]));
    }

    function testRosterIsReadable() public view {
        address[] memory roster = registry.getShariaBoardMembers();
        assertEq(roster.length, 3);
        assertEq(registry.activeShariaBoardMemberCount(), 3);
        assertEq(registry.quorum(), 2);
        (string memory name, string memory profile, bool active) = registry.shariaBoardMembers(roster[0]);
        assertEq(name, "Sharia Board Member 0");
        assertEq(profile, "ipfs://sharia-board-member-profile");
        assertTrue(active);
    }

    function testQuorumBounds() public {
        vm.expectRevert(MizanRegistry.InvalidQuorum.selector);
        registry.setQuorum(0);
        vm.expectRevert(MizanRegistry.InvalidQuorum.selector);
        registry.setQuorum(4);
        registry.setQuorum(3);
        vm.expectRevert(MizanRegistry.InvalidQuorum.selector);
        registry.setShariaBoardMember(
            vm.addr(keys[0]), "Sharia Board Member 0", "ipfs://sharia-board-member-profile", false
        );
    }

    function testAddedShariaBoardMemberCanSignAndRosterGrows() public {
        uint256 newKey = 0x5C04;
        registry.setShariaBoardMember(vm.addr(newKey), "New Sharia Board Member", "ipfs://new", true);
        assertEq(registry.activeShariaBoardMemberCount(), 4);
        assertEq(registry.getShariaBoardMembers().length, 4);
        MizanRegistry.Issue memory input = _issue(asset, 1);
        MizanRegistry.Opinion[] memory ops = new MizanRegistry.Opinion[](2);
        (uint256 a, uint256 b) = vm.addr(newKey) < vm.addr(keys[0]) ? (newKey, keys[0]) : (keys[0], newKey);
        ops[0] = _opinion(input, a, MizanRegistry.Outcome.Approved);
        ops[1] = _opinion(input, b, MizanRegistry.Outcome.Approved);
        this.deliverWithOpinions(input, ops);
        assertEq(registry.resolve(asset).tally.boardSize, 4);
    }

    function testConstructorRejectsDuplicateShariaBoardMemberAndBadQuorum() public {
        MizanRegistry.PolicyInput memory policy = MizanRegistry.PolicyInput(keccak256("p"), "ipfs://p", keccak256("h"));
        MizanRegistry.BoardInput memory board = _board(1);
        board.shariaBoardMembers[1] = board.shariaBoardMembers[0];
        vm.expectRevert(MizanRegistry.InvalidInput.selector);
        new MizanRegistry(address(this), policy, board);
        vm.expectRevert(MizanRegistry.InvalidQuorum.selector);
        new MizanRegistry(address(this), policy, _board(4));
    }
}
