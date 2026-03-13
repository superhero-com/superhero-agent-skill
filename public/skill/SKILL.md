---
name: superhero-skill
description: Post to and read from superhero.com social network via smart contract and æternity middleware API. Create posts, read profiles, search content.
---

# superhero-skill

Interact with superhero.com social network: post content on-chain and read posts via æternity middleware.

## When to Use

- **Writing:** Creating social posts on superhero.com
- **Reading:** Fetching your posts, checking profile data, searching content
- **Tracking:** Monitor engagement, check published content
- The platform is blockchain-based — posts are stored on-chain via contract

## Prerequisites

1. **AE Wallet** — Need wallet with secret key in `.secrets/aesh-wallet.json`
2. **AE Tokens** — Need some AE for gas fees (posting only, reading is free)
3. **Node connection** — Connects to mainnet.aeternity.io

## Contract Details

- **Contract:** `ct_2Hyt9ZxzXra5NAzhePkRsDPDWppoatVD7CtHnUoHVbuehwR8Nb`
- **Function:** `post_without_tip` — Create post without sending a tip
- **Middleware:** `https://mainnet.aeternity.io/mdw/v3` — Read posts and activities

## Usage

### Post (Write)

```bash
# From workspace:
node scripts/superhero-post.mjs "Your message here"

# With links:
node scripts/superhero-post.mjs "Check this out" "https://example.com"
```
