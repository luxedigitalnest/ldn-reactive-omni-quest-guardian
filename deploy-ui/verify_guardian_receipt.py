import json,urllib.request
URL="https://lasna-rpc.rnk.dev/"
HASH="0x3bee8db5f1662a97e6d1478b73be15648cdbf746e3686fdc41f7e701d46856b6"
WALLET="0xADFC0cb6819BC49939b021E45b0d43306575e5d3"
CONTRACT="0xe73b699694d46b51467a6d6a5c1c57b2319f4c87"
def rpc(m,p):
 data=json.dumps({"jsonrpc":"2.0","id":3,"method":m,"params":p}).encode()
 req=urllib.request.Request(URL,data=data,headers={"Content-Type":"application/json"})
 with urllib.request.urlopen(req,timeout=12) as r: x=json.load(r)
 if "error" in x:raise RuntimeError(str(x["error"]))
 return x["result"]
assert int(rpc("eth_chainId",[]),16)==5318007
receipt=rpc("eth_getTransactionReceipt",[HASH]);code=rpc("eth_getCode",[CONTRACT,"latest"])
assert receipt and int(receipt["status"],16)==1 and receipt["from"].lower()==WALLET.lower() and receipt["contractAddress"].lower()==CONTRACT.lower() and receipt["to"] is None and code!="0x", "Guardian not verified"
print(json.dumps({"guardian":"VERIFIED","chainId":5318007,"receipt":HASH,"address":CONTRACT,"block":int(receipt["blockNumber"],16),"contractBytes":(len(code)-2)//2,"lasnaWalletBalanceWei":int(rpc("eth_getBalance",[WALLET,"latest"]),16)}))
print("READ_ONLY; no signature, send, deployment or credentials.")
