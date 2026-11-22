import urllib.request,json,time
RPC={"SEP":"https://ethereum-sepolia-rpc.publicnode.com","LASNA":"https://lasna-rpc.rnk.dev/"}
PROXY="0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA"
SYSTEM="0x8888888888888888888888888888888888888888"
DEST="0x284e6d26c14c73a2fbb8e86e79b9673365984af5"
GUARDIAN="0xe73b699694d46b51467a6d6a5c1c57b2319f4c87"
TXS=["0x7dece269167216c4b74b2257eb118293c303c2f4cba5b7e1cc50fbb21e1f40a9","0x5aabcdcf2ad9f7ab9641879d3077eb921ad9f33fdb51debab6b9038829c6a852"]
def call(chain,m,p):
 req=urllib.request.Request(RPC[chain],data=json.dumps({"jsonrpc":"2.0","id":5,"method":m,"params":p}).encode(),headers={"Content-Type":"application/json"})
 with urllib.request.urlopen(req,timeout=12) as r:j=json.load(r)
 if "error" in j:raise RuntimeError(str(j["error"]))
 return j["result"]
def eth_call(chain,to,data):
 return call(chain,"eth_call",[{"to":to,"data":data},"latest"])
def address_arg(a):return a[2:].lower().zfill(64)
for chain,contract,who in [("SEP",PROXY,DEST),("LASNA",SYSTEM,GUARDIAN)]:
 print("TARGET",chain,"service provider",contract,"payable target",who,flush=True)
 for selector,name in [("0x9b6c56ec","debt"),("0xd66bd524","reserves")]:
  try:v=eth_call(chain,contract,selector+address_arg(who));print(name,int(v,16),"wei",int(v,16)/10**18,"ETH/REACT",flush=True)
  except Exception as e:print(name,"ERROR",str(e)[:350],flush=True)
 if chain=="SEP":
  for sel,n in [("0x2c16b16f","_gasPriceCoeffPer1000"),("0xe5563728","_extraGas"),("0xe166e4f6","_maxChargeGas")]:
   try:print(n,int(eth_call(chain,contract,sel),16),flush=True)
   except Exception as e:print(n,"ERROR",str(e)[:250],flush=True)
for tx in TXS:
 print("REACTIVE TX",tx,flush=True)
 try:
  rc=call("LASNA","eth_getTransactionReceipt",[tx])
  print("receipt",{"status":rc.get("status") if rc else None,"block":int(rc.get("blockNumber","0x0"),16) if rc else None,"from":rc.get("from") if rc else None,"to":rc.get("to") if rc else None,"logs":[{"address":l["address"],"topics":l["topics"][:3],"data":l["data"][:180]} for l in rc.get("logs",[])][:10] if rc else None},flush=True)
 except Exception as e:print("receipt ERROR",str(e)[:350],flush=True)
 try:
  response=eth_call("LASNA",SYSTEM,"0x9f3186d5"+tx[2:])
  print("getCallbacks raw",response[:2400], "totalHexChars",len(response),flush=True)
 except Exception as e:print("getCallbacks ERROR",str(e)[:500],flush=True)
print("END read-only",flush=True)
