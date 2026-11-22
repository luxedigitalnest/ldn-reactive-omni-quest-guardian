# Live testnet evidence — 22 November 2026

**Scope:** Ethereum Sepolia chain `11155111`; Reactive Lasna Omni chain `5318007`. These are TESTNET tokens and contain no real financial prizes. Wallet public address `0xADFC0cb6819BC49939b021E45b0d43306575e5d3`. All transactions below were reviewed and approved in the owner's MetaMask. No private keys or automated signatures were used.

## Verified real chain transactions

| Purpose | Chain | Hash | Verified result |
|---|---|---|---|
| Official Reactive faucet | Sepolia | [0x21b0c2be…](https://sepolia.etherscan.io/tx/0x21b0c2bed7846146d52c520c34b24c38e30731831b883eac07bb2a2e307589dc) | SUCCESS, 0.1 Sepolia test ETH to official Reactive faucet; Lasna wallet funded 10.5 test lREACT |
| QuestOrigin deployment | Sepolia | [0x006aceea…](https://sepolia.etherscan.io/tx/0x006aceea09fb77aa9ac21ba29370db3a7c3d791b32194a860503d4e2040cc402) | SUCCESS; deployed runtime code 758 bytes at `0xa604534b1c0e9ca8a855569042a0582576b2e7bc` |
| QuestDestination deployment | Sepolia | [0xf760585e…](https://sepolia.etherscan.io/tx/0xf760585e09d7e88c6b4553576b2193a331531a2bb8d0eda6c7d5ed91b9962d8c) | SUCCESS; deployed runtime code 1601 bytes at `0x284e6d26c14c73a2fbb8e86e79b9673365984af5` |
| QuestGuardianReactive deployment | Lasna | [0x3bee8db5…](https://lasna.reactscan.net/tx/0x3bee8db5f1662a97e6d1478b73be15648cdbf746e3686fdc41f7e701d46856b6) | SUCCESS; runtime code 2698 bytes at `0xe73b699694d46b51467a6d6a5c1c57b2319f4c87`, block 8983180 |
| One-time destination Guardian authorization | Sepolia | [0x9a65fb51…](https://sepolia.etherscan.io/tx/0x9a65fb51c29f11eb9b7789b5083724c3167546a0b8a4404f71711cbb5381c70a) | SUCCESS; Destination `authorizedReactive()` independently returns precisely the Lasna Guardian |
| Genuine source checkpoint ID 2 | Sepolia | [0x3d2e944a…](https://sepolia.etherscan.io/tx/0x3d2e944ab17c530e1c2466566be622f47e173e12662827b6d491b256eea1a04a) | SUCCESS, emitted genuine `CheckpointAnnounced(2, wallet, deadline)`, block 12189607 |
| Destination callback fee reserve via official proxy | Sepolia | [0x13232bbd…](https://sepolia.etherscan.io/tx/0x13232bbd84504e7c799010c8e076f8bf9fa5b9405cd46e6fb795164274954737) | SUCCESS; proxy `depositTo(QuestDestination)` credited 0.1 Sepolia test ETH, block 12189636; `debt=0` |

## Verified reactive processing, not yet delivered

Original Lasna source-event reactions were confirmed:
- [Reactive tx for checkpoint 1](https://lasna.reactscan.net/tx/0x7dece269167216c4b74b2257eb118293c303c2f4cba5b7e1cc50fbb21e1f40a9), real Guardian `CallbackRequested` event, Lasna block 8984214
- [Reactive tx for checkpoint 2](https://lasna.reactscan.net/tx/0x5aabcdcf2ad9f7ab9641879d3077eb921ad9f33fdb51debab6b9038829c6a852), real Guardian `CallbackRequested` event, Lasna block 8984214
- Live `QuestGuardianReactive.requestsMade() = 2` and both Lasna receipts have success status
- **Missing as of last read-only check**: SYSTEM `getCallbacks(txHash)` returned an empty array for both reactive transactions; `QuestDestination.checkpointSeen(1)` and `checkpointSeen(2)` returned `false`
- After the second event, the official Sepolia callback proxy initially reported **zero destination reserves**, a plausible billing/delivery blocker. The normal wallet-approved `depositTo` transaction credited **0.1 Sepolia test ETH**; debt remains zero. Delivery after the deposit has NOT YET been verified
- One additional distinct post-funding checkpoint was prepared for normal wallet owner approval, **no transaction hash recorded at time of this report**. Do not invent proof or resend automatically

## Reproducible wallet user interface

The locally restricted address `http://127.0.0.1:4177/` loads `deploy-ui/index.html` and `deploy-ui/app.mjs`. It verifies the pinned build artifacts through SHA-256, checks the expected owner account and testnet chain, requires explicit user interactions for each transaction, and stores public transaction hashes locally to prevent duplicates. The `deploy-ui/server.mjs` server listens to `127.0.0.1` only and serves a fixed file allowlist. No wallet keys or credentials are stored in the repository.

## What still remains before a judged final submission

1. Verify any post-funding `CheckpointAnnounced` receipt and event if the owner signed it; check actual task ID and deadline.
2. Follow that source event through Lasna SYSTEM `trigger`, `CallbackRequested`, `getCallbacks(uint256)`, and an authentic destination-chain proxy callback receipt.
3. Require `QuestDestination.checkpointSeen(taskId) == true` and genuine `CheckpointMirrored` event. Without this, do not claim the event-driven workflow finished.
4. Record a genuine original screen-capture demonstration with these linked receipts and submit the honest build to the existing registered DoraHacks Reactive Omni Buildathon by 5 December 2026. Prize not guaranteed.
5. Check callback reserve billing and gas diagnostics against official documentation: https://dev.reactive.network/economy and https://dev.reactive.network/debugging. No real ETH and no mainnet transactions.

## Cautions

The custom destination contract does not inherit `AbstractCallback`. It authenticates the official proxy and injected sender explicitly, but doesn't expose the usual `pay(uint256)` function. The separate proxy reserve may cover fees; this hasn't yet been proven by an actual successful callback. If validators record a failure, inspect the revert code and use a corrected testnet deployment rather than assert success or repeatedly spend test tokens. These contracts are demonstrations, not audited production components.

Last updated 22 Nov 2026; independently verified via Ethereum Sepolia and Reactive Lasna public RPCs.
