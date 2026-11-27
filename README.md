# LDN Reactive Omni Quest Guardian

**Status (22 November 2026): LIVE, VERIFIED end-to-end cross-chain V2 demo on Ethereum Sepolia and Reactive Lasna: source checkpoint #4 -> real Lasna CallbackRequested -> successful Sepolia destination callback. Independent RPC checks verify `checkpointSeen(4) == true` and the destination `CheckpointMirrored(4)` event. The original public DoraHacks BUIDL [51644](https://dorahacks.io/build/51644) and proof video are live (reverified 27 November 2026); organizer acceptance, judging and any award remain unconfirmed.** See [full on-chain evidence](LIVE_ONCHAIN_PROOFS_2026-11-22.md).

An original open-source, accessibility-oriented checkpoint automation experiment for [Reactive Omni Buildathon](https://dorahacks.io/hackathon/reactive-omni-buildathon) (deadline 5 December 2026), proposed for **Set It and Forget It**.

## System

- **QuestOrigin.sol** announces one checkpoint with future deadline and emits the CheckpointAnnounced event. This does not prove a human completed an off-chain task.
- **QuestGuardianReactive.sol** subscribes to the precise origin chain/contract/topic through the current Reactive Omni system contract. It checks log authenticity via the onlySystem modifier, log shape, event identity and duplicate transaction/log keys. It then requests a callback using requestCallbackV_1_0 and the mandatory first-argument address(0) placeholder.
- **QuestDestination.sol** accepts a callback only from the configured destination proxy and the injected authenticated Reactive contract address; it mirrors the task ID, creator and deadline and rejects a duplicate.

These are **Omni, not legacy ReactVM** contracts.

## Verified development evidence

- [Solidity 0.8.29 compilation and twelve Foundry tests: 12/12 PASSED](https://github.com/luxedigitalnest/ldn-reactive-omni-quest-guardian/actions/runs/44904085552).
- Current official [reactive-lib-omni](https://github.com/Reactive-Network/reactive-lib-omni) tag **v0.1.0**, pinned to commit 3ade0dcf1d27e67e5783ef807e73a1b9e0c0cce8.
- Six tests check origin/destination creation, unauthorized callback access, owner configuration and replay.
- Six additional tests execute the real Reactive contract's subscription and callback code **against a local mock of the Omni system interface**, covering correct payload, onlySystem authorization, replay and malformed events.
- No simulated test has been called an actual network transaction.

## Reproduce

Use Foundry and Solidity 0.8.29.

1. Clone this repository.
2. Clone the official reactive-lib-omni release tag v0.1.0 into lib/reactive-lib-omni and verify its commit equals 3ade0dcf1d27e67e5783ef807e73a1b9e0c0cce8.
3. Run **forge build** and **forge test -vv**.
4. Compare with the public GitHub Actions workflow in .github/workflows/omni-solidity-ci.yml.

## Original deployment checklist — V1 failed, corrected V2 delivered

1. Verified **Ethereum Sepolia** for both original origin and destination (chain ID 11155111), with official Sepolia callback proxy from the [supported-chains guide](https://dev.reactive.network/origins-and-destinations). All tests use free testnet assets.
2. Deploy QuestOrigin and QuestDestination to origin/destination using official testnet RPC. Configure destination callback proxy in its constructor.
3. Deploy QuestGuardianReactive to **Reactive Lasna (chain ID 5318007)** with the actual origin/destination contract addresses. The subscription is registered through the Omni SYSTEM contract at 0x8888888888888888888888888888888888888888. Fund its execution reserve with testnet REACT only.
4. Configure destination's setReactiveOnce to the deployed Reactive contract address. This is irreversible, so inspect addresses before signing.
5. Fund destination callback reserves through the official proxy if needed. Check gas and debits; **never send real funds**.
6. Call announce on origin. Collect three genuine linked explorer proofs: origin event TX, Reactive TX/callback request, and destination callback TX. Verify checkpointSeen(taskId) on destination.
7. Produce an original video under three minutes and enter the **actual** addresses, public repository and transaction hashes in DoraHacks before Dec 5.

**A genuine end-to-end V2 callback, original video and public BUIDL [51644](https://dorahacks.io/build/51644) are verified. The organizer's acceptance and judging outcome remain unconfirmed. Do not redeploy or create duplicate entries.**

## Limitations and risks

- An announced checkpoint is not an off-chain quest-completion credential. Real-world task attestation would need a trustworthy issuer.
- The event exposes public task metadata; this is not an anonymity system. Do not store identifying data in real events.
- The destination uses taskId as its replay key; production multi-origin deployments must bind origin/chain identity too.
- Reactive gas and callback reserves have separate costs; a lack of funds can halt the on-chain flow. A V2 end-to-end callback on the testnets was verified, but independent production security auditing remains outstanding.
- Not a financial product or a promised grant.

## Official references

- [Reactive Omni Buildathon](https://blog.reactive.network/reactive-omni-buildathon-thirty-days-to-find-out-what-one-second-buys/)
- [Omni Reactive Contracts API](https://dev.reactive.network/reactive-contracts)
- [Destination Callback Contracts](https://dev.reactive.network/callback-contracts)
- [Official debugging and faucet](https://dev.reactive.network/debugging)

Apache-2.0 licensed. See LICENSE.

## Historical V1 unsigned deployment artifacts (do not deploy V1 again)

This section records the original **unsuccessful V1 preflight**. The older callback proxy below is obsolete for our live Lasna/Sepolia V2 demonstration; the current working proxy, V2 contract addresses, and genuine receipts are documented under *Live V2 success*.

A separate local no-key compilation path is now available in `scripts/compile_artifacts.js`, pinning `solc@0.8.29` and verifying that official `lib/reactive-lib-omni` checkout is exactly `3ade0dcf1d27e67e5783ef807e73a1b9e0c0cce8`.

```bash
git clone --depth 1 --branch v0.1.0 https://github.com/Reactive-Network/reactive-lib-omni.git lib/reactive-lib-omni
npm ci --ignore-scripts
npm run compile
```

After successful compilation, `artifacts/manifest.json` and three contract ABI/bytecode JSON files are generated (gitignored to avoid confusing build artifacts with signed receipts). The original 12 Foundry CI tests remain separate. **No wallet is opened, no private key is required, and no transaction is sent by this tool.**

Deployment order with **Ethereum Sepolia on BOTH origin and destination** (the official chain is supported for both):

1. Fund **Lasna testnet** from the official ETH Sepolia Reactive faucet with a normal owner-approved transaction: 0.1 test ETH from 0xADFC0cb6819BC49939b021E45b0d43306575e5d3 to 0x9b9BB25f1A81078C544C829c5EB7822d747Cf434, with empty calldata and chain ID 11155111; first confirm this is testnet only. Existing simulated `eth_estimateGas` was 25,145, **not a receipt**.
2. Wait for a verifiable Sepolia transaction and corresponding **10 TEST lREACT** on Reactive Lasna. Until then, deployment is blocked. Never resend without checking nonce and balance.
3. On Sepolia, deploy `QuestOrigin()` then `QuestDestination(callbackProxy=0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA)`, record addresses and receipts.
4. On Lasna, deploy `QuestGuardianReactive(originChainId=11155111,originContract=<actual-origin>,destinationChainId=11155111,destinationContract=<actual-destination>)`, with funded gas/reserve; record its receipt, event subscription and callback costs.
5. On Sepolia, call `QuestDestination.setReactiveOnce(<actual-reactive>)` carefully (one-time binding). Then call `QuestOrigin.announce(<future-UTC-timestamp>)`.
6. Verify **three authentic chain-linked receipts**, destination `checkpointSeen(taskId)==true`, and callback evidence before recording a demo under 3 minutes and submitting the original DoraHacks build.

**Historical preflight note:** On the morning of 22 Nov 2026, Lasna initially held zero test REACT. A subsequent genuine owner-approved faucet transaction funded Lasna, V2 contracts were deployed, and callback checkpoint #4 was verified. The judged DoraHacks submission remains separate from blockchain success.

## Verified offline unsigned deployment transaction drafts (22 Nov 2026)

The new original [unsigned deployment helper](scripts/unsigned_deploy_plan.js) eliminates manual constructor ABI encoding, without touching or unlocking a wallet. It reads locally compiled, pinned Solc artifacts, verifies the manifest compiler/library commit and **SHA-256 bytecode hash**, and returns the exact unsigned constructor DATA for two intended Sepolia contract-create transactions:

- **QuestOrigin** on Sepolia chain 11155111, zero value, no constructor inputs.
- **QuestDestination** on Sepolia chain 11155111, with the official Sepolia callback proxy `0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA` ABI-encoded.
- **QuestGuardianReactive** on Lasna chain 5318007 is output only **after** both real Sepolia deployed contract addresses are provided. It uses both exact addresses and the origin/destination chain IDs; unknown addresses are never invented.

Run: `npm run compile && npm run test:unsigned && npm run unsigned-plan`. After both genuine Sepolia explorer receipts exist, `node scripts/unsigned_deploy_plan.js --origin REAL_ORIGIN_ADDRESS --destination REAL_DESTINATION_ADDRESS` prepares the Lasna constructor, still without a signature.

**Tests:** eleven dedicated offline Node.js tests verify pinned hashes, constructor encoding, correct networks, expected bytecode length and refusal of missing, duplicate, malformed or invented addresses. Neither these drafts nor the original Foundry tests are proof of a live deployed contract. Wallet transactions must be explicitly reviewed and approved by the owner in their real wallet UI. The helper intentionally omits nonce, real gas, a signature, a transaction hash and final contracts until the corresponding network receipts exist. **No RPC is called and nothing is broadcast.** Do not send mainnet funds or share seed phrases.

## Live V2 success — transaction walkthrough

The corrected version has an independently verified end-to-end task #4 flow:

1. [Source event on Ethereum Sepolia](https://sepolia.etherscan.io/tx/0xa9c3b35da1ca6e644aec5c8173015a192968cae0e616a296c66284dad1e0bea2) — `CheckpointAnnounced(4)`, block 12189751, from the original QuestOrigin `0xa604534b1c0e9ca8a855569042a0582576b2e7bc`.
2. [Original Reactive V2 contract processes it on Lasna](https://lasna.reactscan.net/tx/0xdd2e4ad174471e0e7a4764ac857eabebc33f3bb35b71a3aa977dab6a27ff8515) — `CallbackRequested(4)`, block 8985935, from the new Guardian `0xf9dd6d01f26f1c1f8f4fde7c42969d0c92016a6b`, `requestsMade() = 1`.
3. [Correct Sepolia callback proxy delivers to V2 Destination](https://sepolia.etherscan.io/tx/0xc4080d7429e952f0164d8b3dd4877df23c740e8fa402779fb52d753e33b3b138) — status **SUCCESS**, block 12189752, live `CheckpointMirrored(4)` log emitted by new Destination `0x348aaec876dc199ca893f197ac8bb99b2d1a609a`, and `checkpointSeen(4) == true`.

All three transactions are real public blockchain testnet evidence. See [full independent RPC checks](LIVE_ONCHAIN_PROOFS_2026-11-22.md), and [GitHub Actions Solidity build/tests](https://github.com/luxedigitalnest/ldn-reactive-omni-quest-guardian/actions/runs/45040324902).

**Deployment comparison:** the original V1 callback FAILED because it hard-coded an outdated Sepolia proxy and omitted the official inherited payer; the corrected V2 uses current proxy `0xAa14d9Cd0f788Ca23d11805986C1d8bd035D23b4` and an `800000` callback gas limit. Never assume a successful callback from a local mock or a source event alone.

**Run the owner's no-custody local demo UI:** `npm ci --ignore-scripts && npm run compile && npm run compile:v2 && node deploy-ui/server.mjs`, then open `http://127.0.0.1:4177/v2.html` on the owner's computer with trusted MetaMask. The app only serves an allowlist on localhost, validates exact pinned compiled bytecode SHA-256, restricts account and testnet, and requires owner action in MetaMask for every transaction. Transaction hashes are retained in browser localStorage to avoid duplicate sends. **Do not deploy again** if you already have proof addresses; receipt evidence is in this repository. No real ETH or private key is needed.

The prototype is not audited, does not assert human real-world task completion, and has no confirmed grant payment. **Original proof video published (2m44.8s):** [Watch the accessible HTML5 demo site](https://luxedigitalnest.github.io/ldn-reactive-omni-quest-guardian/) · [Direct video MP4](https://luxedigitalnest.github.io/ldn-reactive-omni-quest-guardian/LDN_Reactive_Omni_Quest_Guardian_Proof_Demo_2026-11-22.mp4) · [GitHub Release](https://github.com/luxedigitalnest/ldn-reactive-omni-quest-guardian/releases/tag/v0.2.0-omni-proof).

The actual demo is 164.759 seconds, H.264 video with AAC English male narration and synchronized captions, using genuine source-code and on-chain explorer screenshots, original script and traceable receipts. No fabricated footage or submitted prize claimed. **27 November status:** the [original BUIDL 51644](https://dorahacks.io/build/51644) publicly displays the same project, repository, original proof video and testnet evidence. The event deadline remains 5 December 2026. A public BUIDL does not by itself establish event acceptance or judging; confirm the organizer's status in the existing account and amend that entry only if requested. No grant or prize has been verified.
