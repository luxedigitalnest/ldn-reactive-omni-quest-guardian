// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.29;

import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {AbstractPayer} from "@reactive/src/base/AbstractPayer.sol";

/// @notice V2 testnet destination: uses CURRENT Reactive callback proxy and supports callback fee accounting.
/// @dev No human completion attestation. All state transitions require authenticated proxy + reactive sender.
contract QuestDestinationV2 is AbstractPayer {
    address public immutable owner;
    address public immutable callbackProxy;
    address public authorizedReactive;
    mapping(uint256 => bool) public checkpointSeen;
    mapping(uint256 => address) public checkpointCreator;
    mapping(uint256 => uint64) public checkpointDeadline;

    event ReactiveAuthorized(address indexed reactiveContract);
    event CheckpointMirrored(uint256 indexed taskId, address indexed creator, uint64 deadline);

    constructor(address callbackProxy_) AbstractPayer(IPayable(payable(callbackProxy_))) {
        require(callbackProxy_ != address(0), "Zero callback proxy");
        owner = msg.sender;
        callbackProxy = callbackProxy_;
    }

    function setReactiveOnce(address reactive_) external {
        require(msg.sender == owner, "Only owner");
        require(authorizedReactive == address(0), "Already configured");
        require(reactive_ != address(0), "Zero reactive");
        authorizedReactive = reactive_;
        emit ReactiveAuthorized(reactive_);
    }

    /// @notice Available to settle debt from this contract's balance if needed.
    /// @dev The preferred funding path is callbackProxy.depositTo(address(this)).
    function coverDebt() external {
        _coverDebt();
    }

    /// @notice Only CURRENT Sepolia callback proxy may invoke; injected sender must match configured Guardian.
    /// @dev AbstractPayer inherits authenticated pay(uint256) and a payable receive() function.
    function onCheckpoint(
        address reactiveSender,
        uint256 taskId,
        address creator,
        uint64 deadline
    ) external onlyServiceProvider {
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
