import urllib.request,json
U="https://lasna-rpc.rnk.dev/";T="0x1174dd6f2d7356b4b41372520f1328d22fc3e931977e0c9133d9d935d77be64d";A="0xf9dd6d01f26f1c1f8f4fde7c42969d0c92016a6b";OWNER="0xADFC0cb6819BC49939b021E45b0d43306575e5d3"
def call(m,p):
 req=urllib.request.Request(U,data=json.dumps({"jsonrpc":"2.0","id":4,"method":m,"params":p}).encode(),headers={"Content-Type":"application/json"})
 with urllib.request.urlopen(req,timeout=15) as r:x=json.load(r)
 return x["result"]
assert int(call("eth_chainId",[]),16)==5318007
rc=call("eth_getTransactionReceipt",[T]);code=call("eth_getCode",[A,"latest"])
assert rc and rc["status"]=="0x1" and rc["contractAddress"].lower()==A and rc["from"].lower()==OWNER.lower() and code!="0x"
print(json.dumps({"tx":T,"address":A,"status":"VERIFIED","block":int(rc["blockNumber"],16),"runtimeBytes":(len(code)-2)//2,"balanceNative":int(call("eth_getBalance",[A,"latest"]),16)/1e18}))
