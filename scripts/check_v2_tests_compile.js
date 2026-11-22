"use strict";
const fs=require("fs"),path=require("path"),solc=require("solc");
const ROOT=path.resolve(__dirname,".."),LIB=path.join(ROOT,"lib","reactive-lib-omni");
const paths=["test/QuestV2.t.sol","src/QuestDestinationV2.sol","src/QuestGuardianReactiveV2.sol"];
const sources=Object.fromEntries(paths.map(x=>[x,{content:fs.readFileSync(path.join(ROOT,x),"utf8")}]));
function imp(name){
 const rel=name.startsWith("@reactive/")?name.slice(10):name;
 for(const p of [path.join(ROOT,rel),path.join(LIB,rel),path.join(LIB,"src",rel.replace(/^src\//,""))])if(fs.existsSync(p))return {contents:fs.readFileSync(p,"utf8")};
 return {error:"Unresolved import "+name};
}
const input={language:"Solidity",sources,settings:{optimizer:{enabled:true,runs:200},evmVersion:"cancun",outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}};
const out=JSON.parse(solc.compile(JSON.stringify(input),{import:imp}));
const errs=(out.errors||[]).filter(x=>x.severity==="error");
if(errs.length){errs.forEach(e=>console.error(e.formattedMessage));process.exit(2)}
console.log("V2 original Solidity test suite compiles",Object.keys(out.contracts["test/QuestV2.t.sol"]||{}),"with solc",solc.version());
