"use strict";
// Compiles original contracts with pinned solc and official pinned reactive-lib-omni.
// Offline artifacts only. No wallet access, RPC sends, private keys or live deployment.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const solc = require("solc");
const {execFileSync} = require("node:child_process");
const root = path.resolve(__dirname, "..");
const library = path.join(root, "lib", "reactive-lib-omni");
const expectedCommit = "3ade0dcf1d27e67e5783ef807e73a1b9e0c0cce8";
if (!solc.version().startsWith("0.8.29+")) throw new Error("Expected Solidity compiler 0.8.29");
const actual = execFileSync("git",["-C",library,"rev-parse","HEAD"],{encoding:"utf8"}).trim();
if (actual !== expectedCommit) throw new Error("Reactive Omni library hash differs: " + actual);
const names=["QuestOrigin.sol","QuestDestinationV2.sol","QuestGuardianReactiveV2.sol"];
const sources = Object.fromEntries(names.map(name=>{
  const filename="src/"+name;
  return [filename,{content:fs.readFileSync(path.join(root,filename),"utf8")}];
}));
function importSource(name) {
  const relative = name.startsWith("@reactive/") ? name.slice("@reactive/".length) : name;
  const places = [
    path.join(library,relative),
    path.join(root,relative),
    path.join(library,"src",relative),
    path.join(library,"src",relative.replace(/^src\//,""))
  ];
  for(const p of places) if(fs.existsSync(p) && fs.statSync(p).isFile()) {
    return {contents:fs.readFileSync(p,"utf8")};
  }
  return {error:"Source import not found: "+name};
}
const input={language:"Solidity",sources,settings:{
 optimizer:{enabled:true,runs:200},
 evmVersion:"cancun",
 outputSelection:{"*":{"*":["abi","evm.bytecode.object","evm.deployedBytecode.object"]}}
}};
const result=JSON.parse(solc.compile(JSON.stringify(input),{import:importSource}));
const messages=result.errors||[];
for (const e of messages) if(e.severity==="error") console.error(e.formattedMessage||e.message);
if(messages.some(e=>e.severity==="error")) process.exit(2);
const artifacts=path.join(root,"artifacts","v2");
fs.mkdirSync(artifacts,{recursive:true});
const compiled=[];
for(const name of names){
 const source="src/"+name;
 const contract=name.slice(0,-4);
 const entry=result.contracts?.[source]?.[contract];
 if(!entry || !entry.evm?.bytecode?.object) throw new Error("No bytecode for "+contract);
 const abi=entry.abi;
 const bytecode="0x"+entry.evm.bytecode.object;
 const output={contract,source,compiler:solc.version(),libraryCommit:actual,
  constructorInputs:abi.filter(e=>e.type==="constructor").flatMap(e=>e.inputs||[]),
  abi,bytecode,deployedBytecode:"0x"+(entry.evm.deployedBytecode?.object||"")};
 fs.writeFileSync(path.join(artifacts,contract+".json"),JSON.stringify(output,null,2));
 compiled.push({contract,constructor:output.constructorInputs.map(x=>x.name+":"+x.type),
  bytecodeBytes:(bytecode.length-2)/2,sha256:crypto.createHash("sha256").update(bytecode).digest("hex")});
}
fs.writeFileSync(path.join(artifacts,"manifest.json"),JSON.stringify({
 createdAt:new Date().toISOString(),networkStatus:"NOT_DEPLOYED_UNSIGNED_ONLY",
 solidityVersion:solc.version(),libraryCommit:actual,contracts:compiled
},null,2));
console.log(JSON.stringify({status:"COMPILED_UNSIGNED_NOT_DEPLOYED",contracts:compiled},null,2));
