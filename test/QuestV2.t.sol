// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.29;

import {QuestDestinationV2} from "../src/QuestDestinationV2.sol";
import {QuestGuardianReactiveV2} from "../src/QuestGuardianReactiveV2.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";

interface CheatVmV2 {
    function etch(address addr, bytes calldata code) external;
    function prank(address msgSender) external;
    function deal(address who, uint256 amount) external;
}

contract MockCallbackProxyV2 is IPayable {
    uint256 public requestedDebt;
    receive() external payable {}
    function debt(address) external view returns (uint256) { return requestedDebt; }
    function setDebt(uint256 value) external { requestedDebt=value; }
}

contract MockOmniSystemV2 {
    uint256 public subscriptions;
    uint256 public callbacks;
    uint64 public lastGasLimit;
    address public lastRecipient;
    uint256 public lastChain;
    bytes public lastPayload;
    function subscribe(uint256,address,uint256,uint256,uint256,uint256) external { subscriptions++; }
    function requestCallbackV_1_0(ISystemContract.CallbackConfiguration_V_1_0 memory cfg) external {
        callbacks++;
        lastGasLimit=cfg.gasLimit;
        lastRecipient=cfg.recipient;
        lastChain=cfg.chainId;
        lastPayload=cfg.payload;
    }
}

contract QuestV2Test {
    CheatVmV2 constant vm=CheatVmV2(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant SYSTEM=0x8888888888888888888888888888888888888888;
    address constant GUARDIAN=address(0xBEEF);
    address constant CREATOR=address(0xFEED);

    function deployDestination() internal returns(QuestDestinationV2 dst,MockCallbackProxyV2 proxy) {
        proxy=new MockCallbackProxyV2();
        dst=new QuestDestinationV2(address(proxy));
    }
    function testDestinationProxiesAndPaymentProviderAgree() public {
        (QuestDestinationV2 dst,MockCallbackProxyV2 proxy)=deployDestination();
        require(dst.callbackProxy()==address(proxy),"bad proxy");
        require(address(dst._SERVICE_PROVIDER())==address(proxy),"bad payment provider");
        require(dst.owner()==address(this),"bad owner");
    }
    function testOnlyOwnerCanAuthorizeGuardianOnce() public {
        (QuestDestinationV2 dst,)=deployDestination();
        bool rejected;
        vm.prank(CREATOR);
        try dst.setReactiveOnce(GUARDIAN){}catch{rejected=true;}
        require(rejected,"not owner must revert");
        dst.setReactiveOnce(GUARDIAN);
        require(dst.authorizedReactive()==GUARDIAN,"wrong authorized sender");
        rejected=false;
        try dst.setReactiveOnce(address(0xABCD)){}catch{rejected=true;}
        require(rejected,"second binding must revert");
    }
    function testCallbackNeedsRealProxy() public {
        (QuestDestinationV2 dst,)=deployDestination();
        dst.setReactiveOnce(GUARDIAN);
        bool rejected;
        try dst.onCheckpoint(GUARDIAN,3,CREATOR,1800000000){}catch{rejected=true;}
        require(rejected,"unguarded caller must revert");
        require(!dst.checkpointSeen(3),"forged checkpoint");
    }
    function testCallbackRejectsForgedGuardian() public {
        (QuestDestinationV2 dst,MockCallbackProxyV2 proxy)=deployDestination();
        dst.setReactiveOnce(GUARDIAN);
        vm.prank(address(proxy));
        bool rejected;
        try dst.onCheckpoint(address(0xABCD),3,CREATOR,1800000000){}catch{rejected=true;}
        require(rejected,"forged guardian must revert");
        require(!dst.checkpointSeen(3),"forged checkpoint recorded");
    }
    function testProxyCanWriteOnceAndRejectReplay() public {
        (QuestDestinationV2 dst,MockCallbackProxyV2 proxy)=deployDestination();
        dst.setReactiveOnce(GUARDIAN);
        vm.prank(address(proxy));
        dst.onCheckpoint(GUARDIAN,3,CREATOR,1800000000);
        require(dst.checkpointSeen(3),"true callback missing");
        require(dst.checkpointCreator(3)==CREATOR,"wrong creator");
        require(dst.checkpointDeadline(3)==1800000000,"wrong deadline");
        vm.prank(address(proxy));
        bool rejected;
        try dst.onCheckpoint(GUARDIAN,3,CREATOR,1800000000){}catch{rejected=true;}
        require(rejected,"replay must revert");
    }
    function testPayerRejectsUnauthorizedCharge() public {
        (QuestDestinationV2 dst,MockCallbackProxyV2 proxy)=deployDestination();
        vm.deal(address(dst),1 ether);
        bool rejected;
        try dst.pay(0.01 ether){}catch{rejected=true;}
        require(rejected,"unauthorized payment must revert");
        require(address(proxy).balance==0,"proxy unexpectedly paid");
        vm.prank(address(proxy));
        dst.pay(0.01 ether);
        require(address(proxy).balance==0.01 ether,"authorized proxy was not paid");
    }
    function testCoverDebtFromContractBalance() public {
        (QuestDestinationV2 dst,MockCallbackProxyV2 proxy)=deployDestination();
        vm.deal(address(dst),1 ether);
        proxy.setDebt(0.02 ether);
        dst.coverDebt();
        require(address(proxy).balance==0.02 ether,"debt not paid");
    }
    function testGuardianV2UsesSufficientCallbackGas() public {
        MockOmniSystemV2 m=new MockOmniSystemV2();
        vm.etch(SYSTEM,address(m).code);
        QuestGuardianReactiveV2 g=new QuestGuardianReactiveV2(11155111,address(0x1234),11155111,address(0x5678));
        require(MockOmniSystemV2(SYSTEM).subscriptions()==1,"no subscription");
        IReactive.LogRecord memory l=IReactive.LogRecord({
            chainId:11155111,contractAddress:address(0x1234),
            topic0:uint256(keccak256("CheckpointAnnounced(uint256,address,uint64)")),
            topic1:3,topic2:uint256(uint160(CREATOR)),topic3:0,
            data:abi.encode(uint64(1800000000)),blockNumber:99,opCode:3,
            blockHash:111,txHash:222,logIndex:0
        });
        vm.prank(SYSTEM);
        g.react(l);
        require(g.requestsMade()==1,"react missing");
        require(MockOmniSystemV2(SYSTEM).lastGasLimit()==800000,"callback gas below V2 target");
        require(MockOmniSystemV2(SYSTEM).lastRecipient()==address(0x5678),"wrong callback recipient");
        require(MockOmniSystemV2(SYSTEM).lastChain()==11155111,"wrong callback chain");
    }
}
