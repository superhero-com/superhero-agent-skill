#!/usr/bin/env node
// Create and vote on æternity governance polls via on-chain Registry + Poll contracts
import { AeSdk, Node, MemoryAccount, Contract } from '@aeternity/aepp-sdk';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = path.join(__dirname, '..', 'contracts');

// Mainnet Registry contract (aeternity governance)
const REGISTRY_ADDRESS = 'ct_ouZib4wT9cNwgRA1pxgA63XEUd8eQRrG8PcePDEYogBc1VYTq';
const NODE_URL = 'https://mainnet.aeternity.io';

// Pre-compiled Poll_Iris contract bytecode (Sophia 8.0.0)
// Each poll is its own contract — the Registry only indexes them, not creates them.
const POLL_BYTECODE = 'cb_+QP5RgOgJ5PgAMYYiGsjrqxFoM61lDMwST9Y+la7KC2mjGWQAFzAuQPLuQLm/gg74mAANwEHNwACAxHw6nidJgAHDAb7A01QT0xMX0FMUkVBRFlfQ0xPU0VELxiKAAcMCvsDVVZPVEVfT1BUSU9OX05PVF9LTk9XTlUALUqQkABeAFUADAEARPwjBgQABgQDEWWl4A/+LZiGGwA3AHcBAoL+PR6JaAA3ADcGNwR3d3eHAjcANwGXQGcHd4cCNwA3AQcHZ0cAB0cADAKCDAKEDAKGDAKIJwwIDAKKDAKMDAKODAKQDAKSJwwMAP5E1kQfADcDNwR3d3eHAjcANwGXQGcHd4cCNwA3AQc3AAwDZCgcAAACAxGqwMKGIQAHDAb7A1FUSVRMRV9TVFJJTkdfVE9fTE9ORwwDb4HsKBwCAAIDEarAwoYhAAcMDPsDaURFU0NSSVBUSU9OX1NUUklOR19UT19MT05HWQKOGg6QLwBVApIoHoIAACgehAIAKB6GBAAoHogGABoGigIaBowEAQM//k2cGB8ANwFHAIcCNwA3AQcaCgCQLxiQAAcMBAEDr4IAAQA/KxgAAET8IwACAgIA/lvZZvEANwBnRwAHAQKQ/mOU6XoANwA3BHd3d4cCNwA3AZdADAKCDAKEDAKGDAKIJwwIAP5lpeAPAjcBhwI3A0cARwAHNwJHAEcANwAIPQACBEY2AAAARjYCAAJGNgQABGQCr1+fAYEHkNMuGeqn29s3+oEOHy2Z1zttuj24ZW78N3tricolWQACBAEDP0Y2AAAARjYCAAJjr1+fAYG3/lSR0tVIoIgx9DHEN4FlPcTOGFNNQbiv/iPdiBl9cAACAQM//onUrTcANwA3AFUALgqQkF4AVQBE/CMGBAIEBAMRZaXgD/6qwMKGAjcBdwc+BAAA/rA+MbAANwFHABcvGJAAAP64QoDAADcBRwAXIBiSAAD+yfafnQA3AIcCNwA3AQcBAoz+7G1B4QA3AAcBAwT+8Op4nQA3ABcaCgCMCD6MAgQBA39GOgIAAFkAIiACALjdLw8RCDviYBF2b3RlES2YhhsVdGl0bGURPR6JaCVnZXRfc3RhdGURRNZEHxFpbml0EU2cGB8xdm90ZWRfb3B0aW9uEVvZZvEVdm90ZXMRY5TpeiFtZXRhZGF0YRFlpeAPLUNoYWluLmV2ZW50EYnUrTctcmV2b2tlX3ZvdGURqsDChjkuU3RyaW5nLmxlbmd0aBGwPjGwJWhhc192b3RlZBG4QoDAJWlzX2F1dGhvchHJ9p+dMWNsb3NlX2hlaWdodBHsbUHhHXZlcnNpb24R8Op4nSVpc19jbG9zZWSCLwCFOC4wLjAA6meEYQ==';

