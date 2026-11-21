// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.29;

/// @notice Emits one off-chain-checkpoint deadline event per registered task.
/// @dev Demonstration only; it never proves a human completed the task.
contract QuestOrigin {
    struct Task { address creator; uint64 deadline; bool exists; }
    uint256 public nextTaskId = 1;
    mapping(uint256 => Task) public tasks;

    event CheckpointAnnounced(uint256 indexed taskId, address indexed creator, uint64 deadline);

    function announce(uint64 deadline) external returns (uint256 taskId) {
        require(deadline > block.timestamp, "Deadline must be future");
        require(deadline < type(uint64).max, "Invalid deadline");
        taskId = nextTaskId++;
        tasks[taskId] = Task(msg.sender, deadline, true);
        emit CheckpointAnnounced(taskId, msg.sender, deadline);
    }
}
