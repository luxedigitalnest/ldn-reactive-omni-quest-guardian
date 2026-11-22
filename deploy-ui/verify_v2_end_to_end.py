import json,urllib.request
RP={"S":"https://ethereum-sepolia-rpc.publicnode.com","L":"https://lasna-rpc.rnk.dev/"}
ORIGIN="0xa604534b1c0e9ca8a855569042a0582576b2e7bc"
DEST="0x348aaec876dc199ca893f197ac8bb99b2d1a609a"
GUARD="0xf9dd6d01f26f1c1f8f4fde7c42969d0c92016a6b"
SOURCE="0xa9c3b35da1ca6e644aec5c8173015a192968cae0e616a296c66284dad1e0bea2"
PROXY="0xAa14d9Cd0f788Ca23d11805986C1d8bd035D23b4"
SELECT_SEEN="0xc2d7ba65"
def call(which,m,params):
 u=RP[which];req=urllib.request.Request(u,data=json.dumps({"jsonrpc":"2.0","id":10,"method":m,"params":params}).encode(),headers={"Content-Type":"application/json"})
 with urllib.request.urlopen(req,timeout=20) as r: j=json.load(r)
 if "error" in j:raise Exception(str(j["error"]))
 return j["result"]
assert int(call("S","eth_chainId",[]),16)==11155111
assert int(call("L","eth_chainId",[]),16)==5318007
rec=call("S","eth_getTransactionReceipt",[SOURCE])
assert rec and rec["status"]=="0x1" and rec["to"].lower()==ORIGIN and any(int(t,16)==4 for l in rec["logs"] for t in l["topics"][1:2])
print("Sepolia source checkpoint #4",SOURCE, "block",int(rec["blockNumber"],16),flush=True)
guardianRes=call("L","eth_call",[{"to":GUARD,"data":"0xd85ac68a"},"latest"])
print("Lasna V2 requestsMade",int(guardianRes,16),flush=True)
guardianLogs=call("L","eth_getLogs",[{"address":GUARD,"fromBlock":hex(8985757),"toBlock":"latest"}])
print("Lasna V2 callbackRequest logs",len(guardianLogs),flush=True)
for l in guardianLogs[-8:]:
 print("  LASNA_CALLBACK_REQUEST",json.dumps({"tx":l["transactionHash"],"block":int(l["blockNumber"],16),"topics":l["topics"]}),flush=True)
v=call("S","eth_call",[{"to":DEST,"data":SELECT_SEEN+hex(4)[2:].zfill(64)},"latest"])
print("destination checkpointSeen(4)",int(v,16)!=0,flush=True)
assert int(v,16)==1, "No success callback seen"
dLogs=call("S","eth_getLogs",[{"address":DEST,"fromBlock":hex(12189731),"toBlock":"latest"}])
print("Sepolia Destination V2 logs",len(dLogs),flush=True)
for l in dLogs[-14:]:
 tx=call("S","eth_getTransactionByHash",[l["transactionHash"]]);rc=call("S","eth_getTransactionReceipt",[l["transactionHash"]])
 print("  DEST_EVENT",json.dumps({"tx":l["transactionHash"],"block":int(l["blockNumber"],16),"logTopics":l["topics"],"logData":l["data"],"from":tx["from"],"to":tx["to"],"inputSelector":tx["input"][:10],"status":rc["status"]}),flush=True)
seenLogs=[l for l in dLogs if len(l["topics"])>=2 and int(l["topics"][1],16)==4]
assert seenLogs,"Destination contract has no event for task4"
for l in seenLogs:
 tx=call("S","eth_getTransactionByHash",[l["transactionHash"]]);rc=call("S","eth_getTransactionReceipt",[l["transactionHash"]])
 assert tx["to"].lower()==PROXY.lower() and rc["status"]=="0x1" and l["address"].lower()==DEST.lower(),"Successful callback was not routed through current Sepolia proxy to destination event"
 assert DEST[2:].lower() in tx["input"].lower(),"Proxy calldata does not contain V2 destination recipient"
 assert GUARD[2:].lower() in tx["input"].lower(),"Proxy calldata does not contain authenticated V2 Guardian sender"
 print("CALLBACK_CHAIN_PROOF",json.dumps({"origin":SOURCE,"reactiveRequests":int(guardianRes,16),"destinationTx":l["transactionHash"],"destinationBlock":int(l["blockNumber"],16),"proxy":tx["from"],"recipient":tx["to"],"status":"SUCCESS","checkpointSeen4":True}),flush=True)
print("All independent read-only RPC checks passed",flush=True)
