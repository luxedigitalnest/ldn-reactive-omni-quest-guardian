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

## Root cause confirmed by the current official Reactive MCP (same day)

Official public read-only endpoint: https://mcp.rnk.dev/mcp (see https://dev.reactive.network/reactive-mcp). Exact `get_network_info(network=lasna)` response lists **Ethereum Sepolia callback proxy `0xAa14d9Cd0f788Ca23d11805986C1d8bd035D23b4`**, while V1 destination's immutable `callbackProxy` and first reserve deposit targeted the **legacy/other proxy `0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA`**. The registry and community examples disagree with older public source examples: the currently live official registry is the authority for these testnet transactions.

After the 0.1 Sepolia testETH deposit to the earlier proxy, a **new post-funding checkpoint #3** was genuinely owner-approved and mined on Sepolia [tx `0xec48de...`](https://sepolia.etherscan.io/tx/0xec48dedeb434b7e202caa7d8b3ada3298efab3015533c38f4489ee0fb0479870). The Guardian received it and emitted its third `CallbackRequested` in [Lasna tx `0x0830b4...`](https://lasna.reactscan.net/tx/0x0830b40456ed677cd5a60f0615d0f5f93905f9d714c5d42d63fb32c61b9bd921). `requestsMade()=3`, but `checkpointSeen(1,2,3)` all remain **false** at last check. No end-to-end callback success can be claimed.

The official MCP `trace_reactive_tx` confirmed `react()` succeeded and matched origin log index **36**. `decode_callback` reported a small debt (`3148860 wei` at the time queried) at the **current** Sepolia proxy, and estimated that the original requested `300000` callback gas left only approximately `75288` for the target after proxy overhead. Those conditions, plus V1's absence of inherited `AbstractPayer.pay()`, make V1 unsuitable for a trustworthy demo. The old testnet deposit may be stranded; do not send more funds to the old proxy.

**Original corrective V2 source, built but NOT YET deployed:** `src/QuestDestinationV2.sol` inherits the official pinned `AbstractPayer` for proxy-authenticated `pay(uint256)` / `receive()` / `coverDebt()`, with the configurable proxy constructor and original one-time Guardian authorization. `src/QuestGuardianReactiveV2.sol` raises the callback gas limit to `800000` and retains exact event and replay filtering. New ABI/bytecode compiled with pinned solc0.8.29 and pinned official library. Requires a new Sepolia destination and a new Lasna Guardian, both approved only through the owner's testnet wallet, followed by fresh genuine callback receipts. All old contracts and hashes remain as evidence, never as successful callbacks.