function loadAccount() {
  const privateKey = process.env.AE_PRIVATE_KEY;
  if (!privateKey) {
    console.error('AE_PRIVATE_KEY environment variable is not set. Set it with: export AE_PRIVATE_KEY=<your_secret_key>');
    process.exit(1);
  }
  return new MemoryAccount(privateKey);
}

async function initSdk() {
  const account = loadAccount();
  const node = new Node(NODE_URL);
  const aeSdk = new AeSdk({
    nodes: [{ name: 'mainnet', instance: node }],
    accounts: [account],
  });
  return { aeSdk, account };
}

async function initRegistry(aeSdk) {
  const aci = JSON.parse(fs.readFileSync(path.join(CONTRACTS_DIR, 'RegistryWithEventsACI.json'), 'utf8'));
  return Contract.initialize({ aci, address: REGISTRY_ADDRESS, onAccount: aeSdk, onNode: aeSdk.api });
}

async function initPoll(aeSdk, pollAddress) {
  const aci = JSON.parse(fs.readFileSync(path.join(CONTRACTS_DIR, 'PollACI.json'), 'utf8'));
  return Contract.initialize({ aci, address: pollAddress, onAccount: aeSdk, onNode: aeSdk.api });
}

async function listPolls(limit = 20) {
  const { aeSdk } = await initSdk();
  const registry = await initRegistry(aeSdk);

  console.error('Fetching polls from registry...');
  const result = await registry.polls();
  const polls = result.decodedResult;

  const entries = [];
  for (const [id, data] of polls) {
    entries.push({
      poll_id: id.toString(),
      poll_address: data.poll,
      title: data.title,
      is_listed: data.is_listed,
      close_height: data.close_height !== undefined ? data.close_height.toString() : null,
    });
  }

  // Most recent first, limited
  const sorted = entries.reverse().slice(0, limit);
  console.log(JSON.stringify(sorted, null, 2));
}

async function getPollInfo(pollAddress) {
  const { aeSdk, account } = await initSdk();
  const poll = await initPoll(aeSdk, pollAddress);

  console.error(`Fetching poll info for ${pollAddress}...`);
  const stateResult = await poll.get_state();
  const state = stateResult.decodedResult;

  // Tally votes by option
  const tally = {};
  for (const [, optionIdx] of state.votes) {
    const key = optionIdx.toString();
    tally[key] = (tally[key] || 0) + 1;
  }

  // Format vote options
  const options = {};
  for (const [idx, label] of state.vote_options) {
    options[idx.toString()] = label;
  }

  // Check if current wallet has voted
  const hasVotedResult = await poll.has_voted(account.address);
  const votedOptionResult = await poll.voted_option(account.address);

  const isClosedResult = await poll.is_closed();

  console.log(JSON.stringify({
    poll_address: pollAddress,
    title: state.metadata.title,
    description: state.metadata.description,
    link: state.metadata.link,
    author: state.author,
    create_height: state.create_height.toString(),
    close_height: state.close_height !== undefined ? state.close_height.toString() : null,
    is_closed: isClosedResult.decodedResult,
    vote_options: options,
    vote_tally: tally,
    total_votes: state.votes.size,
    my_vote: hasVotedResult.decodedResult
      ? { has_voted: true, option: votedOptionResult.decodedResult?.toString() ?? null }
      : { has_voted: false, option: null },
  }, null, 2));
}

