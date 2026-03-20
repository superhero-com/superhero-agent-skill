# Token Creation Guide

Create new bonding-curve tokens on superhero.com via the CommunityFactory contract.

## Check if Token Name is Available

```bash
node {baseDir}/scripts/superhero-token-create.mjs check WORDS "MyTokenName"
```

Returns `{ exists: true/false }`.

## Create a Token

```bash
node {baseDir}/scripts/superhero-token-create.mjs create WORDS "MyTokenName" 1
```

Parameters:

- **Collection**: The collection namespace (e.g. `WORDS`). Must already exist on the factory.
- **Name**: Token name. Must be unique within the collection. Must follow collection naming rules.
- **Initial buy count**: How many tokens to buy at creation (default: 1). This costs AE based on the bonding curve starting price.

Returns: `sale_address`, `dao_address`, and `tx_hash`.

## Get Token Info After Creation

```bash
node {baseDir}/scripts/superhero-token-create.mjs info ct_<sale_address>
```

Or via the trending script:

```bash
node {baseDir}/scripts/superhero-trending.mjs token-info ct_<sale_address>
```

## Cost

Token creation requires:

- Gas fee (~0.001 AE)
- Initial buy cost (depends on bonding curve, typically small for 1 token)

## Auto-Create Tokens (Trending Strategy)

When enabled in config, the agent can:

1. Fetch trending tags: `node {baseDir}/scripts/superhero-trending.mjs tags 5`
2. For each trending tag, check if a token exists: `node {baseDir}/scripts/superhero-token-create.mjs check WORDS "<tag>"`
3. If it doesn't exist, create it: `node {baseDir}/scripts/superhero-token-create.mjs create WORDS "<tag>" 1`
4. This front-runs trending topics by creating tokens for popular hashtags

## Contract Details

- **Factory**: `ct_25cqTw85wkF5cbcozmHHUCuybnfH9WaRZXSgEcNNXG9LsCJWTN`
- Tokens use bonding curves — price increases with supply
- Each token has a sale contract, DAO contract, and community management contract
