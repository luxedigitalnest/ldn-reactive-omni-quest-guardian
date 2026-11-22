import json,urllib.request
RPC="https://ethereum-sepolia-rpc.publicnode.com"
W="0xADFC0cb6819BC49939b021E45b0d43306575e5d3".lower()
CASES={
 "origin":("0x006aceea09fb77aa9ac21ba29370db3a7c3d791b32194a860503d4e2040cc402","0xa604534b1c0e9ca8a855569042a0582576b2e7bc"),
 "destination":("0xf760585e09d7e88c6b4553576b2193a331531a2bb8d0eda6c7d5ed91b9962d8c","0x284e6d26c14c73a2fbb8e86e79b9673365984af5")
}
def rpc(m,p):
 req=urllib.request.Request(RPC,headers={"Content-Type":"application/json"},data=json.dumps({"jsonrpc":"2.0","id":3,"method":m,"params":p}).encode())
 with urllib.request.urlopen(req,timeout=15) as r: j=json.load(r)
 if "error" in j:raise RuntimeError(str(j["error"]))
 return j["result"]
assert int(rpc("eth_chainId",[]),16)==11155111
for n,(h,address) in CASES.items():
 rec=rpc("eth_getTransactionReceipt",[h])
 assert rec is not None,n+" no receipt"
 code=rpc("eth_getCode",[address,"latest"])
 verified=int(rec["status"],16)==1 and rec["from"].lower()==W and rec["contractAddress"].lower()==address.lower() and rec["to"] is None and code!="0x"
 print(json.dumps({"name":n,"tx":h,"verified":verified,"address":address,"block":int(rec["blockNumber"],16),"gasUsed":int(rec["gasUsed"],16),"deployedBytecodeBytes":(len(code)-2)//2},sort_keys=True))
 if not verified:raise SystemExit(n+" failed verification")
print("VERIFIED two genuine owner-approved Sepolia deployment receipts; no wallet transactions made by this script")
