#!/usr/bin/env node
// scripts/superhero-read.mjs
// Read posts, profile data from superhero.com via æternity middleware
import fs from 'fs';

const CONTRACT_ADDRESS = 'ct_2Hyt9ZxzXra5NAzhePkRsDPDWppoatVD7CtHnUoHVbuehwR8Nb';
const WALLET_PATH = './.secrets/aesh-wallet.json';
const MIDDLEWARE_URL = 'https://mainnet.aeternity.io/mdw/v3';

function getWalletAddress() {
  const walletData = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'));
  return walletData.address;
}

async function getPostsFromAddress(address, limit = 20) {
  const url = `${MIDDLEWARE_URL}/accounts/${address}/activities?limit=${limit * 2}`; // Fetch more to account for filtering
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.data || !Array.isArray(data.data)) {
    console.error('Unexpected API response:', data);
    return [];
  }
  
  const posts = data.data
    .filter(activity => 
      activity.type === 'ContractCallTxEvent' &&
      activity.payload?.tx?.contract_id === CONTRACT_ADDRESS &&
      activity.payload?.tx?.function === 'post_without_tip'
    )
    .map(activity => {
      const tx = activity.payload.tx;
      const content = tx.arguments[0]?.value || '';
      const links = tx.arguments[1]?.value?.map(v => v.value) || [];
      
      return {
        txHash: activity.payload.hash,
        postId: tx.return?.value || null,
        content,
        links,
        timestamp: new Date(activity.payload.micro_time).toISOString(),
        height: activity.height
      };
    })
    .slice(0, limit); // Limit after filtering
  
  return posts;
}

async function getMyPosts(limit = 20) {
  const address = getWalletAddress();
  console.log(`Fetching posts from ${address}...`);
  return await getPostsFromAddress(address, limit);
}

async function getProfile(address) {
  console.log(`Fetching profile for ${address}...`);
  const posts = await getPostsFromAddress(address, 50);
  
  return {
    address,
    postCount: posts.length,
    latestPost: posts[0] || null,
    posts: posts.slice(0, 10) // Top 10
  };
}

async function searchPosts(keyword, limit = 50) {
  console.log(`Searching posts with keyword: "${keyword}"...`);
  const address = getWalletAddress();
  const posts = await getPostsFromAddress(address, limit);
  
  const matches = posts.filter(post =>
    post.content.toLowerCase().includes(keyword.toLowerCase())
  );
  
  return {
    keyword,
    found: matches.length,
    posts: matches
  };
}

async function getLatestPosts(limit = 10) {
  console.log(`Fetching latest ${limit} posts...`);
  const address = getWalletAddress();
  const posts = await getPostsFromAddress(address, limit);
  return posts;
}

async function main() {
  const command = process.argv[2] || 'help';
  const arg = process.argv[3];
  const limit = parseInt(process.argv[4]) || 20;
  
  try {
    switch (command) {
      case 'my-posts':
        const myPosts = await getMyPosts(limit);
        console.log(JSON.stringify(myPosts, null, 2));
        break;
        
      case 'profile':
        if (!arg) {
          console.error('Usage: node superhero-read.mjs profile <address>');
          process.exit(1);
        }
        const prof = await getProfile(arg);
        console.log(JSON.stringify(prof, null, 2));
        break;
        
      case 'latest':
        const latest = await getLatestPosts(limit);
        console.log(JSON.stringify(latest, null, 2));
        break;
        
      case 'search':
        if (!arg) {
          console.error('Usage: node superhero-read.mjs search <keyword>');
          process.exit(1);
        }
        const results = await searchPosts(arg, limit);
        console.log(JSON.stringify(results, null, 2));
        break;
        
      case 'help':
      default:
        console.log(`
Superhero.com Read Commands:

  my-posts [limit]           Get your posts (default: 20)
  profile <address> [limit]  Get posts from specific address
  latest [limit]             Get your latest posts
 search <keyword> [limit]   Search your posts for keyword

Examples:
  node scripts/superhero-read.mjs my-posts
  node scripts/superhero-read.mjs my-posts 50
  node scripts/superhero-read.mjs profile ak_cJRG...
  node scripts/superhero-read.mjs latest 5
  node scripts/superhero-read.mjs search "AI agents"
  
Note: This reads from æternity middleware API.
      Replies/comments are stored off-chain on Superhero.com
`);
    }
  } catch (e) {
    console.error('Error:', e.message);
    if (e.stack) console.error(e.stack);
    process.exit(1);
  }
}

main();