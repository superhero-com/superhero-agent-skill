#!/usr/bin/env node
// Wallet management for superhero.com / æternity blockchain
// Generate new wallet, check balance, export address
import { AeSdk, Node, MemoryAccount, Encoding, encode } from '@aeternity/aepp-sdk';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

const WALLET_PATH = './.secrets/aesh-wallet.json';
const NODE_URL = 'https://mainnet.aeternity.io';

function walletExists() {
  return fs.existsSync(WALLET_PATH);
}

function loadWallet() {
  if (!walletExists()) {
    console.error('No wallet found. Run: node scripts/superhero-wallet.mjs generate');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'));
}

function generateWallet() {
  if (walletExists()) {
    console.error('Wallet already exists at', WALLET_PATH);
    console.error('Delete it first if you want to regenerate.');
    process.exit(1);
  }
  const secretKey = encode(randomBytes(32), Encoding.AccountSecretKey);
  const account = new MemoryAccount(secretKey);
  const walletData = {
    address: account.address,
    secretKey: secretKey,
  };
  const dir = path.dirname(WALLET_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(WALLET_PATH, JSON.stringify(walletData, null, 2));
  console.log(JSON.stringify({ success: true, address: account.address }));
}

async function getBalance() {
  const wallet = loadWallet();
  const node = new Node(NODE_URL);
  const sdk = new AeSdk({
    nodes: [{ name: 'mainnet', instance: node }],
  });
  try {
    const balanceAettos = await sdk.getBalance(wallet.address);
    const balanceAE = parseInt(balanceAettos) / 1e18;
    console.log(JSON.stringify({
      address: wallet.address,
      balance_ae: balanceAE,
      balance_aettos: balanceAettos,
    }));
  } catch (e) {
    console.log(JSON.stringify({ address: wallet.address, balance_ae: 0, balance_aettos: '0' }));
  }
}

function showAddress() {
  const wallet = loadWallet();
  console.log(JSON.stringify({ address: wallet.address }));
}

function importWallet(secretKey) {
  if (walletExists()) {
    console.error('Wallet already exists at', WALLET_PATH);
    process.exit(1);
  }
  if (!secretKey) {
    console.error('Usage: node scripts/superhero-wallet.mjs import <secretKey>');
    process.exit(1);
  }
  const account = new MemoryAccount(secretKey);
  const walletData = {
    address: account.address,
    secretKey: secretKey,
  };
  const dir = path.dirname(WALLET_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(WALLET_PATH, JSON.stringify(walletData, null, 2));
  console.log(JSON.stringify({ success: true, address: account.address }));
}

async function main() {
  const command = process.argv[2] || 'help';
  const arg = process.argv[3];

  switch (command) {
    case 'generate':
      generateWallet();
      break;
    case 'balance':
      await getBalance();
      break;
    case 'address':
      showAddress();
      break;
    case 'import':
      importWallet(arg);
      break;
    case 'exists':
      console.log(JSON.stringify({ exists: walletExists() }));
      break;
    case 'help':
    default:
      console.log(`
Wallet Commands:
  generate              Create a new wallet keypair
  import <secretKey>    Import existing wallet by secret key
  balance               Check wallet AE balance
  address               Show wallet address
  exists                Check if wallet file exists
`);
  }
}

main().catch(e => { console.error('ERROR:', e.message || e); process.exit(1); });
