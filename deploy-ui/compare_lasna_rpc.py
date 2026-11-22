import json,urllib.request
sources={"legacy":"https://lasna-rpc.rnk.dev/","omni":"https://lasna-omni-rpc.rnk.dev/"}
wallet="0xADFC0cb6819BC49939b021E45b0d43306575e5d3"
system="0x8888888888888888888888888888888888888888"
def rpc(url,method,params):
  dat=json.dumps({"jsonrpc":"2.0","id":7,"method":method,"params":params}).encode()
  req=urllib.request.Request(url,data=dat,headers={"Content-Type":"application/json"})
  with urllib.request.urlopen(req,timeout=13) as r:return json.load(r)
for label,url in sources.items():
  print(label,url)
  for m,params in [("eth_chainId",[]),("eth_blockNumber",[]),("eth_getBalance",[wallet,"latest"]),("eth_getCode",[system,"latest"])]:
    try:
      data=rpc(url,m,params)
      v=data.get("result",data.get("error"))
      if m=="eth_getBalance" and isinstance(v,str):v=int(v,16)/10**18
      if m=="eth_getCode" and isinstance(v,str):v={"byteLength":(len(v)-2)//2,"exists":v!="0x"}
      print(" ",m,v)
    except Exception as e:print(" ",m,type(e).__name__,str(e)[:200])
print("All calls read-only, no wallet signing or broadcast")
