# Governance Guide

Create and vote on æternity governance polls. Every poll is a deployed smart contract; official results are stake-weighted by AE balance and delegation state.

## Overview

The governance system consists of two contracts:

- **Registry** (`ct_ouZib4wT9cNwgRA1pxgA63XEUd8eQRrG8PcePDEYogBc1VYTq`) — the global directory of all polls
- **Poll** — one contract per poll (each poll must be deployed as its own contract, then registered)

## Commands

### List Recent Polls

```bash
node scripts/superhero-governance.mjs list [limit] [--all]
```

Returns the most recent listed polls from the registry with their ids, addresses, titles, and close heights. Use `--all` only when you intentionally need unlisted polls.

```bash
node scripts/superhero-governance.mjs list 10
node scripts/superhero-governance.mjs list 10 --all
```

### Poll Details & Results

```bash
node scripts/superhero-governance.mjs info <poll_address>
node scripts/superhero-governance.mjs info-by-id <poll_id>
```

Returns full poll state, raw address vote counts, official stake-weighted results from the governance backend when available, whether the poll is closed, and your wallet's current vote. Treat `stake_weighted_results` as the governance result; `raw_vote_counts` are only one-address-one-entry counts from the Poll contract.

```bash
node scripts/superhero-governance.mjs info ct_abc123...
node scripts/superhero-governance.mjs info-by-id 42
```

### Create a Poll

```bash
node scripts/superhero-governance.mjs create "<title>" "<description>" "<link>" "<opt0,opt1,...>" [close_height] [--unlisted|--listed false]
```

| Parameter      | Description                                           | Constraints                         |
| -------------- | ----------------------------------------------------- | ----------------------------------- |
| `title`        | Poll question                                         | Max 50 characters                   |
| `description`  | Full context for the proposal                         | Max 300 characters                  |
| `link`         | Reference URL (forum post, spec, etc.)                | Required; must start with `http://` or `https://` |
| `options`      | Comma-separated vote labels                           | Min 2 options                       |
| `close_height` | Block height when poll closes (≈3s/block on æternity) | Must be future; use `0` or omit for open-ended polls |
| `--unlisted` / `--listed false` | Register the poll as unlisted | Optional; listed by default |

**Examples:**

```bash
node scripts/superhero-governance.mjs create \
  "Should we upgrade to protocol v3?" \
  "Proposal to activate the protocol upgrade described at the link." \
  "https://forum.aeternity.com/t/upgrade-v3/123" \
  "Yes,No,Abstain"

node scripts/superhero-governance.mjs create \
  "Which feature should ship next?" \
  "Vote for the next milestone. Discussion at the link." \
  "https://github.com/aeternity/protocol/issues/456" \
  "Multisig wallets,State channels,NFT standard" \
  1500000 \
  --unlisted
```

**What happens:** a backend-verifiable `Poll_Iris.aes` contract is deployed on-chain (tx 1), then registered in the Registry (tx 2). Returns `poll_address`, `poll_id`, `is_listed`, and both `tx_hash` values.

> Allow **2–5 minutes** for both transactions to mine.

### Vote on a Poll

```bash
node scripts/superhero-governance.mjs vote <poll_address> <option_number>
```

Option numbers are 0-based and match the order you provided when creating the poll.

```bash
# Vote for option 0 ("Yes")
node scripts/superhero-governance.mjs vote ct_abc123... 0

# Vote for option 2 ("Abstain")
node scripts/superhero-governance.mjs vote ct_abc123... 2
```

Votes are on-chain and permanent but can be changed or revoked any time before the poll closes.

### Revoke Your Vote

```bash
node scripts/superhero-governance.mjs revoke <poll_address>
```

Removes your vote from the poll. You can vote again afterwards.

### Delegate Voting Power

Delegation is global — it applies to all polls until revoked.

```bash
node scripts/superhero-governance.mjs delegate <ak_address>
```

When you delegate, the delegatee's vote will automatically count for you on any poll where you have not personally voted. Voting on a specific poll always overrides your delegation for that poll.

```bash
node scripts/superhero-governance.mjs delegate ak_xyz456...
```

### Revoke Delegation

```bash
node scripts/superhero-governance.mjs revoke-delegation
```

### Inspect Delegation

```bash
node scripts/superhero-governance.mjs delegatee [ak_address]
node scripts/superhero-governance.mjs delegators [ak_address]
```

`delegatee` shows who an address delegates to. `delegators` shows direct delegators to an address. Both default to your wallet address if no address is provided.

## Governance Rules

- One vote per address per poll (re-voting updates your choice)
- Delegations are global and permanent until revoked
- Voting on a poll overrides delegation for that specific poll only
- A poll is counted at its `close_height` block — balances and delegations at that block determine weight
- Polls with no `close_height` remain open indefinitely
- Raw vote counts are not final governance results; use `stake_weighted_results`

## Output Format

**`list`** — array of poll summaries:

```json
[
  {
    "poll_id": "42",
    "poll_address": "ct_...",
    "title": "Should we upgrade to protocol v3?",
    "is_listed": true,
    "close_height": "1500000"
  }
]
```

**`info`** — full poll state:

```json
{
  "poll_id": "42",
  "poll_address": "ct_...",
  "is_listed": true,
  "title": "Should we upgrade to protocol v3?",
  "description": "...",
  "link": "https://forum.aeternity.com/...",
  "author": "ak_...",
  "create_height": "1234567",
  "close_height": "1500000",
  "is_closed": false,
  "vote_options": { "0": "Yes", "1": "No", "2": "Abstain" },
  "raw_vote_counts": { "0": 42, "1": 15, "2": 3 },
  "total_raw_votes": 60,
  "stake_weighted_results": {
    "total_stake": "123000000000000000000",
    "percent_of_total_supply": "0.1",
    "raw_vote_count": 60,
    "options": [
      {
        "option": "0",
        "option_stake": "100000000000000000000",
        "percentage_of_total_stake": "81.3",
        "raw_vote_count": 42,
        "delegators_count": 7
      }
    ]
  },
  "my_vote": { "has_voted": true, "option": "0" }
}
```

If `stake_weighted_results` is `null`, the official governance backend could not verify or compute the poll. Do not present `raw_vote_counts` as the final result.

## Cost

| Action            | Transactions | Approximate Cost |
| ----------------- | ------------ | ---------------- |
| Create poll       | 2            | ~0.01–0.02 AE    |
| Vote              | 1            | ~0.0001 AE       |
| Revoke vote       | 1            | ~0.0001 AE       |
| Delegate          | 1            | ~0.0001 AE       |
| Revoke delegation | 1            | ~0.0001 AE       |

Check balance before creating polls or voting: `node scripts/superhero-wallet.mjs balance`

## Estimating Block Heights

æternity produces a block roughly every 3 seconds. To compute a close height:

```
close_height = current_block + (days × 24 × 60 × 60 / 3)
```

For a 7-day poll: `current_block + 201600`

Get the current block height from the `create_height` field of any recent `info` result.