async function createPoll(title, description, link, optionsStr, closeHeight) {
  if (!title || title.length > 50) {
    console.error(`Title is required and must be ≤50 characters (got ${title?.length ?? 0}).`);
    process.exit(1);
  }
  if (!description || description.length > 300) {
    console.error(`Description is required and must be ≤300 characters (got ${description?.length ?? 0}).`);
    process.exit(1);
  }

  const optionLabels = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
  if (optionLabels.length < 2) {
    console.error('At least 2 vote options are required, comma-separated.');
    process.exit(1);
  }

  const { aeSdk } = await initSdk();
  const pollAci = JSON.parse(fs.readFileSync(path.join(CONTRACTS_DIR, 'PollACI.json'), 'utf8'));

  const metadata = {
    title,
    description,
    link: link || '',
    spec_ref: undefined,
  };

  const voteOptions = new Map(optionLabels.map((label, i) => [i, label]));
  const parsedCloseHeight = closeHeight ? parseInt(closeHeight) : undefined;

  console.error(`Deploying Poll contract for "${title}"...`);

  const pollContract = await Contract.initialize({
    aci: pollAci,
    bytecode: POLL_BYTECODE,
    onAccount: aeSdk,
    onNode: aeSdk.api,
  });

  const deployResult = await pollContract.init(metadata, voteOptions, parsedCloseHeight);
  const pollAddress = pollContract.$options.address || deployResult.result?.contractId;

  if (!pollAddress) {
    console.error('ERROR: Could not determine deployed poll address.', JSON.stringify(deployResult));
    process.exit(1);
  }

  console.error(`Poll deployed at ${pollAddress}. Registering in registry...`);

  const registry = await initRegistry(aeSdk);
  const addResult = await registry.add_poll(pollAddress, true);
  const pollId = addResult.decodedResult;

  console.log(JSON.stringify({
    success: true,
    action: 'create_poll',
    poll_id: pollId?.toString() ?? null,
    poll_address: pollAddress,
    title,
    description,
    link: link || '',
    vote_options: Object.fromEntries(optionLabels.map((label, i) => [i, label])),
    close_height: parsedCloseHeight ?? null,
    deploy_tx_hash: deployResult.hash,
    register_tx_hash: addResult.hash,
  }));
}

async function vote(pollAddress, optionNumber) {
  const { aeSdk } = await initSdk();
  const poll = await initPoll(aeSdk, pollAddress);

  // Verify option exists
  const stateResult = await poll.get_state();
  const state = stateResult.decodedResult;
  const option = parseInt(optionNumber);

  if (!state.vote_options.has(option)) {
    const validOptions = [...state.vote_options.entries()].map(([k, v]) => `${k}: ${v}`).join(', ');
    console.error(`Invalid option ${option}. Valid options: ${validOptions}`);
    process.exit(1);
  }

  const isClosedResult = await poll.is_closed();
  if (isClosedResult.decodedResult) {
    console.error('ERROR: This poll is already closed.');
    process.exit(1);
  }

  const optionLabel = state.vote_options.get(option);
  console.error(`Voting for option ${option} ("${optionLabel}") on poll ${pollAddress}...`);

  const result = await poll.vote(option);

  console.log(JSON.stringify({
    success: true,
    action: 'vote',
    poll_address: pollAddress,
    option,
    option_label: optionLabel,
    tx_hash: result.hash,
  }));
}

async function revokeVote(pollAddress) {
  const { aeSdk, account } = await initSdk();
  const poll = await initPoll(aeSdk, pollAddress);

  const hasVotedResult = await poll.has_voted(account.address);
  if (!hasVotedResult.decodedResult) {
    console.error('You have not voted on this poll.');
    process.exit(1);
  }

  console.error(`Revoking vote on poll ${pollAddress}...`);
  const result = await poll.revoke_vote();

  console.log(JSON.stringify({
    success: true,
    action: 'revoke_vote',
    poll_address: pollAddress,
    tx_hash: result.hash,
  }));
}

async function delegate(delegateeAddress) {
  if (!delegateeAddress || !delegateeAddress.startsWith('ak_')) {
    console.error('Delegatee must be a valid æternity address (ak_...)');
    process.exit(1);
  }

  const { aeSdk } = await initSdk();
  const registry = await initRegistry(aeSdk);

  console.error(`Delegating voting power to ${delegateeAddress}...`);
  const result = await registry.delegate(delegateeAddress);

  console.log(JSON.stringify({
    success: true,
    action: 'delegate',
    delegatee: delegateeAddress,
    tx_hash: result.hash,
  }));
}

