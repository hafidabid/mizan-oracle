// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @notice One Sharia board of named members and one immutable policy. No funds, tokens, or upgrade proxy.
/// @dev A signature proves authorization, not the truth of a religious conclusion.
contract MizanRegistry is Ownable2Step, EIP712 {
    enum Outcome {
        Unset,
        Approved,
        Rejected,
        NeedsReview
    }

    // Everything here is signed. Scope and limitations live in the hashed evidence file.
    struct Issue {
        address asset;
        bytes32 subjectVersion;
        Outcome outcome;
        bytes32 evidenceHash;
        string evidenceURI;
        uint64 boardIssuedAt;
        uint64 expiresAt;
        uint64 deadline;
        uint256 previousId;
        uint256 nonce;
    }

    struct Revoke {
        uint256 assessmentId;
        bytes32 reasonHash;
        string reasonURI;
        uint64 deadline;
        uint256 nonce;
    }

    /// @notice Roster entry. The address is the identity; name and profile are display metadata.
    struct ShariaBoardMember {
        string name;
        string profileURI;
        bool active;
    }

    struct ShariaBoardMemberInput {
        address account;
        string name;
        string profileURI;
    }

    struct PolicyInput {
        bytes32 id;
        string uri;
        bytes32 hash;
    }

    struct BoardInput {
        ShariaBoardMemberInput[] shariaBoardMembers;
        uint16 quorum;
    }

    /// @notice One Sharia board member's own opinion on an Issue. Dissent is recorded, not discarded.
    struct Opinion {
        address shariaBoardMember;
        Outcome opinion;
        bytes signature;
    }

    struct ShariaBoardMemberSignature {
        address shariaBoardMember;
        bytes signature;
    }

    struct OpinionRecord {
        address shariaBoardMember;
        Outcome opinion;
    }

    /// @notice How many Sharia board members gave each opinion, against the quorum and active board size at the time.
    /// @dev `quorumMet` is false when fewer than `quorum` opinions matched the proposed outcome. The record is still
    ///      stored so the split is public, but its effective outcome is NeedsReview.
    struct Tally {
        uint16 approvals;
        uint16 rejections;
        uint16 needsReview;
        uint16 quorum;
        uint16 boardSize;
        bool quorumMet;
    }

    struct Assessment {
        Issue review;
        Tally tally;
        uint64 recordedAt;
        bool revoked;
        bytes32 revocationReasonHash;
        string revocationReasonURI;
        uint64 revokedAt;
    }

    struct Resolution {
        bool exists;
        uint256 assessmentId;
        Outcome outcome;
        bool expired;
        bool revoked;
        bool boardActive;
        Tally tally;
        bytes32 subjectVersion;
        bytes32 evidenceHash;
        string evidenceURI;
        uint64 boardIssuedAt;
        uint64 recordedAt;
        uint64 expiresAt;
    }

    bytes32 public immutable policyId;
    string public policyURI;
    bytes32 public immutable policyHash;
    bool public boardActive = true;
    address public receiver;
    uint16 public quorum;
    uint16 public activeShariaBoardMemberCount;
    uint256 public assessmentCount;
    mapping(address => ShariaBoardMember) public shariaBoardMembers;
    address[] private shariaBoardMemberList;
    mapping(uint256 => Assessment) private assessments;
    mapping(uint256 => OpinionRecord[]) private opinions;
    mapping(uint256 => address[]) private revokers;
    mapping(address => uint256) public latestId;
    mapping(uint256 => bool) public usedNonce;

    string private constant ISSUE_TYPE =
        "Issue(bytes32 policyId,address asset,bytes32 subjectVersion,uint8 outcome,bytes32 evidenceHash,string evidenceURI,uint64 boardIssuedAt,uint64 expiresAt,uint64 deadline,uint256 previousId,uint256 nonce)";
    bytes32 public constant ISSUE_TYPEHASH = keccak256(bytes(ISSUE_TYPE));
    bytes32 public constant OPINION_TYPEHASH =
        keccak256(abi.encodePacked("ShariaBoardMemberOpinion(Issue issue,uint8 opinion)", ISSUE_TYPE));
    bytes32 public constant REVOKE_TYPEHASH =
        keccak256("Revoke(uint256 assessmentId,bytes32 reasonHash,string reasonURI,uint64 deadline,uint256 nonce)");
    uint256 public constant MAX_URI_BYTES = 512;
    uint256 public constant MAX_SHARIA_BOARD_MEMBERS = 32;

    error InvalidInput();
    error OnlyReceiver();
    error ReceiverAlreadySet();
    error BoardSuspended();
    error InvalidSignature();
    error SignatureExpired();
    error NonceUsed();
    error StaleAssessment(uint256 expected, uint256 actual);
    error UnknownAssessment();
    error AlreadyRevoked();
    error InvalidQuorum();
    error NotActiveShariaBoardMember(address shariaBoardMember);
    error ShariaBoardMembersNotSorted();
    error QuorumNotMet(uint256 supporting, uint256 required);

    event ReceiverSet(address indexed receiver);
    event ShariaBoardMemberSet(address indexed shariaBoardMember, string name, string profileURI, bool active);
    event QuorumChanged(uint16 oldQuorum, uint16 newQuorum);
    event BoardActivityChanged(bool active);
    event AssessmentIssued(
        uint256 indexed id, address indexed asset, Outcome outcome, uint16 supporting, uint16 opinionCount
    );
    event OpinionRecorded(uint256 indexed id, address indexed shariaBoardMember, Outcome opinion);
    event AssessmentRevoked(uint256 indexed id, bytes32 reasonHash, string reasonURI, uint16 signerCount);

    constructor(address admin, PolicyInput memory policy, BoardInput memory board)
        Ownable(admin)
        EIP712("MizanOracle", "1")
    {
        if (policy.id == bytes32(0) || policy.hash == bytes32(0)) revert InvalidInput();
        _checkURI(policy.uri);
        _initBoard(board);
        policyId = policy.id;
        policyURI = policy.uri;
        policyHash = policy.hash;
    }

    /// @notice One-time wiring. A new transport configuration needs a new deployment.
    function setReceiver(address value) external onlyOwner {
        if (receiver != address(0)) revert ReceiverAlreadySet();
        if (value.code.length == 0) revert InvalidInput();
        receiver = value;
        emit ReceiverSet(value);
    }

    /// @notice Adds, renames, deactivates, or reactivates a Sharia board member. Past opinions keep their address.
    /// @dev Deactivation cannot leave fewer active Sharia board members than the quorum.
    function setShariaBoardMember(address account, string calldata name, string calldata profileURI, bool active)
        external
        onlyOwner
    {
        _setShariaBoardMember(account, name, profileURI, active);
        if (activeShariaBoardMemberCount < quorum) revert InvalidQuorum();
    }

    function setQuorum(uint16 value) external onlyOwner {
        _setQuorum(value);
    }

    function setBoardActive(bool value) external onlyOwner {
        boardActive = value;
        emit BoardActivityChanged(value);
    }

    /// @notice Records every member's opinion, whether or not they agree. At least `quorum` members must sign.
    /// @param input The proposed outcome. It takes effect only if at least `quorum` opinions match it;
    ///        otherwise the record is stored with effective outcome NeedsReview (no agreement).
    /// @param signed Opinions sorted by strictly ascending Sharia board member address (no duplicates).
    function publish(Issue calldata input, Opinion[] calldata signed) external returns (uint256 id) {
        if (msg.sender != receiver) revert OnlyReceiver();
        if (!boardActive) revert BoardSuspended();
        if (
            input.asset.code.length == 0 || input.subjectVersion == bytes32(0) || input.evidenceHash == bytes32(0)
                || input.outcome == Outcome.Unset
        ) revert InvalidInput();
        _checkURI(input.evidenceURI);
        if (input.boardIssuedAt == 0 || input.boardIssuedAt > block.timestamp || input.expiresAt <= input.boardIssuedAt)
        {
            revert InvalidInput();
        }
        if (input.previousId != latestId[input.asset]) {
            revert StaleAssessment(input.previousId, latestId[input.asset]);
        }
        _useNonce(input.nonce, input.deadline);

        id = ++assessmentCount;
        Assessment storage record = assessments[id];
        record.review = input;
        _recordOpinions(id, record, input, signed);
        record.tally.quorum = quorum;
        record.tally.boardSize = activeShariaBoardMemberCount;
        record.recordedAt = uint64(block.timestamp);
        latestId[input.asset] = id;
    }

    /// @notice Revocation is allowed while suspended, so a compromised board can withdraw records.
    /// @dev Needs `quorum` current Sharia board members. No old record is reactivated.
    function revoke(Revoke calldata input, ShariaBoardMemberSignature[] calldata signed) external {
        if (msg.sender != receiver) revert OnlyReceiver();
        Assessment storage record = _get(input.assessmentId);
        if (record.revoked) revert AlreadyRevoked();
        if (input.reasonHash == bytes32(0)) revert InvalidInput();
        _checkURI(input.reasonURI);
        _useNonce(input.nonce, input.deadline);

        bytes32 digest = hashRevoke(input);
        address last;
        for (uint256 i; i < signed.length; ++i) {
            address shariaBoardMember = signed[i].shariaBoardMember;
            _checkSigner(shariaBoardMember, last, digest, signed[i].signature);
            last = shariaBoardMember;
            revokers[input.assessmentId].push(shariaBoardMember);
        }
        if (signed.length < quorum) revert QuorumNotMet(signed.length, quorum);

        record.revoked = true;
        record.revocationReasonHash = input.reasonHash;
        record.revocationReasonURI = input.reasonURI;
        record.revokedAt = uint64(block.timestamp);
        emit AssessmentRevoked(input.assessmentId, input.reasonHash, input.reasonURI, uint16(signed.length));
    }

    function getAssessment(uint256 id) external view returns (Assessment memory) {
        return _get(id);
    }

    /// @notice Who gave which opinion on an assessment, in ascending address order.
    function getOpinions(uint256 id) external view returns (OpinionRecord[] memory) {
        _get(id);
        return opinions[id];
    }

    /// @notice Sharia board members who signed the revocation of an assessment (empty if not revoked).
    function getRevokers(uint256 id) external view returns (address[] memory) {
        _get(id);
        return revokers[id];
    }

    /// @notice Every address ever added to the roster, active or not. Read `shariaBoardMembers(addr)` for details.
    function getShariaBoardMembers() external view returns (address[] memory) {
        return shariaBoardMemberList;
    }

    /// @notice Returns facts only. Expiry does not change the board's original outcome.
    function resolve(address asset) external view returns (Resolution memory result) {
        result.boardActive = boardActive;
        uint256 id = latestId[asset];
        if (id == 0) return result;
        Assessment storage a = assessments[id];
        result.exists = true;
        result.assessmentId = id;
        result.outcome = _effectiveOutcome(a);
        result.expired = block.timestamp >= a.review.expiresAt;
        result.revoked = a.revoked;
        result.tally = a.tally;
        result.subjectVersion = a.review.subjectVersion;
        result.evidenceHash = a.review.evidenceHash;
        result.evidenceURI = a.review.evidenceURI;
        result.boardIssuedAt = a.review.boardIssuedAt;
        result.recordedAt = a.recordedAt;
        result.expiresAt = a.review.expiresAt;
    }

    /// @notice The outcome apps should use for a record: the proposed outcome if the quorum agreed, else NeedsReview.
    function getOutcome(uint256 id) external view returns (Outcome) {
        return _effectiveOutcome(_get(id));
    }

    /// @notice Digest a Sharia board member signs to give `opinion` on `input`. Policy is part of the signed Issue.
    function hashOpinion(Issue memory input, Outcome opinion) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(OPINION_TYPEHASH, _hashIssueStruct(input), uint8(opinion))));
    }

    function hashRevoke(Revoke memory input) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    REVOKE_TYPEHASH,
                    input.assessmentId,
                    input.reasonHash,
                    keccak256(bytes(input.reasonURI)),
                    input.deadline,
                    input.nonce
                )
            )
        );
    }

    function _recordOpinions(uint256 id, Assessment storage record, Issue calldata input, Opinion[] calldata signed)
        private
    {
        if (signed.length > MAX_SHARIA_BOARD_MEMBERS) revert InvalidInput();
        bytes32 issueHash = _hashIssueStruct(input);
        address last;
        uint16 supporting;
        for (uint256 i; i < signed.length; ++i) {
            Opinion calldata op = signed[i];
            if (op.opinion == Outcome.Unset) revert InvalidInput();
            bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(OPINION_TYPEHASH, issueHash, uint8(op.opinion))));
            _checkSigner(op.shariaBoardMember, last, digest, op.signature);
            last = op.shariaBoardMember;

            if (op.opinion == Outcome.Approved) ++record.tally.approvals;
            else if (op.opinion == Outcome.Rejected) ++record.tally.rejections;
            else ++record.tally.needsReview;
            if (op.opinion == input.outcome) ++supporting;
            opinions[id].push(OpinionRecord(op.shariaBoardMember, op.opinion));
            emit OpinionRecorded(id, op.shariaBoardMember, op.opinion);
        }
        // Fewer signers than the quorum could let a lone member replace the latest record.
        if (signed.length < quorum) revert QuorumNotMet(signed.length, quorum);
        record.tally.quorumMet = supporting >= quorum;
        emit AssessmentIssued(id, input.asset, _effectiveOutcome(record), supporting, uint16(signed.length));
    }

    function _effectiveOutcome(Assessment storage a) private view returns (Outcome) {
        return a.tally.quorumMet ? a.review.outcome : Outcome.NeedsReview;
    }

    function _hashIssueStruct(Issue memory input) private view returns (bytes32) {
        return keccak256(
            abi.encode(
                ISSUE_TYPEHASH,
                policyId,
                input.asset,
                input.subjectVersion,
                uint8(input.outcome),
                input.evidenceHash,
                keccak256(bytes(input.evidenceURI)),
                input.boardIssuedAt,
                input.expiresAt,
                input.deadline,
                input.previousId,
                input.nonce
            )
        );
    }

    /// @dev Strictly ascending addresses make duplicate signers impossible without a seen-set.
    function _checkSigner(address shariaBoardMember, address last, bytes32 digest, bytes calldata signature)
        private
        view
    {
        if (shariaBoardMember <= last) revert ShariaBoardMembersNotSorted();
        if (!shariaBoardMembers[shariaBoardMember].active) revert NotActiveShariaBoardMember(shariaBoardMember);
        if (ECDSA.recover(digest, signature) != shariaBoardMember) {
            revert InvalidSignature();
        }
    }

    function _useNonce(uint256 nonce, uint64 deadline) private {
        if (block.timestamp > deadline) revert SignatureExpired();
        if (usedNonce[nonce]) revert NonceUsed();
        usedNonce[nonce] = true;
    }

    function _initBoard(BoardInput memory board) private {
        for (uint256 i; i < board.shariaBoardMembers.length; ++i) {
            ShariaBoardMemberInput memory s = board.shariaBoardMembers[i];
            if (shariaBoardMembers[s.account].active) revert InvalidInput();
            _setShariaBoardMember(s.account, s.name, s.profileURI, true);
        }
        _setQuorum(board.quorum);
    }

    function _setShariaBoardMember(address account, string memory name, string memory profileURI, bool active)
        private
    {
        if (account == address(0) || bytes(name).length == 0 || bytes(name).length > 128) revert InvalidInput();
        _checkURI(profileURI);
        ShariaBoardMember storage s = shariaBoardMembers[account];
        if (bytes(s.name).length == 0) shariaBoardMemberList.push(account);
        if (active && !s.active) {
            if (activeShariaBoardMemberCount == MAX_SHARIA_BOARD_MEMBERS) revert InvalidInput();
            ++activeShariaBoardMemberCount;
        } else if (!active && s.active) {
            --activeShariaBoardMemberCount;
        }
        s.name = name;
        s.profileURI = profileURI;
        s.active = active;
        emit ShariaBoardMemberSet(account, name, profileURI, active);
    }

    function _setQuorum(uint16 value) private {
        if (value == 0 || value > activeShariaBoardMemberCount) revert InvalidQuorum();
        emit QuorumChanged(quorum, value);
        quorum = value;
    }

    function _get(uint256 id) private view returns (Assessment storage) {
        if (id == 0 || id > assessmentCount) revert UnknownAssessment();
        return assessments[id];
    }

    function _checkURI(string memory uri) private pure {
        if (bytes(uri).length == 0 || bytes(uri).length > MAX_URI_BYTES) {
            revert InvalidInput();
        }
    }
}
