// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Advisory-only AI pre-screen store for assets the Sharia board has not reviewed.
/// @dev Deliberately separate from MizanRegistry: different contract, different ABI shape, no
///      shared storage. Nothing here ever changes what MizanRegistry.resolve() returns, and
///      nothing here requires or implies a Sharia board opinion.
contract MizanAIPreScreen is Ownable {
    struct PreScreen {
        uint8 score; // 0-100, the model's own non-binding compliance confidence
        bytes32 rationaleHash;
        string rationaleURI;
        string model; // e.g. "openrouter:meta-llama/llama-3.1-8b-instruct:free"
        uint64 generatedAt;
        uint64 recordedAt;
    }

    struct PreScreenInput {
        uint8 score;
        bytes32 rationaleHash;
        string rationaleURI;
        string model;
        uint64 generatedAt;
    }

    uint256 public constant MAX_URI_BYTES = 512;
    uint256 public constant MAX_MODEL_BYTES = 128;

    address public receiver;
    mapping(address => PreScreen) private preScreens;

    error InvalidInput();
    error OnlyReceiver();
    error ReceiverAlreadySet();
    error StalePreScreen(uint64 current, uint64 attempted);

    event ReceiverSet(address indexed receiver);
    event PreScreenRecorded(address indexed asset, uint8 score, string model, uint64 generatedAt);

    constructor(address admin) Ownable(admin) {}

    /// @notice One-time wiring, same reasoning as MizanRegistry.setReceiver: a new transport needs a new deployment.
    function setReceiver(address value) external onlyOwner {
        if (receiver != address(0)) revert ReceiverAlreadySet();
        if (value.code.length == 0) revert InvalidInput();
        receiver = value;
        emit ReceiverSet(value);
    }

    /// @notice Overwrites the prior pre-screen for `asset`. Latest-wins, like a price feed update.
    /// @dev Rejects an out-of-order delivery (generatedAt not newer than what's stored); does not
    ///      otherwise check any board state. The board's quorum never gates this.
    function record(address asset, PreScreenInput calldata input) external returns (PreScreen memory) {
        if (msg.sender != receiver) revert OnlyReceiver();
        if (asset.code.length == 0 || input.score > 100 || input.rationaleHash == bytes32(0)) {
            revert InvalidInput();
        }
        _checkURI(input.rationaleURI);
        if (bytes(input.model).length == 0 || bytes(input.model).length > MAX_MODEL_BYTES) revert InvalidInput();
        if (input.generatedAt == 0 || input.generatedAt > block.timestamp) revert InvalidInput();
        if (input.generatedAt <= preScreens[asset].generatedAt) {
            revert StalePreScreen(preScreens[asset].generatedAt, input.generatedAt);
        }

        PreScreen memory entry = PreScreen({
            score: input.score,
            rationaleHash: input.rationaleHash,
            rationaleURI: input.rationaleURI,
            model: input.model,
            generatedAt: input.generatedAt,
            recordedAt: uint64(block.timestamp)
        });
        preScreens[asset] = entry;
        emit PreScreenRecorded(asset, input.score, input.model, input.generatedAt);
        return entry;
    }

    /// @notice Returns a zeroed PreScreen (generatedAt == 0) if `asset` has never been AI-screened.
    function getPreScreen(address asset) external view returns (PreScreen memory) {
        return preScreens[asset];
    }

    function hasPreScreen(address asset) external view returns (bool) {
        return preScreens[asset].generatedAt != 0;
    }

    function _checkURI(string memory uri) private pure {
        if (bytes(uri).length == 0 || bytes(uri).length > MAX_URI_BYTES) revert InvalidInput();
    }
}
