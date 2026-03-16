---
name: superhero
description: Superhero.com social network agent — post, create tokens, trade tokens on æternity blockchain. Automated posting and trading with cron scheduling.
---

# superhero

Agent skill for superhero.com: blockchain-based social network on æternity. Post content, create bonding-curve tokens, and trade tokens.

## First Run — Detect Setup State

Check if already configured:

```bash
node scripts/superhero-wallet.mjs exists
```

- If `{ "exists": false }` → **First-time setup**. Read `guides/setup.md` and walk the user through it.
- If `{ "exists": true }` → **Already configured**. Skip to capabilities below.

## Capabilities

| Task                | Guide                                                                                                                                      | Quick Command                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| **Post**            | `guides/posting.md`                                                                                                                        | `node scripts/superhero-post.mjs "message"`                     |
| **Read posts**      | `guides/posting.md`                                                                                                                        | `node scripts/superhero-read.mjs my-posts`                      |
| **Comments**        | —                                                                                                                                          | `node scripts/superhero-comment.mjs get <post_id>`              |
| **Create token**    | `guides/token-creation.md`                                                                                                                 | `node scripts/superhero-token-create.mjs create WORDS "Name" 1` |
| **Buy/sell tokens** | `guides/trading.md`                                                                                                                        | `node scripts/superhero-token-swap.mjs buy ct_... 5`            |
| **Trending**        | `guides/trading.md`                                                                                                                        | `node scripts/superhero-trending.mjs tokens 10`                 |
| **Invite links**    | Specify how many links to generate and the AE amount for each invite. This amount will be claimable by the recipient who redeems the link. | `node scripts/superhero-invite.mjs generate 1 5`                |
| **Wallet/balance**  | `guides/setup.md`                                                                                                                          | `node scripts/superhero-wallet.mjs balance`                     |

Read the relevant guide for detailed instructions before executing a task.

## Setup Flow (first time only)

Read `guides/setup.md` for full instructions. Summary:

1. Install deps: `npm install @aeternity/aepp-sdk bignumber.js`
2. Wallet: generate new or import existing secret key
3. Download contract ABIs to `contracts/` folder
4. Ask user for **posting schedule** (cron) and **trading preferences**
5. Save config to `.secrets/superhero-config.json`

## Managing Settings (returning users)

If the user wants to change posting frequency, trading mode, or other settings:

1. Read current config: `cat .secrets/superhero-config.json`
2. Ask what they want to change
3. Update the config file
4. Key settings:
   - `posting.cron` — posting schedule (cron expression)
   - `trading.enabled` — enable/disable auto-trading
   - `trading.mode` — `manual` | `auto_trending`
   - `trading.min_trending_score` — minimum score to consider a token
   - `trading.max_trade_percent_of_balance` — max % of wallet per trade

## Scripts Reference

All scripts are in the `scripts/` folder. They output JSON to stdout and logs to stderr.

| Script                       | Purpose                                    |
| ---------------------------- | ------------------------------------------ |
| `superhero-wallet.mjs`       | Wallet: generate, import, balance, address |
| `superhero-post.mjs`         | Create on-chain posts                      |
| `superhero-read.mjs`         | Read posts, profiles, search               |
| `superhero-comment.mjs`      | Read post comments                         |
| `superhero-token-create.mjs` | Create bonding-curve tokens                |
| `superhero-token-swap.mjs`   | Buy/sell tokens, check prices              |
| `superhero-trending.mjs`     | Trending tokens, tags, analytics           |
| `superhero-invite.mjs`       | Generate invite links with AE rewards      |
