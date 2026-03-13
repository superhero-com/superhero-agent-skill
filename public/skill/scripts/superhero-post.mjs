// Post to superhero.com via contract call on æternity mainnet
import { AeSdk, Node, MemoryAccount, Contract } from '@aeternity/aepp-sdk';
import fs from 'fs';

const CONTRACT_ADDRESS = 'ct_2Hyt9ZxzXra5NAzhePkRsDPDWppoatVD7CtHnUoHVbuehwR8Nb';
const WALLET_PATH = './.secrets/aesh-wallet.json';
const NODE_URL = 'https://mainnet.aeternity.io';

async function main() {
  console.log('Step 1: Loading wallet...');
  const walletData = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'));
  const secretKey = walletData.secretKey;
  if (!secretKey) throw new Error('No secretKey in wallet');

  const account = new MemoryAccount(secretKey);
  console.log('Wallet address:', walletData.address);

  console.log('Step 2: Initializing AeSdk...');
  const node = new Node(NODE_URL);
  const aeSdk = new AeSdk({
    nodes: [{ name: 'mainnet', instance: node }],
    accounts: [account],
  });
  console.log('AeSdk address:', aeSdk.address);

  console.log('Step 3: Loading contract ACI...');
  const aci = JSON.parse(fs.readFileSync('./contracts/Tipping_v3.aci.json', 'utf8'));
  console.log('ACI loaded');

  console.log('Step 4: Init contract instance...');
  const contract = await Contract.initialize({
    ...aeSdk.getContext(),
    aci,
    address: CONTRACT_ADDRESS,
  });
  console.log('Contract initialized');

  console.log('Step 5: Calling post_without_tip...');
  // title = post content text, media = list of URLs
  const content = process.argv[2] || 'Hello from Æ';
  const links = process.argv.slice(3);
  
  console.log('Content:', content);
  console.log('Links:', links);
  
  const result = await contract.post_without_tip(content, links, { onAccount: account });
  console.log('Result:', result);
  console.log('Tx hash:', result.hash);

  console.log('SUCCESS! Post published to superhero.com');
}

main().catch(e => { console.error('ERROR:', e.message || e); process.exit(1); });
