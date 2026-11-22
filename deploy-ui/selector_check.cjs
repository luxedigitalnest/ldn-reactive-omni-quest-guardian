const {keccak_256} = require("js-sha3");
for (const sig of ["setReactiveOnce(address)","announce(uint64)","checkpointSeen(uint256)","authorizedReactive()","requestsMade()","nextTaskId()"]) {
  console.log(sig, "0x"+keccak_256(sig).slice(0,8));
}
console.log("CheckpointAnnounced", "0x"+require("js-sha3").keccak_256("CheckpointAnnounced(uint256,address,uint64)"));
