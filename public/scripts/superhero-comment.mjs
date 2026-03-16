#!/usr/bin/env node
// Comment on a superhero.com post via the Superhero REST API (off-chain)
// Comments on superhero.com are stored off-chain through their API, not on the blockchain

const API_BASE = 'https://api.superhero.com';

async function main() {
  const command = process.argv[2] || 'help';

  switch (command) {
    case 'get': {
      // Get comments for a post
      const postId = process.argv[3];
      const limit = parseInt(process.argv[4]) || 20;
      const page = parseInt(process.argv[5]) || 1;
      if (!postId) {
        console.error('Usage: node scripts/superhero-comment.mjs get <post_id> [limit] [page]');
        process.exit(1);
      }
      const url = `${API_BASE}/api/posts/${encodeURIComponent(postId)}/comments?limit=${limit}&page=${page}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`API error: ${res.status} ${res.statusText}`);
        process.exit(1);
      }
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
      break;
    }

    case 'help':
    default:
      console.log(`
Superhero.com Comment Commands:

  get <post_id> [limit] [page]   Get comments on a post

Examples:
  node scripts/superhero-comment.mjs get 123
  node scripts/superhero-comment.mjs get 123 50 2

Note: Reading comments is done via the Superhero REST API.
      Creating comments requires authentication with the Superhero API
      which uses wallet-signed challenge auth. Posts themselves are on-chain
      but comments are stored off-chain.
`);
  }
}

main().catch(e => { console.error('ERROR:', e.message || e); process.exit(1); });