async function revokeDelegation() {
  const { aeSdk } = await initSdk();
  const registry = await initRegistry(aeSdk);

  console.error('Revoking delegation...');
  const result = await registry.revoke_delegation();

  console.log(JSON.stringify({
    success: true,
    action: 'revoke_delegation',
    tx_hash: result.hash,
  }));
}

async function main() {
  const command = process.argv[2] || 'help';

  if (command === 'help') {
    console.log(`
Governance Commands:

  list [limit]
    List recent governance polls (default: 20)

  info <poll_address>
    Show poll details, vote options, tally, and your current vote

  create "<title>" "<description>" "<link>" "<opt0,opt1,...>" [close_height]
    Deploy a new Poll contract and register it in the governance registry

    title         Poll title (max 50 chars)
    description   Poll description (max 300 chars)
    link          Reference URL (use "" if none)
    options       Comma-separated vote option labels (min 2)
    close_height  Block height when poll closes (optional; omit for open-ended)

  vote <poll_address> <option_number>
    Vote on a poll by option number (0-based)

  revoke <poll_address>
    Revoke your vote on a poll

  delegate <ak_address>
    Delegate your global voting power to another address

  revoke-delegation
    Revoke your current delegation

Examples:
  node scripts/superhero-governance.mjs list 10
  node scripts/superhero-governance.mjs info ct_abc...
  node scripts/superhero-governance.mjs create "Upgrade protocol?" "Should we upgrade to v3?" "https://forum.aeternity.com/t/123" "Yes,No,Abstain"
  node scripts/superhero-governance.mjs create "Feature vote" "Pick a feature" "" "Option A,Option B" 1500000
  node scripts/superhero-governance.mjs vote ct_abc... 0
  node scripts/superhero-governance.mjs revoke ct_abc...
  node scripts/superhero-governance.mjs delegate ak_xyz...
  node scripts/superhero-governance.mjs revoke-delegation

Note: Creating a poll requires 2 on-chain transactions (deploy + register). Allow up to 5 minutes.
`);
    process.exit(0);
  }

  switch (command) {
    case 'list': {
      const limit = parseInt(process.argv[3]) || 20;
      await listPolls(limit);
      break;
    }
    case 'info': {
      const pollAddress = process.argv[3];
      if (!pollAddress) {
        console.error('Usage: node scripts/superhero-governance.mjs info <poll_address>');
        process.exit(1);
      }
      await getPollInfo(pollAddress);
      break;
    }
    case 'create': {
      const title = process.argv[3];
      const description = process.argv[4];
      const link = process.argv[5];
      const optionsStr = process.argv[6];
      const closeHeight = process.argv[7];
      if (!title || !description || !optionsStr) {
        console.error('Usage: node scripts/superhero-governance.mjs create "<title>" "<description>" "<link>" "<opt0,opt1,...>" [close_height]');
        process.exit(1);
      }
      await createPoll(title, description, link, optionsStr, closeHeight);
      break;
    }
    case 'vote': {
      const pollAddress = process.argv[3];
      const optionNumber = process.argv[4];
      if (!pollAddress || optionNumber === undefined) {
        console.error('Usage: node scripts/superhero-governance.mjs vote <poll_address> <option_number>');
        process.exit(1);
      }
      await vote(pollAddress, optionNumber);
      break;
    }
    case 'revoke': {
      const pollAddress = process.argv[3];
      if (!pollAddress) {
        console.error('Usage: node scripts/superhero-governance.mjs revoke <poll_address>');
        process.exit(1);
      }
      await revokeVote(pollAddress);
      break;
    }
    case 'delegate': {
      const delegateeAddress = process.argv[3];
      if (!delegateeAddress) {
        console.error('Usage: node scripts/superhero-governance.mjs delegate <ak_address>');
        process.exit(1);
      }
      await delegate(delegateeAddress);
      break;
    }
    case 'revoke-delegation': {
      await revokeDelegation();
      break;
    }
    default:
      console.error(`Unknown command: ${command}. Run with 'help' for usage.`);
      process.exit(1);
  }
}

main().catch(e => { console.error('ERROR:', e.message || e); process.exit(1); });
