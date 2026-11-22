"use strict";
// Audit-safe transaction DATA generator. NO wallet, RPC, signing, broadcast or gas estimates.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");
const SEPOLIA = 11155111;
const LASNA = 5318007;
const CALLBACK_PROXY = "0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA";
const TEST_WALLET = "0xADFC0cb6819BC49939b021E45b0d43306575e5d3";
const PINNED_LIBRARY = "3ade0dcf1d27e67e5783ef807e73a1b9e0c0cce8";
const EXPLORER_SEPOLIA = "https://sepolia.etherscan.io/";
const EXPLORER_LASNA = "https://lasna.reactscan.net/";
const MAX_UINT256 = (1n << 256n) - 1n;

function validAddress(s, what = "address") {
  if (typeof s !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(s))
    throw new Error(what + " must be a 20-byte EVM address");
  if (/^0x0{40}$/i.test(s)) throw new Error(what + " cannot be the zero address");
  return s;
}

function encode(types, args) {
  if (!Array.isArray(types) || !Array.isArray(args) || types.length !== args.length)
    throw new Error("Constructor arguments/types mismatch");
  let result = "";
  for (let i = 0; i < types.length; i++) {
    const type = types[i], val = args[i];
    if (type === "address") {
      result += validAddress(val, "constructor address").slice(2).toLowerCase().padStart(64, "0");
    } else if (type === "uint256") {
      if (typeof val === "number" && !Number.isSafeInteger(val)) throw new Error("Unsafe numeric constructor argument");
      const text = String(val);
      if (!/^(0|[1-9][0-9]*)$/.test(text)) throw new Error("Invalid uint256");
      const n = BigInt(text);
      if (n < 0 || n > MAX_UINT256) throw new Error("Out-of-range uint256");
      result += n.toString(16).padStart(64, "0");
    } else throw new Error("Unsupported constructor type: " + type);
  }
  return result;
}

function loadArtifacts(root = ROOT) {
  const base = path.join(root, "artifacts");
  const manifest = JSON.parse(fs.readFileSync(path.join(base, "manifest.json"), "utf8"));
  if (manifest.networkStatus !== "NOT_DEPLOYED_UNSIGNED_ONLY" ||
      manifest.libraryCommit !== PINNED_LIBRARY ||
      !String(manifest.solidityVersion).startsWith("0.8.29+"))
    throw new Error("Manifest source revision or unsigned status not verified");
  const out = {};
  for (const entry of manifest.contracts) {
    if (!["QuestOrigin", "QuestDestination", "QuestGuardianReactive"].includes(entry.contract)) throw new Error("Unknown artifact");
    const a = JSON.parse(fs.readFileSync(path.join(base, entry.contract + ".json"), "utf8"));
    if (a.contract !== entry.contract || a.libraryCommit !== PINNED_LIBRARY ||
        typeof a.bytecode !== "string" || !/^0x[0-9a-fA-F]+$/.test(a.bytecode))
      throw new Error("Artifact cannot be trusted");
    const hash = crypto.createHash("sha256").update(a.bytecode).digest("hex");
    if (hash !== entry.sha256 || (a.bytecode.length - 2) / 2 !== entry.bytecodeBytes)
      throw new Error("Bytecode checksum mismatch for " + entry.contract);
    const inputs = Array.isArray(a.constructorInputs) ? a.constructorInputs : [];
    if (JSON.stringify(inputs.map(x=>x.type)) !== JSON.stringify(
      a.abi.filter(x=>x.type==="constructor").flatMap(x=>x.inputs||[]).map(x=>x.type)))
      throw new Error("Constructor ABI mismatch for " + entry.contract);
    out[entry.contract] = {artifact:a, hash};
  }
  if (Object.keys(out).length !== 3) throw new Error("Expected all three original contracts");
  return out;
}

function buildDraft(from, name, chainId, args, artifacts) {
  validAddress(from, "wallet");
  if (![SEPOLIA, LASNA].includes(chainId)) throw new Error("Unexpected chain");
  const record = artifacts[name];
  if (!record) throw new Error("Missing compiled artifact");
  const a = record.artifact;
  const calldata = a.bytecode + encode(a.constructorInputs.map(x=>x.type), args);
  return {
    status:"UNSIGNED_NOT_SENT_NOT_DEPLOYED", contract:name,
    chainId, chain:chainId===SEPOLIA?"Ethereum Sepolia TESTNET":"Reactive Lasna TESTNET",
    explorer:chainId===SEPOLIA?EXPLORER_SEPOLIA:EXPLORER_LASNA,
    artifacts_sha256:record.hash,
    constructor_args:args,
    // No destination: contract CREATE. Wallet must explicitly review and sign if chosen.
    tx:{from, value:"0x0", data:calldata},
    required_user_action:"Owner must review network, wallet, calldata, gas and fee in trusted wallet. Do not broadcast without their direct approval."
  };
}

function buildPlan({from=TEST_WALLET, origin, destination} = {}, artifacts=loadArtifacts()) {
  validAddress(from,"from");
  if (Boolean(origin) !== Boolean(destination)) throw new Error("Supply BOTH actual origin and destination deployment addresses or neither");
  const drafts=[
    buildDraft(from,"QuestOrigin",SEPOLIA,[],artifacts),
    buildDraft(from,"QuestDestination",SEPOLIA,[CALLBACK_PROXY],artifacts)
  ];
  if (origin && destination) {
    validAddress(origin,"origin");validAddress(destination,"destination");
    if (origin.toLowerCase()===destination.toLowerCase()) throw new Error("Origin and destination must differ");
    drafts.push(buildDraft(from,"QuestGuardianReactive",LASNA,[SEPOLIA,origin,SEPOLIA,destination],artifacts));
  }
  return {
    status:"PREPARED_UNSIGNED_ONLY",
    generated_at:new Date().toISOString(),
    required_networks:[SEPOLIA,LASNA],
    wallet:from,
    lasna_faucet_required:"Owner-signed 0.1 SEPOLIA TEST ETH to official faucet first; no Lasna balance currently",
    // Guard uses the data from compiled artifacts, not a fake deployed address.
    steps:drafts,
    not_included:"No transaction hash, nonce, estimated gas, signature, contract address or callback proof. Do not label these drafts deployed.",
    after_deployment:"Using verified explorer contract addresses, explicitly approve setReactiveOnce on Sepolia, announce real origin event and inspect genuine Reactive and destination receipts."
  };
}

function parseArgs(argv) {
  const opts = {};
  for (let i=0;i<argv.length;i+=2) {
    const key=argv[i];
    if (!["--from","--origin","--destination"].includes(key) || i+1>=argv.length)
      throw new Error("Usage: node scripts/unsigned_deploy_plan.js [--from PUBLIC_ADDRESS] [--origin VERIFIED_ADDRESS --destination VERIFIED_ADDRESS]");
    const field=key.slice(2);
    if (opts[field]) throw new Error("Repeated option "+key);
    opts[field]=argv[i+1];
  }
  return opts;
}

if (require.main===module) {
  try {console.log(JSON.stringify(buildPlan(parseArgs(process.argv.slice(2))), null, 2));}
  catch(e) {console.error("PREPARATION BLOCKED: "+e.message);process.exitCode=2;}
}
module.exports={encode,validAddress,loadArtifacts,buildDraft,buildPlan,parseArgs,SEPOLIA,LASNA,CALLBACK_PROXY};
