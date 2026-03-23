#!/usr/bin/env node
// Create a token on superhero.com via the CommunityFactory contract
// This creates a new bonding-curve token (BCTSL token)
import { AeSdk, Node, MemoryAccount, Contract } from '@aeternity/aepp-sdk';
import fs from 'fs';
import BigNumber from 'bignumber.js';

const WALLET_PATH = './.secrets/aesh-wallet.json';
const NODE_URL = 'https://mainnet.aeternity.io';
const FACTORY_ADDRESS = 'ct_25cqTw85wkF5cbcozmHHUCuybnfH9WaRZXSgEcNNXG9LsCJWTN';

function toTokenDecimals(count, denominationDecimals, decimals) {
  return new BigNumber(count.toString())
    .shiftedBy(Number(-denominationDecimals) - Number(-decimals))
    .toFixed();
}

async function main() {
  const command = process.argv[2] || 'help';

  if (command === 'help') {
    console.log(`
Token Creation Commands:

  create <collection> <name> [initial_buy_count]
    Create a new bonding-curve token on superhero.com

    collection         Collection name (e.g. "WORDS")
    name               Token name (must be unique in collection)
    initial_buy_count  How many tokens to buy on creation (default: 1)

Examples:
  node scripts/superhero-token-create.mjs create WORDS "MyToken" 1
  node scripts/superhero-token-create.mjs create WORDS "AI_Agent" 5

  check <collection> <name>
    Check if a token already exists

  info <sale_address>
    Get info about an existing token by its sale address

Note: Requires AE in wallet for gas + initial buy cost.
      Token names must match collection rules (length, characters).
`);
    process.exit(0);
  }

  const walletData = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'));
  const account = new MemoryAccount(walletData.secretKey);
  const node = new Node(NODE_URL);
  const aeSdk = new AeSdk({
    nodes: [{ name: 'mainnet', instance: node }],
    accounts: [account],
  });

  const COMMUNITY_FACTORY_ACI = JSON.parse(
    fs.readFileSync('./contracts/CommunityFactory.aci.json', 'utf8')
  );
  const BONDING_CURVE_ACI = JSON.parse(
    fs.readFileSync('./contracts/BondingCurve.aci.json', 'utf8')
  );

  const factory = await Contract.initialize({
    address: FACTORY_ADDRESS,
    aci: COMMUNITY_FACTORY_ACI,
    onAccount: aeSdk,
    onNode: aeSdk.api,
  });

  switch (command) {
    case 'create': {
      const collectionName = process.argv[3];
      const tokenName = process.argv[4];
      const initialBuyCount = parseInt(process.argv[5]) || 1;

      if (!collectionName || !tokenName) {
        console.error('Usage: node scripts/superhero-token-create.mjs create <collection> <name> [initial_buy_count]');
        process.exit(1);
      }

      // Check if token already exists
      const exists = await factory.has_community(collectionName, tokenName)
        .then(res => res.decodedResult);
      if (exists) {
        console.error(JSON.stringify({ error: 'Token already exists', collection: collectionName, name: tokenName }));
        process.exit(1);
      }

      // Get fee info
      const feePercentage = await factory.fee_percentage().then(res => res.decodedResult);
      const feePrecision = await factory.fee_precision().then(res => res.decodedResult);
      const fee = new BigNumber(feePercentage.toString()).dividedBy(feePrecision.toString()).toNumber();

      // Get bonding curve and calculate initial buy price
      const bondingCurveAddress = await factory.bonding_curve().then(res => res.decodedResult);
      const bondingCurve = await Contract.initialize({
        address: bondingCurveAddress,
        aci: BONDING_CURVE_ACI,
        onAccount: aeSdk,
        onNode: aeSdk.api,
      });

      const decimals = await bondingCurve.supported_decimals().then(res => res.decodedResult);
      const initialBuyTokenDecimals = toTokenDecimals(initialBuyCount, 0n, decimals);

      let initialBuyPriceAetto = '0';
      if (initialBuyTokenDecimals !== '0') {
        const priceAetto = await bondingCurve.calculate_buy_price(0, initialBuyTokenDecimals)
          .then(res => res.decodedResult);
        initialBuyPriceAetto = new BigNumber(priceAetto.toString())
          .multipliedBy(fee)
          .plus(priceAetto.toString())
          .toFixed(0, BigNumber.ROUND_CEIL);
      }

      console.error(`Creating token "${tokenName}" in collection "${collectionName}"...`);
      console.error(`Initial buy: ${initialBuyCount} tokens, cost: ~${new BigNumber(initialBuyPriceAetto).dividedBy(1e18).toFixed(4)} AE`);

      const metaInfoMap = new Map();
      const result = await factory.create_community(
        collectionName,
        tokenName,
        initialBuyTokenDecimals,
        false, // is_private
        metaInfoMap,
        { amount: initialBuyPriceAetto },
      );

      const [daoAddress, tokenSaleAddress, communityManagementAddress] = result.decodedResult;

      console.log(JSON.stringify({
        success: true,
        token_name: tokenName,
        collection: collectionName,
        sale_address: tokenSaleAddress,
        dao_address: daoAddress,
        community_management_address: communityManagementAddress,
        initial_buy_count: initialBuyCount,
        tx_hash: result.hash,
      }));
      break;
    }

    case 'check': {
      const col = process.argv[3];
      const name = process.argv[4];
      if (!col || !name) {
        console.error('Usage: node scripts/superhero-token-create.mjs check <collection> <name>');
        process.exit(1);
      }
      const exists = await factory.has_community(col, name).then(res => res.decodedResult);
      console.log(JSON.stringify({ collection: col, name, exists }));
      break;
    }

    case 'info': {
      const saleAddress = process.argv[3];
      if (!saleAddress) {
        console.error('Usage: node scripts/superhero-token-create.mjs info <sale_address>');
        process.exit(1);
      }
      const url = `https://api.superhero.com/api/tokens/${encodeURIComponent(saleAddress)}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`API error: ${res.status}`);
        process.exit(1);
      }
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
      break;
    }
  }
}

main().catch(e => { console.error('ERROR:', e.message || e); process.exit(1); });
