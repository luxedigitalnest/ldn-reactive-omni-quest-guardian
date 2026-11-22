import json,urllib.request,time
RPC="https://lasna-rpc.rnk.dev/"
ORIGIN_RPC="https://ethereum-sepolia-rpc.publicnode.com"
GUARDIAN="0xe73b699694d46b51467a6d6a5c1c57b2319f4c87"
SYSTEM="0x8888888888888888888888888888888888888888"
WALLET="0xADFC0cb6819BC49939b021E45b0d43306575e5d3"
DEST="0x284e6d26c14c73a2fbb8e86e79b9673365984af5"
AN="0x3d2e944ab17c530e1c2466566be622f47e173e12662827b6d491b256eea1a04a"
def call(url,m,p):
 req=urllib.request.Request(url,data=json.dumps({"jsonrpc":"2.0","id":17,"method":m,"params":p}).encode(),headers={"Content-Type":"application/json"})
 with urllib.request.urlopen(req,timeout=14) as r: j=json.load(r)
 if "error" in j:raise Exception(str(j["error"]))
 return j["result"]
print("chains",call(RPC,"eth_chainId",[]),call(ORIGIN_RPC,"eth_chainId",[]),flush=True)
latest=int(call(RPC,"eth_blockNumber",[]),16);print("LASNA latest",latest,flush=True)
for n,addr in [("guardian",GUARDIAN),("wallet",WALLET),("system",SYSTEM)]:
 try:
  v=call(RPC,"eth_getBalance",[addr,"latest"])
  print("LASNA balance",n,int(v,16)/10**18,flush=True)
 except Exception as e: print("balance error",n,str(e)[:200],flush=True)
for sel in ["0xd85ac68a","0x6bf47b74","0x54ffdc13"]:
 try:
  v=call(RPC,"eth_call",[{"to":GUARDIAN,"data":sel},"latest"])
  print("GUARDIAN call",sel,v[:160],flush=True)
 except Exception as e:print("GUARDIAN call error",sel,str(e)[:200],flush=True)
try:
 logs=call(RPC,"eth_getLogs",[{"address":GUARDIAN,"fromBlock":hex(8983180),"toBlock":"latest"}])
 print("GUARDIAN emitted LOG count",len(logs),flush=True)
 for x in logs[-20:]:
  print("  EVENT",{"block":int(x["blockNumber"],16),"tx":x["transactionHash"],"topics":x["topics"],"data":x["data"][:220]},flush=True)
except Exception as e:print("logs ERROR",str(e)[:220],flush=True)
try:
 receipt=call(ORIGIN_RPC,"eth_getTransactionReceipt",[AN])
 print("ORIGIN EVENT",{"status":receipt["status"],"block":int(receipt["blockNumber"],16),"logs":len(receipt["logs"]),"transaction":AN},flush=True)
except Exception as e:print("origin error",str(e)[:180],flush=True)
for i in [1,2]:
 try:
  data="0xc2d7ba65"+hex(i)[2:].zfill(64)
  v=call(ORIGIN_RPC,"eth_call",[{"to":DEST,"data":data},"latest"])
  print("DEST seen",i,int(v,16)>0,flush=True)
 except Exception as e:print("DEST read error",i,str(e)[:200],flush=True)
print("Read only; no wallet signing or broadcast",flush=True)
