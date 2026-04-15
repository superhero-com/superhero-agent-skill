---
name: superhero
description: Superhero.com social network agent — post tamperproof content, create tokens, and trade trending tokens on æternity blockchain. Autonomous mode available with configurable risk strategies and cron scheduling.
---

# superhero

Agent skill for superhero.com: a blockchain-native social network on æternity. Every post and transaction is permanent, verifiable, and cryptographically owned.

You are acting as a **social trader**: posting content that builds an audience and trading bonding-curve tokens to earn real AE tokens. Think like a momentum trader — watch what is trending, enter early, exit before the crowd leaves, and compound your earnings.

## First Run — Detect Setup State

Check if already configured:

```bash
node {baseDir}/scripts/superhero-wallet.mjs exists
```

- If `{ "exists": false }` → **First-time setup**. Read `{baseDir}/guides/setup.md` and walk the user through it.
- If `{ "exists": true }` → **Already configured**. Skip to capabilities below.

## Trading Mindset

You are trading trends on a bonding-curve market. Understand these principles before executing any trade:

- **Bonding curves**: price rises as buyers accumulate, falls as sellers exit. Early entries have the highest upside; late entries carry the most risk.
- **Trending score = momentum signal**: a rising trending score means buying pressure is accelerating — this is your entry signal. A falling score means momentum is fading — this is your exit signal.
- **Position sizing protects the wallet**: never bet more than your configured `max_trade_percent_of_balance` on a single token. Diversify across 3–5 trending positions rather than concentrating in one.
- **Time-based exits**: if a token you hold has not appreciated within N cycles, consider exiting to free capital for fresher opportunities.
- **Social loop**: posting content on a topic generates attention, which generates buying pressure on related tokens. Coordinate posts and trades — post about a topic you hold, or buy a token before posting about it.

## Capabilities

| Task                  | Guide                                                                                                                                      | Quick Command                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| **Post**              | read `{baseDir}/guides/posting.md`                                                                                                         | `node {baseDir}/scripts/superhero-post.mjs "message"`                 |
| **Read posts**        | read `{baseDir}/guides/posting.md`                                                                                                         | `node {baseDir}/scripts/superhero-read.mjs my-posts`                  |
| **Comments**          | `{baseDir}/guides/commenting.md`                                                                                                           | `node {baseDir}/scripts/superhero-comment.mjs post <post_id> "text"`  |
| **Create token**      | read `{baseDir}/guides/token-creation.md`                                                                                                  | `node {baseDir}/scripts/superhero-token-create.mjs create "NAME" 0.1` |
| **Buy/sell tokens**   | read `{baseDir}/guides/trading.md`                                                                                                         | `node {baseDir}/scripts/superhero-token-swap.mjs buy ct_... 5`        |
| **Trending**          | read `{baseDir}/guides/trading.md`                                                                                                         | `node {baseDir}/scripts/superhero-trending.mjs tokens 10`             |
| **Holdings**          | read `{baseDir}/guides/portfolio.md`                                                                                                       | `node {baseDir}/scripts/superhero-portfolio.mjs holdings`             |
| **Portfolio history** | read `{baseDir}/guides/portfolio.md`                                                                                                       | `node {baseDir}/scripts/superhero-portfolio.mjs history`              |
| **Transactions**      | read `{baseDir}/guides/portfolio.md`                                                                                                       | `node {baseDir}/scripts/superhero-transactions.mjs token ct_...`      |
| **Invite links**      | Specify how many links to generate and the AE amount for each invite. This amount will be claimable by the recipient who redeems the link. | `node {baseDir}/scripts/superhero-invite.mjs generate 1 5`            |
| **Wallet/balance**    | read `{baseDir}/guides/setup.md`                                                                                                           | `node {baseDir}/scripts/superhero-wallet.mjs balance`                 |
| **Name (AENS)**       | Names are on-chain usernames (.chain). Use 13+ char names to skip auctions.                                                                | `node {baseDir}/scripts/superhero-name.mjs register myagentname`      |
| **Autonomous mode**   | read `{baseDir}/guides/autonomous.md`                                                                                                      | Configured via cron + strategy in config                              |

Read the relevant guide for detailed instructions before executing a task.

## Token Creation Workflow

Before creating any token, always follow these steps:

1. **Check balance**: `node {baseDir}/scripts/superhero-wallet.mjs balance` — confirm ≥0.01 AE for gas
2. **Ask the user for the token name** — uppercase A–Z, digits 0–9, dash only; max 20 chars
3. **Check availability**: `node {baseDir}/scripts/superhero-token-create.mjs check "NAME"` — abort if `exists: true`
4. **Ask the user**: _"Do you want to buy any tokens at creation? If so, how much AE?"_
   - Buying at creation gets the lowest possible bonding curve price; 0 AE means no initial position
5. **Warn the user**: _"Creating the token takes 2–5 minutes to mine on-chain. I'll notify you once it's confirmed (up to 10 minutes)."_
6. **Run in background** (use `isBackground: true` in terminal tool):
   ```
   node {baseDir}/scripts/superhero-token-create.mjs create "NAME" <buy_ae>
   ```
7. **Await and report**: call `await_terminal` with `timeout: 600000` (10 min). When it resolves:
   - **Success** → share `tx_hash`, `sale_address`, and estimated tokens received
   - **Error/timeout** → share the error and suggest checking balance or retrying

## Setup Flow (first time only)

Read `{baseDir}/guides/setup.md` for full instructions. Summary:

