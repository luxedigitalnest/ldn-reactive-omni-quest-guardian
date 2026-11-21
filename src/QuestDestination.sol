// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.29;

/// @notice Destination of event-driven callbacks produced by Reactive Omni.
/// @dev This contract never asserts that an off-chain human actually completed a quest.
contract QuestDestination {
    address public immutable owner;
    address public immutable callbackProxy;
    address public authorizedReactive;
    mapping(uint256 => bool) public checkpointSeen;
    mapping(uint256 => address) public checkpointCreator;
    mapping(uint256 => uint64) public checkpointDeadline;

    event ReactiveAuthorized(address indexed reactiveContract);
    event CheckpointMirrored(uint256 indexed taskId, address indexed creator, uint64 deadline);

    constructor(address callbackProxy_) {
        require(callbackProxy_ != address(0), "Zero callback proxy");
        owner = msg.sender;
        callbackProxy = callbackProxy_;
    }

    /// @dev Configure only after the Reactive contract is deployed (two-way address dependency).
    function setReactiveOnce(address reactive_) external {
        require(msg.sender == owner, "Only owner");
        require(authorizedReactive == address(0), "Already configured");
        require(reactive_ != address(0), "Zero reactive");
        authorizedReactive = reactive_;
        emit ReactiveAuthorized(reactive_);
    }

    /// @dev Callback's first argument is overwritten by Reactive Network with the
    /// real requester's address, rather than trusting a user-controlled placeholder.
    function onCheckpoint(
        address reactiveSender,
        uint256 taskId,
        address creator,
        uint64 deadline
    ) external {
        require(msg.sender == callbackProxy, "Not callback proxy");
        require(authorizedReactive != address(0), "Reactive unset");
        require(reactiveSender == authorizedReactive, "Wrong reactive sender");
        require(taskId != 0 && creator != address(0), "Invalid checkpoint");
        require(!checkpointSeen[taskId], "Duplicate checkpoint");
        checkpointSeen[taskId] = true;
        checkpointCreator[taskId] = creator;
        checkpointDeadline[taskId] = deadline;
        emit CheckpointMirrored(taskId, creator, deadline);
    }
}
