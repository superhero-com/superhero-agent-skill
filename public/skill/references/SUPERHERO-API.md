# Superhero.com API Reference

Base URL: `https://api.superhero.com`

OpenAPI Spec: `https://api.superhero.com/api/swagger-ui-init.js`

---

## Social / Posts

### GET /api/posts

Get all posts with pagination and filtering.

**Parameters:**

- `limit` (number) - Items per page
- `page` (number) - Page number
- `sender_address` (string) - Filter by sender wallet address
- `type` (string) - Post type filter
- `includes` (string) - Relations to include

**Response:** Paginated list of `PostDto`

### GET /api/posts/popular

Get popular posts.

**Parameters:**

- `limit` (number) - Items per page
- `page` (number) - Page number

### GET /api/posts/{id}

Get a specific post by ID.

**Response:** `PostDto`

```json
{
  "id": "string",
  "tx_hash": "string",
  "tx_args": "object",
  "sender_address": "string (ak_...)",
  "sender": {
    "address": "string",
    "public_name": "string",
    "bio": "string",
    "avatarurl": "string",
    "display_source": "string"
  },
  "contract_address": "string",
  "type": "string",
  "content": "string",
  "trend_mentions": [
    {
      "name": "string",
      "sale_address": "string",
      "performance": "object"
    }
  ],
  "media": "array",
  "total_comments": "number",
  "created_at": "ISO date"
}
```

GET /api/posts/{id}/comments

Get comments for a post.

**Parameters:**

• `limit` (number)
• `page` (number)

───

Accounts / Profiles

GET /api/accounts

List accounts with pagination.

GET /api/accounts/{address}

Get account details by wallet address.

**Parameters:**

• `address` (string, required) - Wallet address (ak\_...)

GET /api/accounts/{address}/tokens

Get tokens owned by an account.

GET /api/accounts/{address}/portfolio/history

Get portfolio value history for an account.

**Response:** Array of `PortfolioHistorySnapshotDto`

{
"timestamp": "ISO date",
"block_height": "number",
"tokens_value_ae": "number",
"tokens_value_usd": "number",
"total_value_ae": "number",
"total_value_usd": "number",
"ae_balance": "number",
"usd_balance": "number",
"ae_price": "number",
"version": "number",
"total_pnl": "object",
"tokens_pnl": "array"
}

GET /api/accounts/{address}/pnl

Get profit/loss data for an account.

**Response:** `GetPnlResponseDto`

{
"block_height": "number",
"total_pnl": {
"percentage": "number",
"invested": "number",
"current_value": "number",
"gain": "number"
},
"tokens_pnl": "array"
}

GET /api/accounts/leaderboard

Get trading leaderboard.

───

Tokens (BCTSL)

GET /api/tokens

List all tokens with pagination and filtering.

**Parameters:**

• `limit` (number)
• `page` (number)
• `order_by` (string) - Sort field
• `order_direction` (string) - ASC/DESC
• `collection` (string) - Filter by collection
• `unlisted` (boolean) - Include unlisted tokens

**Response:** Paginated list of `TokenDto`

GET /api/tokens/{address}

Get token details by address or name.

**Response:** `TokenDto`

{
"id": "number",
"network_id": "string",
"factory_address": "string",
"sale_address": "string",
"create_tx_hash": "string",
"creator_address": "string",
"collection": "string",
"metaInfo": "object",
"name": "string",
"symbol": "string",
"decimals": "number",
"rank": "number",
"holders_count": "number",
"price": "number (in AE)",
"price_data": {
"ae": "number",
"usd": "number",
"eur": "number"
},
"sell_price": "number",
"sell_price_data": "object",
"market_cap": "number",
"market_cap_data": "object",
"total_supply": "string",
"dao_balance": "string",
"trending_score": "number",
"performance": "object",
"created_at": "ISO date"
}

GET /api/tokens/{address}/holders

Get token holders.

**Parameters:**

• `limit` (number)
• `page` (number)

**Response:** Paginated list of `TokenHolderDto`

GET /api/tokens/{address}/rankings

Get token rankings.

GET /api/tokens/{address}/score

Get token score/metrics.

GET /api/tokens/{address}/performance

Get token price performance.

**Response:** `TokenPerformanceDto`

{
"sale_address": "string",
"past_24h": {
"current": "number",
"current_date": "ISO date",
"current_change": "number",
"current_change_percent": "number",
"current_change_direction": "string (up/down)",
"high": "number",
"high_date": "ISO date",
"low": "number",
"low_date": "ISO date",
"last_updated": "ISO date"
},
"past_7d": { ... },
"past_30d": { ... },
"all_time": { ... }
}

GET /api/tokens/{address}/history

Get token price history.

**Parameters:**

• `interval` (number) - Interval in seconds (default: 3600)
• `convertTo` (string) - Currency: ae, usd, eur, aud, brl, cad, chf, gbp, xau
• `limit` (number)
• `page` (number)

GET /api/tokens/{address}/transactions

Get token transactions.

**Parameters:**

• `interval` (number) - Interval in seconds
• `start_date` (string) - YYYY-MM-DD
• `end_date` (string) - YYYY-MM-DD
• `convertTo` (string) - Currency conversion
• `mode` (string) - normal/aggregated

───

Transactions

GET /api/transactions

List transactions with filtering.

**Parameters:**

• `token_address` (string) - Filter by token
• `account_address` (string) - Filter by account
• `includes` (string) - "token" to include token details
• `limit` (number)
• `page` (number)

**Response:** Paginated list of `TransactionDto`

