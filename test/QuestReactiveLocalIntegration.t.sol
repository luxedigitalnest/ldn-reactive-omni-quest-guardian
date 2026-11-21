// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.29;

import {QuestGuardianReactive} from "../src/QuestGuardianReactive.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";

interface Vm {
    function etch(address target, bytes calldata newRuntimeBytecode) external;
    function prank(address msgSender) external;
}

/// @dev Local system-interface stand-in only. No network callback or real funds.
contract MockOmniSystem {
    uint256 public subscriptions;
    uint256 public callbackRequests;
    uint256 public callbackChainId;
    address public callbackRecipient;
    uint64 public callbackGasLimit;
    bytes public callbackPayload;

    function subscribe(uint256, address, uint256, uint256, uint256, uint256) external {
        subscriptions++;
    }
    function requestCallbackV_1_0(
        ISystemContract.CallbackConfiguration_V_1_0 memory config_
    ) external {
        callbackRequests++;
        callbackChainId = config_.chainId;
        callbackRecipient = config_.recipient;
        callbackGasLimit = config_.gasLimit;
        callbackPayload = config_.payload;
    }
}

contract QuestReactiveLocalIntegrationTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant SYSTEM = 0x8888888888888888888888888888888888888888;
    uint256 constant BASE_SEPOLIA = 84532;
    uint256 constant TOPIC = uint256(keccak256("CheckpointAnnounced(uint256,address,uint64)"));
    uint256 constant SAMPLE_TX_HASH = 12_345;
    address constant ORIGIN = address(0x1234);
    address constant DESTINATION = address(0x5678);
    address constant CREATOR = address(0xBEEF);

    function makeGuardian() internal returns (QuestGuardianReactive guardian) {
        MockOmniSystem mock = new MockOmniSystem();
        vm.etch(SYSTEM, address(mock).code);
        guardian = new QuestGuardianReactive(
            BASE_SEPOLIA, ORIGIN, BASE_SEPOLIA, DESTINATION
        );
    }

    function sampleLog() internal pure returns (IReactive.LogRecord memory record) {
        record = IReactive.LogRecord({
            chainId: BASE_SEPOLIA,
            contractAddress: ORIGIN,
            topic0: TOPIC,
            topic1: 7, // taskId
            topic2: uint256(uint160(CREATOR)),
            topic3: 0,
            data: abi.encode(uint64(123456789)),
            blockNumber: 300,
            opCode: 3,
            blockHash: 99,
            txHash: SAMPLE_TX_HASH,
            logIndex: 0
        });
    }
    function delivered(QuestGuardianReactive g, IReactive.LogRecord memory l) internal {
        vm.prank(SYSTEM);
        g.react(l);
    }

    function testOmniConstructorSubscribesOnce() public {
        makeGuardian();
        require(MockOmniSystem(SYSTEM).subscriptions() == 1, "No subscription");
    }

    function testOnlySystemCanDeliverLogs() public {
        QuestGuardianReactive g = makeGuardian();
        try g.react(sampleLog()) {
            revert("Unauthorized react must revert");
        } catch {
            require(MockOmniSystem(SYSTEM).callbackRequests() == 0, "Callback escaped");
        }
    }

    function testEventRequestsOneCorrectCallback() public {
        QuestGuardianReactive g = makeGuardian();
        delivered(g, sampleLog());
        MockOmniSystem system = MockOmniSystem(SYSTEM);
        require(g.requestsMade() == 1, "No count");
        require(system.callbackRequests() == 1, "No callback");
        require(system.callbackRecipient() == DESTINATION, "Wrong destination");
        require(system.callbackChainId() == BASE_SEPOLIA, "Wrong destination chain");
        require(system.callbackGasLimit() >= 100_000, "Gas below protocol minimum");

        bytes memory payload = system.callbackPayload();
        bytes memory expected = abi.encodeWithSignature(
            "onCheckpoint(address,uint256,address,uint64)",
            address(0), uint256(7), CREATOR, uint64(123456789)
        );
        require(keccak256(payload) == keccak256(expected), "Bad payload");
    }

    function testReplayDoesNotRequestTwice() public {
        QuestGuardianReactive g = makeGuardian();
        delivered(g, sampleLog());
        delivered(g, sampleLog());
        require(g.requestsMade() == 1, "Duplicate callback requested");
        require(MockOmniSystem(SYSTEM).callbackRequests() == 1, "Duplicate in system");
    }

    function testUnrelatedEventIgnoredWithoutCostlyRevert() public {
        QuestGuardianReactive g = makeGuardian();
        IReactive.LogRecord memory log = sampleLog();
        log.topic0 = 0;
        delivered(g, log);
        require(MockOmniSystem(SYSTEM).callbackRequests() == 0, "Wrong event triggered");
    }

    function testInvalidLogShapeIgnored() public {
        QuestGuardianReactive g = makeGuardian();
        IReactive.LogRecord memory log = sampleLog();
        log.opCode = 2;
        delivered(g, log);
        require(MockOmniSystem(SYSTEM).callbackRequests() == 0, "Malformed event triggered");
    }
}