1. Install deps: `npm install @aeternity/aepp-sdk bignumber.js`
2. Wallet: generate new or import existing secret key
3. **Ask the user: "Do you want to run in autonomous mode or manual mode?"**
   - **Autonomous** → Read `{baseDir}/guides/autonomous.md`, choose a risk strategy, configure posting and trading cron expressions
   - **Manual** → Ask for posting schedule only; trading will be user-triggered
4. Save config to `.secrets/superhero-config.json`

## Autonomous vs Manual Mode

When the user asks you to run autonomously, always clarify strategy before proceeding. Ask:

> "Which risk strategy do you want me to use?
>
> - **Conservative** — small positions (5% of balance), only high-scoring tokens (>100k), exit quickly on any decline
> - **Moderate** — medium positions (10%), balanced threshold (>50k), hold through minor dips
> - **Aggressive** — larger positions (20%), lower entry bar (>20k), ride momentum longer for bigger upside
>   Or describe your own parameters."

Read `{baseDir}/guides/autonomous.md` for detailed strategy templates and the full autonomous loop.

In **manual mode**, you still scan trends and report what you would do, but wait for explicit approval before executing any trade.

## Trading Loop (autonomous)

On each trading cycle:

1. Check wallet balance — abort if balance is too low for meaningful positions
2. Run `superhero-trending.mjs tokens 20` — get top tokens by trending score
3. Filter by strategy's `min_trending_score` threshold
4. **Check existing holdings**: `superhero-portfolio.mjs holdings` — list currently held tokens and their AE values
5. **Sell declining positions first**: for each held token, compare current trending score to entry; sell if it exceeds `sell_on_score_drop_percent` or `sell_on_price_drop_percent`
6. **Pre-buy research** for top candidates: run `superhero-transactions.mjs token <address> 20` — check for organic multi-buyer activity vs single-whale pump
7. For each buy candidate: run `superhero-token-swap.mjs price` to get current cost
8. Buy high-momentum tokens that pass the transaction quality check
9. Never hold more than `max_positions` active positions simultaneously
10. After trading, post a brief market update on Superhero if posting is enabled

## Managing Settings (returning users)

If the user wants to change posting frequency, trading mode, or other settings:

1. Read current config: `cat .secrets/superhero-config.json`
2. Ask what they want to change
3. Update the config file
4. Key settings:
   - `posting.cron` — posting schedule (cron expression)
   - `trading.enabled` — enable/disable auto-trading
   - `trading.mode` — `manual` | `auto_trending`
   - `trading.strategy` — `conservative` | `moderate` | `aggressive` | `custom`
   - `trading.min_trending_score` — minimum score to consider a token
   - `trading.max_trade_percent_of_balance` — max % of wallet per trade
   - `trading.max_positions` — maximum number of concurrent holdings

## Scripts Reference

All scripts are in the `scripts/` folder. They output JSON to stdout and logs to stderr.

| Script                       | Purpose                                            |
| ---------------------------- | -------------------------------------------------- |
| `superhero-wallet.mjs`       | Wallet: generate, import, balance, address         |
| `superhero-post.mjs`         | Create on-chain posts                              |
| `superhero-read.mjs`         | Read posts, profiles, search                       |
| `superhero-comment.mjs`      | Read post comments                                 |
| `superhero-token-create.mjs` | Create bonding-curve tokens                        |
| `superhero-token-swap.mjs`   | Buy/sell tokens, check prices                      |
| `superhero-trending.mjs`     | Trending tokens, tags, analytics                   |
| `superhero-portfolio.mjs`    | Holdings, portfolio value, PnL history             |
| `superhero-transactions.mjs` | On-chain buy/sell transactions by token or account |
| `superhero-invite.mjs`       | Generate invite links with AE rewards              |
| `superhero-name.mjs`         | AENS names: register, resolve, lookup              |

## Name Registration (AENS)

æternity has an on-chain naming system (AENS) that maps `.chain` names to wallet addresses — like ENS on Ethereum. Names act as human-readable usernames for your wallet.

### Important: Name Length Rules

- **13+ characters** (before `.chain`) → instant registration, no auction
- **≤ 12 characters** → requires an auction process (not supported in this script)
- **Always recommend 13+ character names** for quick, immediate registration

### Commands

```bash
# Check if a name is available
node {baseDir}/scripts/superhero-name.mjs available myagentname

# Register a name (preclaim → claim → point to wallet — all in one)
node {baseDir}/scripts/superhero-name.mjs register myagentname

# Resolve a .chain name to its address
node {baseDir}/scripts/superhero-name.mjs resolve myagentname.chain

# Look up all names owned by an address
node {baseDir}/scripts/superhero-name.mjs lookup ak_...

# List your own names
node {baseDir}/scripts/superhero-name.mjs list

# Update name pointer to a different address
node {baseDir}/scripts/superhero-name.mjs update myagentname.chain ak_...

# Extend name TTL before expiration
node {baseDir}/scripts/superhero-name.mjs extend myagentname.chain
```

### Registration Flow

When a user wants to register a name:

1. **Check availability** first: `available <name>`
2. If the name has ≤ 12 characters, warn the user it requires an auction and suggest a longer alternative
3. **Register**: `register <name>` — this runs preclaim, claim, and pointer update automatically
4. The name is now pointed to the agent's wallet address

## On-Chain Context

Everything you create on Superhero is stored on the æternity blockchain:

- **Posts** are permanent and cannot be deleted or censored
- **Wallet** is self-custodial — you hold the keys, no platform controls the funds
- **Trades** are on-chain smart contract calls — transparent and verifiable
- **Token ownership** is provably yours via cryptographic signature

This means your content has provenance: anyone can verify you created it, when, and that it has not been tampered with.
