// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.29;

import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";
import {AbstractReactive} from "@reactive/src/base/AbstractReactive.sol";

/// @notice Reacts to a single origin's CheckpointAnnounced events.
/// @dev Designed for Reactive Omni (single deployment), NOT legacy ReactVM.
contract QuestGuardianReactiveV2 is AbstractReactive {
    uint256 private constant CHECKPOINT_TOPIC =
        uint256(keccak256("CheckpointAnnounced(uint256,address,uint64)"));
    uint64 private constant CALLBACK_GAS_LIMIT = 800_000;

    uint256 public immutable originChainId;
    address public immutable originContract;
    uint256 public immutable destinationChainId;
    address public immutable destinationContract;

    mapping(bytes32 => bool) public requestedEvents;
    uint256 public requestsMade;

    event CallbackRequested(bytes32 indexed originLogId, uint256 indexed taskId, address indexed creator);

    constructor(
        uint256 originChainId_,
        address originContract_,
        uint256 destinationChainId_,
        address destinationContract_
    ) payable {
        require(originChainId_ != 0 && destinationChainId_ != 0, "Invalid chain");
        require(originContract_ != address(0), "Invalid origin");
        require(destinationContract_ != address(0), "Invalid destination");

        originChainId = originChainId_;
        originContract = originContract_;
        destinationChainId = destinationChainId_;
        destinationContract = destinationContract_;

        // Only the real system contract can deliver subscribed logs via react().
        // Match a specific origin and a single event signature: no broad wildcard.
        SYSTEM.subscribe(
            originChainId_,
            originContract_,
            CHECKPOINT_TOPIC,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
    }

    /// @inheritdoc IReactive
    function react(LogRecord memory log_) external onlySystem {
        if (log_.chainId != originChainId ||
            log_.contractAddress != originContract ||
            log_.topic0 != CHECKPOINT_TOPIC ||
            log_.opCode != 3) {
            return; // ignore unrelated logs without reverting and burning extra gas
        }
        if (log_.data.length != 32) return;

        uint256 taskId = log_.topic1;
        // Indexed EVM address is zero-padded on the left. Reject malformed
        // high bits before narrowing the 256-bit topic to an address.
        if (log_.topic2 >> 160 != 0) return;
        // forge-lint: disable-next-line(unsafe-typecast)
        address creator = address(uint160(log_.topic2));
        uint64 deadline = abi.decode(log_.data, (uint64));
        if (taskId == 0 || creator == address(0) || deadline == 0) return;

        bytes32 originLogId = keccak256(abi.encode(
            log_.chainId, log_.contractAddress, log_.txHash, log_.logIndex
        ));
        if (requestedEvents[originLogId]) return;
        requestedEvents[originLogId] = true;

        // The first address(0) is a mandatory placeholder which the
        // Reactive system overwrites with this contract's authenticated address.
        bytes memory payload = abi.encodeWithSignature(
            "onCheckpoint(address,uint256,address,uint64)",
            address(0), taskId, creator, deadline
        );
        // Effects and event are applied before the external system call.
        // If the system rejects the request, the whole transaction rolls back.
        unchecked { requestsMade++; }
        emit CallbackRequested(originLogId, taskId, creator);
        SYSTEM.requestCallbackV_1_0(
            ISystemContract.CallbackConfiguration_V_1_0({
                chainId: destinationChainId,
                recipient: destinationContract,
                gasLimit: CALLBACK_GAS_LIMIT,
                payload: payload
            })
        );
    }

    /// @dev Reactive network reserves/tops up this contract in native Lasna test REACT.
    function coverDebt() external { _coverDebt(); }
}
