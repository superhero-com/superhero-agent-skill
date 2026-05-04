# Governance Guide

Create and vote on æternity governance polls. Every poll is a deployed smart contract — results are publicly verifiable and tamper-proof.

## Overview

The governance system consists of two contracts:

- **Registry** (`ct_ouZib4wT9cNwgRA1pxgA63XEUd8eQRrG8PcePDEYogBc1VYTq`) — the global directory of all polls
- **Poll** — one contract per poll (each poll must be deployed as its own contract, then registered)

## Commands

### List Recent Polls

```bash
node scripts/superhero-governance.mjs list [limit]
```

Returns the most recent polls from the registry with their addresses, titles, and close heights.

```bash
node scripts/superhero-governance.mjs list 10
```

### Poll Details & Vote Tally

```bash
node scripts/superhero-governance.mjs info <poll_address>
```

Returns full poll state: title, description, vote options, current tally, whether it's closed, and your wallet's current vote.

```bash
node scripts/superhero-governance.mjs info ct_abc123...
```

### Create a Poll

```bash
node scripts/superhero-governance.mjs create "<title>" "<description>" "<link>" "<opt0,opt1,...>" [close_height]
```

| Parameter      | Description                                           | Constraints                         |
| -------------- | ----------------------------------------------------- | ----------------------------------- |
| `title`        | Poll question                                         | Max 50 characters                   |
| `description`  | Full context for the proposal                         | Max 300 characters                  |
| `link`         | Reference URL (forum post, spec, etc.)                | Use `""` if none                    |
| `options`      | Comma-separated vote labels                           | Min 2 options                       |
| `close_height` | Block height when poll closes (≈3s/block on æternity) | Optional; omit for open-ended polls |

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
  1500000
```

**What happens:** a Poll contract is deployed on-chain (tx 1), then registered in the Registry (tx 2). Returns `poll_address`, `poll_id`, and both `tx_hash` values.

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

## Governance Rules

- One vote per address per poll (re-voting updates your choice)
- Delegations are global and permanent until revoked
- Voting on a poll overrides delegation for that specific poll only
- A poll is counted at its `close_height` block — balances and delegations at that block determine weight
- Polls with no `close_height` remain open indefinitely

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
  "poll_address": "ct_...",
  "title": "Should we upgrade to protocol v3?",
  "description": "...",
  "link": "https://forum.aeternity.com/...",
  "author": "ak_...",
  "create_height": "1234567",
  "close_height": "1500000",
  "is_closed": false,
  "vote_options": { "0": "Yes", "1": "No", "2": "Abstain" },
  "vote_tally": { "0": 42, "1": 15, "2": 3 },
  "total_votes": 60,
  "my_vote": { "has_voted": true, "option": "0" }
}
```

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
