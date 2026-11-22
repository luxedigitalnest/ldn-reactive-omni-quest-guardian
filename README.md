# LDN Reactive Omni Quest Guardian

**Status: working, locally tested Solidity source prototype. There is NO Lasna deployment, genuine on-chain event-to-callback transaction, or judged buildathon submission yet.**

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

## Deployment plan — NOT COMPLETED

1. Confirm **Base Sepolia** origin/destination (chain ID 84532) and official callback proxy from the current [supported-chains guide](https://dev.reactive.network/origins-and-destinations). Use only genuine free testnet assets.
2. Deploy QuestOrigin and QuestDestination to origin/destination using official testnet RPC. Configure destination callback proxy in its constructor.
3. Deploy QuestGuardianReactive to **Reactive Lasna (chain ID 5318007)** with the actual origin/destination contract addresses. The subscription is registered through the Omni SYSTEM contract at 0x8888888888888888888888888888888888888888. Fund its execution reserve with testnet REACT only.
4. Configure destination's setReactiveOnce to the deployed Reactive contract address. This is irreversible, so inspect addresses before signing.
5. Fund destination callback reserves through the official proxy if needed. Check gas and debits; **never send real funds**.
6. Call announce on origin. Collect three genuine linked explorer proofs: origin event TX, Reactive TX/callback request, and destination callback TX. Verify checkpointSeen(taskId) on destination.
7. Produce an original video under three minutes and enter the **actual** addresses, public repository and transaction hashes in DoraHacks before Dec 5.

**Without real on-chain callbacks, the organizer explicitly will not score the submission. Do not submit a concept entry or fabricate receipts.**

## Limitations and risks

- An announced checkpoint is not an off-chain quest-completion credential. Real-world task attestation would need a trustworthy issuer.
- The event exposes public task metadata; this is not an anonymity system. Do not store identifying data in real events.
- The destination uses taskId as its replay key; production multi-origin deployments must bind origin/chain identity too.
- Reactive gas and callback reserves have separate costs; a lack of funds can halt the on-chain flow. Testnet deployment and auditing are pending.
- Not a financial product or a promised grant.

## Official references

- [Reactive Omni Buildathon](https://blog.reactive.network/reactive-omni-buildathon-thirty-days-to-find-out-what-one-second-buys/)
- [Omni Reactive Contracts API](https://dev.reactive.network/reactive-contracts)
- [Destination Callback Contracts](https://dev.reactive.network/callback-contracts)
- [Official debugging and faucet](https://dev.reactive.network/debugging)

Apache-2.0 licensed. See LICENSE.

## Reproducible unsigned deployment artifacts (22 Nov 2026)

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

As of 22 Nov 2026 the real wallet's Lasna balance is **0**; the only confirmed new DoraHacks action is **event registration**, not judged project submission.
