"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {encode,validAddress,loadArtifacts,buildPlan,buildDraft,parseArgs,SEPOLIA,LASNA,CALLBACK_PROXY} = require("../scripts/unsigned_deploy_plan");
const wallet="0xADFC0cb6819BC49939b021E45b0d43306575e5d3";
const origin="0x1111111111111111111111111111111111111111";
const dest="0x2222222222222222222222222222222222222222";

test("pinned artifact hashes and ABI verified",()=> {
 const a=loadArtifacts(); assert.deepEqual(Object.keys(a).sort(),["QuestDestination","QuestGuardianReactive","QuestOrigin"]);
 assert.equal(a.QuestOrigin.hash.length,64);
});
test("default plan is 2 draft Sepolia deployments only",()=>{
 const p=buildPlan();
 assert.equal(p.status,"PREPARED_UNSIGNED_ONLY");
 assert.equal(p.steps.length,2);
 assert.ok(p.steps.every(s=>s.status==="UNSIGNED_NOT_SENT_NOT_DEPLOYED"));
 assert.ok(p.steps.every(s=>s.chainId===SEPOLIA));
 assert.equal(p.steps[0].tx.from,wallet);
 assert.equal("to" in p.steps[0].tx,false);
 assert.equal("gas" in p.steps[0].tx,false);
 assert.equal(p.steps[0].tx.value,"0x0");
});
test("destination constructor encodes exact official callback proxy",()=>{
 const p=buildPlan();
 assert.equal(p.steps[1].constructor_args[0],CALLBACK_PROXY);
 assert.equal(p.steps[1].tx.data.slice(-40).toLowerCase(),CALLBACK_PROXY.slice(2).toLowerCase());
});
test("origin bytecode includes no constructor append",()=>{
 const a=loadArtifacts();
 const p=buildPlan();
 assert.equal(p.steps[0].tx.data,a.QuestOrigin.artifact.bytecode);
});
test("actual address placeholders produce third draft only when both verified",()=>{
 const p=buildPlan({from:wallet,origin,destination:dest});
 assert.equal(p.steps.length,3);
 const last=p.steps[2];
 assert.equal(last.chainId,LASNA);
 assert.deepEqual(last.constructor_args,[SEPOLIA,origin,SEPOLIA,dest]);
 assert.ok(last.tx.data.startsWith(loadArtifacts().QuestGuardianReactive.artifact.bytecode));
 assert.equal(last.tx.data.length,loadArtifacts().QuestGuardianReactive.artifact.bytecode.length+256);
 assert.equal(last.tx.value,"0x0");
});
test("refuses incomplete deployment receipt locations",()=>{
 assert.throws(()=>buildPlan({origin}),/Supply BOTH/);
 assert.throws(()=>buildPlan({destination:dest}),/Supply BOTH/);
});
test("refuses duplicate contract address and invalid addresses",()=>{
 assert.throws(()=>buildPlan({origin,destination:origin}),/must differ/);
 assert.throws(()=>validAddress("0x0000000000000000000000000000000000000000"),/zero/);
 assert.throws(()=>validAddress("1234"),/20-byte/);
});
test("exact integer uint encoding rejects out of range",()=>{
 assert.equal(encode(["uint256"],[SEPOLIA]),BigInt(SEPOLIA).toString(16).padStart(64,"0"));
 assert.throws(()=>encode(["uint256"],[-1]),/Invalid/);
 assert.throws(()=>encode(["uint256"],["1.5"]),/Invalid/);
 assert.throws(()=>encode(["uint256"],[(1n<<256n).toString()]),/Out-of-range/);
 assert.throws(()=>encode(["uint256"],[Number.MAX_SAFE_INTEGER+1]),/Unsafe/);
});
test("unsupported constructor type and arity blocked",()=>{
 assert.throws(()=>encode(["uint64"],[123]),/Unsupported/);
 assert.throws(()=>encode(["uint256"],[]),/mismatch/);
});
test("unexpected chain ID cannot create draft",()=>{
 const a=loadArtifacts();
 assert.throws(()=>buildDraft(wallet,"QuestOrigin",1,[],a),/Unexpected chain/);
});
test("bad or repeated CLI flags rejected",()=>{
 assert.throws(()=>parseArgs(["--wallet",wallet]),/Usage/);
 assert.throws(()=>parseArgs(["--from",wallet,"--from",wallet]),/Repeated/);
 assert.deepEqual(parseArgs(["--origin",origin,"--destination",dest]),{origin,destination:dest});
});