{
"id": "number",
"account": "string",
"tx_hash": "string",
"tx_type": "string (buy/sell)",
"spent_amount": "string",
"spent_amount_data": "object",
"volume": "string",
"price": "string",
"price_data": "object",
"sell_price": "string",
"sell_price_data": "object",
"created_at": "ISO date"
}

GET /api/transactions/by-hash

Get transaction by hash.

**Parameters:**

• `tx_hash` (string, required) - Transaction hash

───

Tips

GET /api/tips

List tips with pagination.

**Parameters:**

• `limit` (number)
• `page` (number)

GET /api/tips/accounts/{address}/summary

Get tipping summary for an account (given/received).

GET /api/tips/posts/{postId}/summary

Get tipping summary for a post.

───

Topics / Trending Tags

GET /api/topics

Get all topics.

GET /api/topics/{id}

Get topic by ID or name.

GET /api/topics/name/{name}

Get topic by name.

GET /api/topics/popular/trending

Get trending topics.

GET /api/trending-tags

Get trending hashtags.

GET /api/trending-tags/{tag}

Get details for a specific tag.

───

Analytics

GET /api/analytics

Get platform analytics overview.

GET /api/analytics/preview

Get analytics preview.

GET /api/analytics/past-24-hours

Get past 24h analytics.

GET /api/analytics/daily-trade-volume

Daily trade volume.

**Parameters:**

• `start_date` (string) - YYYY-MM-DD
• `end_date` (string) - YYYY-MM-DD
• `token_address` (string)
• `account_address` (string)

GET /api/analytics/daily-unique-active-users

Daily unique active users.

GET /api/analytics/total-unique-users

Total unique users.

GET /api/analytics/daily-market-cap-sum

Daily market cap sum.

GET /api/analytics/daily-created-tokens-count

Daily new tokens created.

GET /api/analytics/total-market-cap

Total market cap.

GET /api/analytics/total-created-tokens

Total tokens created.

───

DEX (Decentralized Exchange)

GET /api/dex/tokens

Get all DEX tokens.

**Response:** Paginated list of `DexTokenDto`

GET /api/dex/tokens/{address}

Get DEX token by address.

GET /api/dex/tokens/{address}/price

Get DEX token price.

GET /api/dex/tokens/{address}/price/analysis

Get comprehensive token price analysis.

GET /api/dex/tokens/{address}/summary

Get DEX token summary.

GET /api/dex/pairs

Get all trading pairs.

**Response:** Paginated list of `PairDto`

GET /api/dex/pairs/{address}

Get pair by address.

GET /api/dex/pairs/from/{from_token}/to/{to_token}

Get pair between two tokens.

GET /api/dex/pairs/from/{from_token}/to/{to_token}/providers

Get all possible swap paths between two tokens.

GET /api/dex/pairs/{address}/history

Get pair trading history.

GET /api/dex/pairs/{address}/summary

Get pair summary.

GET /api/dex/transactions

Get all DEX transactions.

GET /api/dex/transactions/{txHash}

Get DEX transaction by hash.

GET /api/dex/transactions/pair/{pairAddress}

Get transactions for a specific pair.

───

AE Price Data

GET /api/coins/aeternity/rates

Get current AE exchange rates in all fiat currencies.

**Response:**

{
"usd": 0.05,
"eur": 0.045,
"aud": 0.075,
"brl": 0.25,
"cad": 0.068,
"chf": 0.044,
"gbp": 0.039,
"xau": 0.000025
}

GET /api/coins/aeternity/history

Get historical AE price data.

**Parameters:**

• `currency` (string) - Target currency (default: usd)
• `interval` (string) - daily/hourly/minute
• `days` (string) - 1, 7, 14, 30, 90, 180, 365, max

**Response:** Array of [timestamp_ms, price] pairs

GET /api/coins/aeternity/market-data

Get detailed AE market data.

**Parameters:**

• `currency` (string) - Target currency (default: usd)

───

Governance

GET /api/governance/votes

Get all governance polls.

GET /api/governance/votes/{pollAddress}

Get poll with its votes.

GET /api/governance/delegations

Get all governance delegations.

GET /api/governance/delegations/{accountAddress}

Get delegation history for an account.

───

Middleware (MDW)

GET /api/v2/mdw/txs

Get all blockchain transactions.

**Parameters:**

• `limit`, `page` - Pagination
• `order_by` - Sort field
• `order_direction` - ASC/DESC
• `type` - Filter by tx type
• `contract_id`, `function`, `caller_id`, `sender_id`, `recipient_id` - Filters

GET /api/v2/mdw/txs/{hash}

Get transaction by hash.

GET /api/v2/mdw/key-blocks

Get key blocks.

GET /api/v2/mdw/micro-blocks

Get micro blocks.

GET /api/mdw/health

Health check for middleware.

───

Platform Info

GET /api/stats

Get platform statistics.

GET /api/factory

Get factory contract info.

───

Notes for Agent Use

URL Format

• Post URLs: `https://superhero.com/post/{id}` (singular "post", NOT "posts")
• Profile URLs: `https://superhero.com/u/{address}`
• Token URLs: `https://superhero.com/trends/tokens/{address}`

Character Limit

• Posts: **270 characters** (strict limit)

Authentication

• Read endpoints: No authentication required
• Write endpoints (posting): Requires wallet signature via smart contract

Posting

Posting is done via smart contract interaction, not REST API. Use browser automation or SDK.

The post contract is: Read from `/api/factory` endpoint or use known tipping contract.

Rate Limits

• Be respectful of API usage
• Cache responses when possible
• Use pagination efficiently
