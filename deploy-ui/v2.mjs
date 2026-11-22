// LDN Reactive Omni: local owner-confirmed TESTNET deployment only.
// No private keys, background transfers, automatic wallet prompts, or production networks.
const SEP=11155111,LAS=5318007,EXPECTED="0xADFC0cb6819BC49939b021E45b0d43306575e5d3";
const CALLBACK_PROXY="0xAa14d9Cd0f788Ca23d11805986C1d8bd035D23b4";
const DEPOSIT_SELECTOR="0xb760faf9", RESERVES_SELECTOR="0xd66bd524", DEBT_SELECTOR="0x9b6c56ec";
const LIBRARY="3ade0dcf1d27e67e5783ef807e73a1b9e0c0cce8";
const TOPIC="0x6b82827168700963dab660944d418d3d9da6fe9570669204c89472e7db08d1c9";
const SELECTORS={authorize:"0x6bf47b74",announce:"0x6aab8aec",seen:"0xc2d7ba65",authorized:"0x54ffdc13"};
const STORAGE="LDN_REACTIVE_CURRENT_PROXY_V2_APPROVED_OWNER_2026_11_22";
const $=id=>document.getElementById(id);
let provider,wallet,chain,artifacts,manifest;
let state=readSaved();
const VERIFIED_EXISTING_ORIGIN={txHash:"0x006aceea09fb77aa9ac21ba29370db3a7c3d791b32194a860503d4e2040cc402",chainId:SEP,status:"DEPLOYED_VERIFIED",address:"0xa604534b1c0e9ca8a855569042a0582576b2e7bc",blockNumber:12189497};
if(!state.origin)state.origin={...VERIFIED_EXISTING_ORIGIN};
function readSaved(){try{return JSON.parse(localStorage.getItem(STORAGE))||{}}catch{return {}}}
function save(){localStorage.setItem(STORAGE,JSON.stringify(state));render()}
const info=(x)=>{$("status").textContent=String(x)};
const log=(x)=>{info(new Date().toLocaleTimeString()+": "+x)};
const hex=n=>"0x"+BigInt(n).toString(16);
const addr=x=>typeof x==="string"&&/^0x[0-9a-fA-F]{40}$/.test(x)&&!/^0x0{40}$/i.test(x);
const hash=x=>typeof x==="string"&&/^0x[0-9a-fA-F]{64}$/.test(x);
const encodeAddress=x=>{if(!addr(x))throw Error("A real nonzero EVM contract address is required");return x.slice(2).toLowerCase().padStart(64,"0")};
function uint(x,type="uint256"){
 if(!["uint256","uint64"].includes(type))throw Error("Unsupported integer ABI type");
 if(typeof x==="number"&&!Number.isSafeInteger(x))throw Error("Unsafe integer");
 const s=String(x);
 if(!/^(0|[1-9][0-9]*)$/.test(s))throw Error("Invalid integer");
 const n=BigInt(s);
 if(n<0n||n>=(1n<<(type==="uint64"?64n:256n)))throw Error("Integer exceeds ABI limit");
 return n.toString(16).padStart(64,"0");
}
function constructorData(name,args=[]){
 const a=artifacts?.[name];
 if(!a)throw Error("No locally verified bytecode for "+name);
 const types=a.constructorInputs?.map(x=>x.type)||[];
 if(args.length!==types.length)throw Error("Constructor argument mismatch");
 return a.bytecode+types.map((t,i)=>{
  if(t==="address")return encodeAddress(args[i]);
  if(t==="uint256"||t==="uint64")return uint(args[i],t);
  throw Error("Unsupported ABI type "+t);
 }).join("");
}
async function digest(input){
 const bytes=new TextEncoder().encode(input);
 const h=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
 return [...h].map(v=>v.toString(16).padStart(2,"0")).join("");
}
async function loadArtifacts(){
 const r=await fetch("/artifacts/v2/manifest.json");
 if(!r.ok)throw Error("No compiled manifest available. Run npm run compile.");
 manifest=await r.json();
 if(manifest.libraryCommit!==LIBRARY||!String(manifest.solidityVersion).startsWith("0.8.29+")||manifest.networkStatus!=="NOT_DEPLOYED_UNSIGNED_ONLY")
  throw Error("Manifest compiler/library provenance invalid");
 const expected=["QuestOrigin","QuestDestinationV2","QuestGuardianReactiveV2"];
 if(manifest.contracts?.length!==3||expected.some(n=>!manifest.contracts.some(e=>e.contract===n)))
  throw Error("Expected exactly three original unsigned contracts");
 artifacts={};
 for(const e of manifest.contracts){
  const r=await fetch("/artifacts/v2/"+e.contract+".json");
  if(!r.ok)throw Error("Artifact missing: "+e.contract);
  const a=await r.json();
  if(a.contract!==e.contract||a.libraryCommit!==LIBRARY||!/^0x(?:[\da-fA-F]{2})+$/.test(a.bytecode))
   throw Error("Artifact type or pinned library mismatch: "+e.contract);
  const computed=await digest(a.bytecode);
  if(computed!==e.sha256||(a.bytecode.length-2)/2!==e.bytecodeBytes)
   throw Error("Bytecode checksum mismatch: "+e.contract);
  artifacts[e.contract]=a;
 }
}
function findProvider(){
 const list=window.ethereum?.providers || (window.ethereum?[window.ethereum]:[]);
 return list.find(x=>x?.isMetaMask)||null;
}
async function readWallet(){
 provider=findProvider();
 if(!provider){wallet=null;chain=null;render();return false}
 const [accounts,c]=await Promise.all([
  provider.request({method:"eth_accounts"}),provider.request({method:"eth_chainId"})
 ]);
 wallet=accounts?.[0]||null;chain=parseInt(c,16);
 render();return true;
}
function ensureWallet(expectedChain){
 if(!provider||!wallet)throw Error("Connect your existing MetaMask wallet first");
 if(wallet.toLowerCase()!==EXPECTED.toLowerCase())throw Error("Unexpected wallet — refusing all transactions");
 if(chain!==expectedChain)throw Error("Wrong network. Select "+(expectedChain===SEP?"Ethereum Sepolia":"Reactive Lasna")+" TESTNET");
 if(!artifacts)throw Error("Unsigned artifacts did not pass integrity validation");
}
function assertReceipt(r,expectedChain){
 if(chain!==expectedChain)throw Error("Switch back to expected testnet to verify receipt");
 if(!r||BigInt(r.status||"0x0")!==1n)throw Error("Receipt missing or FAILED: do not repeat without research");
 if(!wallet||r.from?.toLowerCase()!==wallet.toLowerCase())throw Error("Transaction sender mismatch");
}
async function maybeReceipt(key,expectedChain){
 const row=state[key];
 if(!row?.txHash)return null;
 if(chain!==expectedChain)return null;
 const receipt=await provider.request({method:"eth_getTransactionReceipt",params:[row.txHash]});
 if(!receipt)return null;
 assertReceipt(receipt,expectedChain);
 if(["origin","destination","guardian"].includes(key)){
  if(!addr(receipt.contractAddress)||receipt.to)throw Error("Receipt is not a contract deployment");
  const code=await provider.request({method:"eth_getCode",params:[receipt.contractAddress,"latest"]});
  if(!code||code==="0x")throw Error("Receipt lacks deployed contract bytecode");
  row.address=receipt.contractAddress;row.blockNumber=Number(BigInt(receipt.blockNumber));row.status="DEPLOYED_VERIFIED";
 }
 if(key==="fundDestination"){
  if(receipt.to?.toLowerCase()!==CALLBACK_PROXY.toLowerCase())throw Error("Destination reserve receipt was not sent to official proxy");
  const actual=await provider.request({method:"eth_getTransactionByHash",params:[row.txHash]});
  const expectedData=DEPOSIT_SELECTOR+encodeAddress(state.destination.address);
  if(!actual||actual.input?.toLowerCase()!==expectedData.toLowerCase()||BigInt(actual.value||"0x0")!==100000000000000000n)throw Error("Reserve deposit data/value did not match 0.1 TEST ETH for original destination");
  row.status="MINED_VERIFIED";row.blockNumber=Number(BigInt(receipt.blockNumber));
 }
 if(["authorize","announce","postFunding"].includes(key)){
  if(receipt.to?.toLowerCase()!==(key==="authorize"?state.destination.address:state.origin.address)?.toLowerCase())
   throw Error("Transaction destination does not match verified contract");
  row.status="MINED_VERIFIED";
  row.blockNumber=Number(BigInt(receipt.blockNumber));
  if(key==="announce"||key==="postFunding"){
   const event=receipt.logs?.find(x=>x.address?.toLowerCase()===state.origin.address.toLowerCase()&&x.topics?.[0]?.toLowerCase()===TOPIC);
   if(!event||event.topics.length<3)throw Error("No authentic CheckpointAnnounced event in mined transaction");
   if(event.topics[2]?.slice(-40).toLowerCase()!==wallet.slice(2).toLowerCase())throw Error("Event creator does not match connected wallet");
   row.taskId=String(BigInt(event.topics[1]));
   row.deadline=String(BigInt(event.data));
  }
 }
 save();return receipt;
}
async function sendTx(key,network,tx){
 ensureWallet(network);
 if(state[key]?.txHash)throw Error("Existing "+key+" transaction hash recorded. Verify that receipt first; no duplicate sent.");
 const suggested=network===SEP?"Ethereum Sepolia":"Reactive Lasna";
 log("Opening MetaMask owner confirmation for "+key+" on "+suggested+". Review amount, gas and network; approve or reject personally.");
 const txHash=await provider.request({method:"eth_sendTransaction",params:[{from:wallet,...tx}]});
 if(!hash(txHash))throw Error("Wallet did not return an authentic transaction hash");
 state[key]={txHash,chainId:network,status:"SENT_UNVERIFIED"};
 save();log(key+" submitted under user wallet approval: "+txHash+". Waiting for chain receipt.");
 // Wait only for receipt; no automatic second transaction.
 for(let i=0;i<50;i++){
  await new Promise(resolve=>setTimeout(resolve,2000));
  const receipt=await maybeReceipt(key,network);
  if(receipt){log(key+" receipt VERIFIED in block "+state[key].blockNumber);return receipt}
 }
 log("Still pending; transaction hash saved. Use Refresh to check existing receipt before another action.");
 return null;
}
async function networkSwitch(network){
 if(!provider||!wallet||wallet.toLowerCase()!==EXPECTED.toLowerCase())throw Error("First connect and verify the existing MetaMask wallet");
 if(![SEP,LAS].includes(network))throw Error("Mainnet is prohibited");
 const chainId=hex(network);
 try{
  await provider.request({method:"wallet_switchEthereumChain",params:[{chainId}]});
 }catch(e){
  if(network!==LAS||e?.code!==4902)throw e;
  // Official Lasna public testnet chain, user must approve wallet add-network dialog.
  await provider.request({method:"wallet_addEthereumChain",params:[{
   chainId,chainName:"Reactive Lasna Testnet",
   nativeCurrency:{name:"Lasna test REACT",symbol:"lREACT",decimals:18},
   rpcUrls:["https://lasna-rpc.rnk.dev/"],blockExplorerUrls:["https://lasna.reactscan.net/"]
  }]});
 }
 await readWallet();
 if(chain!==network)throw Error("Wallet has not switched to the intended testnet");
 log("Network verified: "+(network===SEP?"Ethereum Sepolia":"Reactive Lasna"));
}
async function deploy(name,key,network,args,value="0x0"){
 ensureWallet(network);
 if(state[key]?.address)throw Error("Existing verified deployment already recorded; will not duplicate");
 const data=constructorData(name,args);
 await sendTx(key,network,{data,value});
}
async function authorizedAddress(){
 ensureWallet(SEP);
 if(!state.destination?.address)return null;
 const data=await provider.request({method:"eth_call",params:[{to:state.destination.address,data:SELECTORS.authorized},"latest"]});
 const a="0x"+data.slice(-40);
 return addr(a)?a:null;
}
async function verifySeen(){
 ensureWallet(SEP);
 const taskId=state.postFunding?.taskId||state.announce?.taskId;
 if(!state.destination?.address||!taskId)throw Error("No verified destination or original task id");
 const data=SELECTORS.seen+uint(taskId);
 const r=await provider.request({method:"eth_call",params:[{to:state.destination.address,data},"latest"]});
 const seen=BigInt(r||"0x0")===1n;
 state.callbackSeen=seen;save();
 $("verifyStatus").textContent=seen?"TRUE on Sepolia destination (read-only onchain result)":"Not seen yet; verify Reactive processing and callback reserve";
 log(seen?"Destination checkpointSeen("+taskId+") TRUE! Verify Reactive Lasna event/receipt before judged submission.":"Destination checkpointSeen still FALSE. No callback success claimed.");
 return seen;
}
function urlFor(network,tx){
 if(!hash(tx))return null;
 return (network===SEP?"https://sepolia.etherscan.io/tx/":"https://lasna.reactscan.net/tx/")+tx;
}
function button(id,enabled){$(id).disabled=!enabled}
function render(){
 const ok=!!provider&&!!wallet&&wallet.toLowerCase()===EXPECTED.toLowerCase()&&!!artifacts;
 const networkName=chain===SEP?"Ethereum Sepolia":chain===LAS?"Reactive Lasna":"OTHER/UNKNOWN — NO MAINNET WRITES";
 $("wallet").textContent=provider?
   "Account: "+(wallet||"Not connected")+" | Chain: "+(chain??"unknown")+" ("+networkName+")"+
   (ok?" | Wallet verified":" | Connect expected account before transaction"):
   "MetaMask browser provider unavailable";
 button("connect",!!provider&&!wallet);
 button("reauthorize",!!provider&&!!wallet);
 button("disconnect",!!provider&&!!wallet);
 button("sep",ok);button("lasna",ok);button("refresh",!!provider);
 button("origin",false);
 button("destination",ok&&chain===SEP&&!state.destination?.txHash);
 button("guardian",ok&&chain===LAS&&state.origin?.address&&state.destination?.address&&!state.guardian?.txHash);
 button("authorize",ok&&chain===SEP&&state.destination?.address&&state.guardian?.address&&!state.authorize?.txHash);
 button("fundDestination",ok&&chain===SEP&&state.destination?.address&&!state.fundDestination?.txHash);
 button("announce",ok&&chain===SEP&&state.origin?.address&&state.authorize?.status==="MINED_VERIFIED"&&!state.announce?.txHash);
 button("postFunding",ok&&chain===SEP&&state.origin?.address&&state.destination?.address&&state.announce?.taskId&&state.fundDestination?.status==="MINED_VERIFIED"&&!state.postFunding?.txHash&&!state.callbackSeen);
 button("verify",ok&&chain===SEP&&state.destination?.address&&!!(state.postFunding?.taskId||state.announce?.taskId));
 const show=(id,k)=>{$(id).textContent=state[k]?.address?"Verified "+state[k].address+" (block "+state[k].blockNumber+")":state[k]?.txHash?"Pending receipt "+state[k].txHash: "No verified transaction yet"};
 show("originStatus","origin");show("destinationStatus","destination");show("guardianStatus","guardian");
 $("authorizeStatus").textContent=state.authorize?.status==="MINED_VERIFIED"?"Owner authorization verified in block "+state.authorize.blockNumber:(state.authorize?.txHash?"Pending authorization receipt":"Not authorized");
 $("fundStatus").textContent=state.fundDestination?.status==="MINED_VERIFIED"?"Proxy deposit receipt verified in block "+state.fundDestination.blockNumber:(state.fundDestination?.txHash?"Pending owner deposit receipt":"Not funded through local site yet");
 $("announceStatus").textContent=state.announce?.taskId?"Event task #"+state.announce.taskId+" verified block "+state.announce.blockNumber:(state.announce?.txHash?"Pending genuine event receipt":"Not announced");
 $("postFundingStatus").textContent=state.postFunding?.taskId?"Post-funding checkpoint #"+state.postFunding.taskId+" verified in block "+state.postFunding.blockNumber:(state.postFunding?.txHash?"Pending owner-approved event receipt":"Not attempted");
 $("verifyStatus").textContent=state.callbackSeen?"checkpointSeen TRUE (Lasna reactive proof still requires separate verification)":"No confirmed Sepolia destination callback";
 $("proofs").textContent=JSON.stringify({wallet:EXPECTED,origin:state.origin||null,destination:state.destination||null,guardian:state.guardian||null,authorize:state.authorize||null,fundDestination:state.fundDestination||null,announce:state.announce||null,postFunding:state.postFunding||null,callbackSeen:!!state.callbackSeen},null,2);
}
async function action(name,func){
 try{$("status").setAttribute("aria-busy","true");await readWallet();await func()}
 catch(e){log(name+" BLOCKED: "+(e?.message||String(e)))}
 finally{$("status").removeAttribute("aria-busy");render()}
}
$("connect").addEventListener("click",()=>action("Connect",async()=>{
 if(!provider)throw Error("MetaMask not found");
 const accounts=await provider.request({method:"eth_requestAccounts"});
 if(!accounts?.length||accounts[0].toLowerCase()!==EXPECTED.toLowerCase())throw Error("Wrong connected account");
 await readWallet();log("Original MetaMask account connected; no signature or payment.");
}));
$("reauthorize").addEventListener("click",()=>action("Re-authorize account scope",async()=>{
 if(!provider||!wallet||wallet.toLowerCase()!==EXPECTED.toLowerCase())throw Error("Original wallet must be connected first");
 if(chain!==LAS&&chain!==SEP)throw Error("Only an authorized testnet can request permission");
 log("Opening MetaMask's normal account-permission prompt for current testnet; owner may approve or reject.");
 await provider.request({method:"wallet_requestPermissions",params:[{eth_accounts:{}}]});
 await readWallet();log("Permission renewal requested and user prompt completed. Recheck a transaction only after approval.");
}));
$("disconnect").addEventListener("click",()=>action("Disconnect only this local site",async()=>{
 if(!provider||!wallet)throw Error("Not connected");
 if(![SEP,LAS].includes(chain))throw Error("Refuse permission changes while on mainnet");
 await provider.request({method:"wallet_revokePermissions",params:[{eth_accounts:{}}]});
 wallet=null;await readWallet();
 log("Localhost account authorization revoked. Public transaction receipts remain saved; click Connect existing MetaMask while on Reactive Lasna.");
}));
$("sep").addEventListener("click",()=>action("Sepolia switch",()=>networkSwitch(SEP)));
$("lasna").addEventListener("click",()=>action("Lasna switch",()=>networkSwitch(LAS)));
$("origin").addEventListener("click",()=>action("Origin preserved",async()=>{log("Already independently deployed and verified: original Sepolia Origin. No duplicate transaction.");}));
$("destination").addEventListener("click",()=>action("V2 Destination deployment",async()=>{
 ensureWallet(SEP);
 const originCode=await provider.request({method:"eth_getCode",params:[state.origin.address,"latest"]});
 if(!originCode||originCode==="0x")throw Error("Original Sepolia Origin bytecode missing; stop V2 deployment");
 await deploy("QuestDestinationV2","destination",SEP,[CALLBACK_PROXY]);
}));
$("guardian").addEventListener("click",()=>action("Reactive deployment",async()=>{
 const amount=$("reserve").value;
 if(!["0","0.1","0.5","1"].includes(amount))throw Error("Invalid testnet reserve");
 const wei=BigInt(amount.split(".")[0])*10n**18n+
   BigInt((amount.split(".")[1]||"").padEnd(18,"0")||"0");
 await deploy("QuestGuardianReactiveV2","guardian",LAS,
  [SEP,state.origin.address,SEP,state.destination.address],hex(wei));
}));
$("authorize").addEventListener("click",()=>action("One-time authorization",async()=>{
 const actual=await authorizedAddress();
 if(actual){
  if(actual.toLowerCase()!==state.guardian.address.toLowerCase())throw Error("Destination already bound to a DIFFERENT Reactive contract; do NOT send.");
  log("Already authorized to exactly verified Guardian; no duplicate transaction");
  return;
 }
 const data=SELECTORS.authorize+encodeAddress(state.guardian.address);
 await sendTx("authorize",SEP,{to:state.destination.address,data,value:"0x0"});
 const after=await authorizedAddress();
 if(after?.toLowerCase()!==state.guardian.address.toLowerCase())throw Error("Authorization not visible onchain despite transaction");
}));
$("fundDestination").addEventListener("click",()=>action("Fund destination callback reserves",async()=>{
 ensureWallet(SEP);
 if(!state.destination?.address)throw Error("Destination must be verified before any deposit");
 const target=state.destination.address;
 const reserveHex=await provider.request({method:"eth_call",params:[{to:CALLBACK_PROXY,data:RESERVES_SELECTOR+encodeAddress(target)},"latest"]});
 const debtHex=await provider.request({method:"eth_call",params:[{to:CALLBACK_PROXY,data:DEBT_SELECTOR+encodeAddress(target)},"latest"]});
 if(BigInt(reserveHex)>=100000000000000000n)throw Error("Destination already has at least 0.1 test ETH prepaid. Do not duplicate deposit.");
 if(BigInt(debtHex)!==0n)throw Error("Recipient has debt; research exact amount before any deposit.");
 log("Proxy confirmed 0 debt and "+String(BigInt(reserveHex))+" wei reserves. Opening owner-only Sepolia testETH deposit.");
 await sendTx("fundDestination",SEP,{to:CALLBACK_PROXY,data:DEPOSIT_SELECTOR+encodeAddress(target),value:hex(100000000000000000n)});
}));
$("announce").addEventListener("click",()=>action("Announce checkpoint",async()=>{
 const current=await authorizedAddress();
 if(current?.toLowerCase()!==state.guardian.address.toLowerCase())throw Error("Correct Guardian not authorized on Sepolia");
 const deadline=BigInt(Math.floor(Date.now()/1000)+3600);
 const data=SELECTORS.announce+uint(deadline,"uint64");
 await sendTx("announce",SEP,{to:state.origin.address,data,value:"0x0"});
}));
$("postFunding").addEventListener("click",()=>action("One new checkpoint after destination funding",async()=>{
 ensureWallet(SEP);
 if(!state.fundDestination||state.fundDestination.status!=="MINED_VERIFIED")
  throw Error("Official callback proxy deposit must be mined and verified first");
 if(!state.announce?.taskId)throw Error("No prior genuine checkpoint found; use initial announce flow");
 if(state.postFunding?.txHash)throw Error("One post-funding event already exists: must not send a duplicate");
 const correct=await authorizedAddress();
 if(correct?.toLowerCase()!==state.guardian.address.toLowerCase())throw Error("Guardian authorization mismatch");
 const reserves=BigInt(await provider.request({method:"eth_call",params:[{to:CALLBACK_PROXY,data:RESERVES_SELECTOR+encodeAddress(state.destination.address)},"latest"]}));
 const debt=BigInt(await provider.request({method:"eth_call",params:[{to:CALLBACK_PROXY,data:DEBT_SELECTOR+encodeAddress(state.destination.address)},"latest"]}));
 if(reserves===0n||debt!==0n)throw Error("Destination callback fees remain unfunded or in debt; do not send.");
 const prior=await provider.request({method:"eth_call",params:[{to:state.destination.address,data:SELECTORS.seen+uint(state.announce.taskId)},"latest"]});
 if(BigInt(prior)!==0n)throw Error("Earlier callback already arrived; no second announcement needed");
 const deadline=BigInt(Math.floor(Date.now()/1000)+3600);
 const data=SELECTORS.announce+uint(deadline,"uint64");
 log("Reserve funded and previous callback still unseen. Requesting ONE new owner-approved distinct task after funding.");
 await sendTx("postFunding",SEP,{to:state.origin.address,data,value:"0x0"});
}));
$("verify").addEventListener("click",()=>action("Verify destination",verifySeen));
$("refresh").addEventListener("click",()=>action("Refresh receipts",async()=>{
 if(!provider)throw Error("No wallet");
 for(const k of ["origin","destination","guardian","authorize","fundDestination","announce","postFunding"]){
  const r=state[k];if(!r?.txHash)continue;
  if(chain!==r.chainId){continue}
  if(r.status!=="DEPLOYED_VERIFIED"&&r.status!=="MINED_VERIFIED")
   await maybeReceipt(k,r.chainId);
 }
 if(chain===SEP&&state.destination?.address&&state.guardian?.address){
  const configured=await authorizedAddress();
  if(configured&&configured.toLowerCase()===state.guardian.address.toLowerCase()&&state.authorize?.txHash) {
    await maybeReceipt("authorize",SEP);
  }
 }
 if(chain===SEP&&state.announce?.taskId)await verifySeen();
 log("Public receipts checked on currently selected testnet. No transaction sent.");
}));
$("copyProof").addEventListener("click",async()=>{
 await navigator.clipboard.writeText($("proofs").textContent);
 log("Public receipt JSON copied (no private keys).");
});
provider=findProvider();
provider?.on?.("chainChanged",()=>readWallet().catch(e=>log(e.message)));
provider?.on?.("accountsChanged",()=>readWallet().catch(e=>log(e.message)));
try{await loadArtifacts();await readWallet();log("Three bytecode SHA256 checks verified. Wallet actions require explicit user interaction.")}catch(e){artifacts=null;render();log("Preflight failed: "+e.message)}
