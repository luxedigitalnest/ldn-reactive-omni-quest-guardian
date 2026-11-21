// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.29;

import {QuestOrigin} from "../src/QuestOrigin.sol";
import {QuestDestination} from "../src/QuestDestination.sol";

/// @notice Executable tests for the unprivileged origin and the authenticated callback target.
/// @dev These prove local Solidity behavior, NOT live Reactive subscription or testnet callbacks.
contract QuestGuardianUnitTest {
    function testAnnounceEmitsStoredDeadline() public {
        QuestOrigin source = new QuestOrigin();
        uint64 due = uint64(block.timestamp + 3600);
        uint256 taskId = source.announce(due);
        require(taskId == 1, "Wrong task ID");
        (address creator, uint64 deadline, bool exists) = source.tasks(taskId);
        require(creator == address(this) && deadline == due && exists, "Wrong stored task");
        require(source.nextTaskId() == 2, "Counter not incremented");
    }

    function testRejectPastDeadline() public {
        QuestOrigin source = new QuestOrigin();
        try source.announce(0) returns (uint256) {
            revert("Expected past-deadline rejection");
        } catch Error(string memory reason) {
            require(keccak256(bytes(reason)) == keccak256(bytes("Deadline must be future")), "Wrong rejection");
        }
    }

    function testCallbackIsNotPubliclyInvokable() public {
        QuestDestination dest = new QuestDestination(address(0x1234));
        dest.setReactiveOnce(address(this));
        try dest.onCheckpoint(address(this), 1, address(this), 500) {
            revert("Expected callback-proxy rejection");
        } catch Error(string memory reason) {
            require(keccak256(bytes(reason)) == keccak256(bytes("Not callback proxy")), "Wrong rejection");
        }
    }

    function testAuthorizedCallbackRecordsReceiptAndRejectsReplay() public {
        QuestDestination dest = new QuestDestination(address(this));
        dest.setReactiveOnce(address(this));
        dest.onCheckpoint(address(this), 7, address(0xABC), 1000);
        require(dest.checkpointSeen(7), "Not recorded");
        require(dest.checkpointCreator(7) == address(0xABC), "Wrong creator");
        require(dest.checkpointDeadline(7) == 1000, "Wrong deadline");
        try dest.onCheckpoint(address(this), 7, address(0xABC), 1000) {
            revert("Expected duplicate-receipt rejection");
        } catch Error(string memory reason) {
            require(keccak256(bytes(reason)) == keccak256(bytes("Duplicate checkpoint")), "Wrong replay rejection");
        }
    }

    function testWrongReactiveSenderRejected() public {
        QuestDestination dest = new QuestDestination(address(this));
        dest.setReactiveOnce(address(0xBEEF));
        try dest.onCheckpoint(address(this), 2, address(this), 1500) {
            revert("Expected wrong reactive rejection");
        } catch Error(string memory reason) {
            require(keccak256(bytes(reason)) == keccak256(bytes("Wrong reactive sender")), "Wrong rejection");
        }
    }

    function testReactiveAuthorizationCanBeSetOnce() public {
        QuestDestination dest = new QuestDestination(address(this));
        dest.setReactiveOnce(address(0xBEEF));
        try dest.setReactiveOnce(address(0xDEAD)) {
            revert("Expected reconfiguration rejection");
        } catch Error(string memory reason) {
            require(keccak256(bytes(reason)) == keccak256(bytes("Already configured")), "Wrong reconfig guard");
        }
    }
}
