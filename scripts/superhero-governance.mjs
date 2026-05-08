#!/usr/bin/env node
// Create and vote on æternity governance polls via on-chain Registry + Poll contracts
import { AeSdk, Node, MemoryAccount, Contract } from '@aeternity/aepp-sdk';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = path.join(__dirname, '..', 'contracts');

// Defaults mirror the public governance aepp mainnet configuration.
const REGISTRY_ADDRESS = process.env.AE_GOVERNANCE_REGISTRY || 'ct_ouZib4wT9cNwgRA1pxgA63XEUd8eQRrG8PcePDEYogBc1VYTq';
const NODE_URL = process.env.AE_NODE_URL || 'https://mainnet.aeternity.io';
const GOVERNANCE_BACKEND_URL = process.env.AE_GOVERNANCE_BACKEND_URL || 'https://governance-server-mainnet.prd.aepps.com';
const POLL_BYTECODE_PATH = path.join(CONTRACTS_DIR, 'PollBytecode.json');

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

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function optionToString(value) {
  return value === undefined || value === null ? null : value.toString();
}

function strictInteger(value, label) {
  if (!/^\d+$/.test(String(value ?? ''))) {
    fail(`${label} must be a whole number.`);
  }
  return Number(value);
}

function parseAddress(address, label = 'Address') {
  if (!address || !address.startsWith('ak_')) {
    fail(`${label} must be a valid æternity address (ak_...).`);
  }
  return address;
}

function formatVoteOptions(voteOptions) {
  return Object.fromEntries([...voteOptions.entries()].map(([idx, label]) => [idx.toString(), label]));
}

function rawVoteCounts(votes) {
  const tally = {};
  for (const [, optionIdx] of votes) {
    const key = optionIdx.toString();
    tally[key] = (tally[key] || 0) + 1;
  }
  return tally;
}

async function getTopBlockHeight() {
  const res = await fetch(`${NODE_URL}/v3/headers/top`);
  if (!res.ok) {
    throw new Error(`Unable to fetch current block height: ${res.status} ${res.statusText}`);
  }
  const header = await res.json();
  const height = Number(header.height);
  if (!Number.isInteger(height)) {
    throw new Error('Unable to fetch current block height: invalid node response');
  }
  return height;
}

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getOfficialVotesState(pollAddress) {
  const votesState = await fetchJson(`${GOVERNANCE_BACKEND_URL}/votesState/${pollAddress}`);
  if (!votesState) return null;

  return {
    total_stake: votesState.totalStake,
    percent_of_total_supply: votesState.percentOfTotalSupply,
    raw_vote_count: votesState.voteCount,
    options: votesState.stakesForOption.map((option) => ({
      option: option.option,
      option_stake: option.optionStake,
      percentage_of_total_stake: option.percentageOfTotal,
      raw_vote_count: option.votes.length,
      delegators_count: option.votes.reduce((count, voteData) => count + voteData.delegators.length, 0),
    })),
  };
}

function loadPollBytecode() {
  const artifact = readJson(POLL_BYTECODE_PATH);
  if (!artifact.bytecode) fail(`Missing bytecode in ${POLL_BYTECODE_PATH}.`);
  return artifact.bytecode;
}

async function getPollById(registry, pollId) {
  const id = strictInteger(pollId, 'Poll id');
  const result = await registry.poll(id);
  return { id, data: result.decodedResult };
}

function parseListArgs(args) {
  let limit = 20;
  let listedOnly = true;
  for (const arg of args) {
    if (arg === '--all' || arg === '--include-unlisted') {
      listedOnly = false;
    } else if (arg === '--listed-only') {
      listedOnly = true;
    } else {
      limit = strictInteger(arg, 'Limit');
      if (limit < 1) fail('Limit must be greater than 0.');
    }
  }
  return { limit, listedOnly };
}

function parseCreateOptions(args) {
  let closeHeight = undefined;
  let listed = true;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--unlisted') {
      listed = false;
    } else if (arg === '--listed') {
      const value = args[i + 1];
      if (!['true', 'false'].includes(value)) fail('--listed must be followed by true or false.');
      listed = value === 'true';
      i += 1;
    } else if (closeHeight === undefined) {
      closeHeight = arg;
    } else {
      fail(`Unknown create argument: ${arg}`);
    }
  }

  return { closeHeight, listed };
}

function resolveVoteOptionKey(voteOptions, optionNumber) {
  const normalizedOption = strictInteger(optionNumber, 'Option number');
  const optionBigInt = BigInt(normalizedOption);

  for (const key of voteOptions.keys()) {
    if (typeof key === 'bigint') {
      if (key === optionBigInt) return key;
      continue;
    }
    if (Number(key) === normalizedOption) return key;
  }

  return null;
}

async function listPolls({ limit = 20, listedOnly = true } = {}) {
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
      close_height: optionToString(data.close_height),
    });
  }

  const sorted = entries
    .filter((pollEntry) => !listedOnly || pollEntry.is_listed)
    .reverse()
    .slice(0, limit);
  console.log(JSON.stringify(sorted, null, 2));
}

async function getPollInfo(pollAddress, registryData = {}) {
  const { aeSdk, account } = await initSdk();
  const poll = await initPoll(aeSdk, pollAddress);

  console.error(`Fetching poll info for ${pollAddress}...`);
  const stateResult = await poll.get_state();
  const state = stateResult.decodedResult;

  // Check if current wallet has voted
  const hasVotedResult = await poll.has_voted(account.address);
  const votedOptionResult = await poll.voted_option(account.address);

  const isClosedResult = await poll.is_closed();
  const stakeWeightedResults = await getOfficialVotesState(pollAddress);

  console.log(JSON.stringify({
    poll_id: registryData.poll_id ?? null,
    poll_address: pollAddress,
    is_listed: registryData.is_listed ?? null,
    title: state.metadata.title,
    description: state.metadata.description,
    link: state.metadata.link,
    author: state.author,
    create_height: state.create_height.toString(),
    close_height: optionToString(state.close_height),
    is_closed: isClosedResult.decodedResult,
    vote_options: formatVoteOptions(state.vote_options),
    raw_vote_counts: rawVoteCounts(state.votes),
    total_raw_votes: state.votes.size,
    stake_weighted_results: stakeWeightedResults,
    stake_weighted_results_source: stakeWeightedResults ? `${GOVERNANCE_BACKEND_URL}/votesState/${pollAddress}` : null,
    result_note: stakeWeightedResults
      ? 'stake_weighted_results matches the official governance backend; raw_vote_counts are address counts only.'
      : 'Official stake-weighted results were unavailable; raw_vote_counts are address counts only, not final governance weight.',
    my_vote: hasVotedResult.decodedResult
      ? { has_voted: true, option: votedOptionResult.decodedResult?.toString() ?? null }
      : { has_voted: false, option: null },
  }, null, 2));
}

async function getPollInfoById(pollId) {
  const { aeSdk } = await initSdk();
  const registry = await initRegistry(aeSdk);
  const { id, data } = await getPollById(registry, pollId);
  console.error(`Resolved poll id ${id} to ${data.poll}.`);
  await getPollInfo(data.poll, { poll_id: id.toString(), is_listed: data.is_listed });
}

async function createPoll(title, description, link, optionsStr, { closeHeight, listed = true } = {}) {
  const cleanTitle = title?.trim();
  const cleanDescription = description?.trim();
  const cleanLink = link?.trim();

  if (!cleanTitle || cleanTitle.length > 50) {
    console.error(`Title is required and must be ≤50 characters (got ${cleanTitle?.length ?? 0}).`);
    process.exit(1);
  }
  if (!cleanDescription || cleanDescription.length > 300) {
    console.error(`Description is required and must be ≤300 characters (got ${cleanDescription?.length ?? 0}).`);
    process.exit(1);
  }
  if (!cleanLink || !/^https?:\/\//i.test(cleanLink)) {
    fail('Reference link is required and must start with http:// or https://.');
  }

  const optionLabels = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
  if (optionLabels.length < 2) {
    console.error('At least 2 vote options are required, comma-separated.');
    process.exit(1);
  }

  const { aeSdk } = await initSdk();
  const pollAci = JSON.parse(fs.readFileSync(path.join(CONTRACTS_DIR, 'PollACI.json'), 'utf8'));

  const metadata = {
    title: cleanTitle,
    description: cleanDescription,
    link: cleanLink,
    spec_ref: undefined,
  };

  const voteOptions = new Map(optionLabels.map((label, i) => [i, label]));
  const parsedCloseHeight = closeHeight === undefined ? undefined : strictInteger(closeHeight, 'Close height');
  if (parsedCloseHeight !== undefined && parsedCloseHeight !== 0) {
    const currentHeight = await getTopBlockHeight();
    if (parsedCloseHeight <= currentHeight) {
      fail(`Close height must be in the future or 0 for open-ended (current height: ${currentHeight}).`);
    }
  }
  const contractCloseHeight = parsedCloseHeight === 0 ? undefined : parsedCloseHeight;

  console.error(`Deploying Poll contract for "${cleanTitle}"...`);

  const pollContract = await Contract.initialize({
    aci: pollAci,
    bytecode: loadPollBytecode(),
    onAccount: aeSdk,
    onNode: aeSdk.api,
  });

  const deployResult = await pollContract.init(metadata, voteOptions, contractCloseHeight);
  const pollAddress = pollContract.$options?.address || deployResult.result?.contractId;

  if (!pollAddress) {
    console.error('ERROR: Could not determine deployed poll address.', JSON.stringify(deployResult));
    process.exit(1);
  }

  console.error(`Poll deployed at ${pollAddress}. Registering in registry...`);

  const registry = await initRegistry(aeSdk);
  const addResult = await registry.add_poll(pollAddress, listed);
  const pollId = addResult.decodedResult;

  console.log(JSON.stringify({
    success: true,
    action: 'create_poll',
    poll_id: pollId?.toString() ?? null,
    poll_address: pollAddress,
    title: cleanTitle,
    description: cleanDescription,
    link: cleanLink,
    is_listed: listed,
    vote_options: Object.fromEntries(optionLabels.map((label, i) => [i, label])),
    close_height: contractCloseHeight ?? null,
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
  const optionKey = resolveVoteOptionKey(state.vote_options, optionNumber);

  if (optionKey === null) {
    const validOptions = [...state.vote_options.entries()].map(([k, v]) => `${k}: ${v}`).join(', ');
    const normalizedOption = strictInteger(optionNumber, 'Option number');
    console.error(`Invalid option ${normalizedOption}. Valid options: ${validOptions}`);
    process.exit(1);
  }

  const isClosedResult = await poll.is_closed();
  if (isClosedResult.decodedResult) {
    console.error('ERROR: This poll is already closed.');
    process.exit(1);
  }

  const optionLabel = state.vote_options.get(optionKey);
  console.error(`Voting for option ${optionKey.toString()} ("${optionLabel}") on poll ${pollAddress}...`);

  const result = await poll.vote(optionKey);

  console.log(JSON.stringify({
    success: true,
    action: 'vote',
    poll_address: pollAddress,
    option: optionKey.toString(),
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
  const { aeSdk, account } = await initSdk();
  parseAddress(delegateeAddress, 'Delegatee');
  if (delegateeAddress === account.address) {
    fail('Cannot delegate to your own address.');
  }
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

async function showDelegatee(address) {
  const { aeSdk, account } = await initSdk();
  const target = address ? parseAddress(address) : account.address;
  const registry = await initRegistry(aeSdk);
  const result = await registry.delegatee(target);

  console.log(JSON.stringify({
    address: target,
    delegatee: result.decodedResult ?? null,
  }, null, 2));
}

async function showDelegators(address) {
  const { aeSdk, account } = await initSdk();
  const target = address ? parseAddress(address) : account.address;
  const registry = await initRegistry(aeSdk);
  const result = await registry.delegators(target);
  const delegators = [...result.decodedResult.entries()].map(([delegator, delegateeAddress]) => ({
    delegator,
    delegatee: delegateeAddress,
  }));

  console.log(JSON.stringify({
    address: target,
    delegators,
    delegator_count: delegators.length,
  }, null, 2));
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

  list [limit] [--all]
    List recent listed governance polls (default: 20). Use --all to include unlisted polls.

  info <poll_address>
    Show poll details, raw vote counts, official stake-weighted results, and your current vote

  info-by-id <poll_id>
    Resolve a registry poll id, then show poll details

  create "<title>" "<description>" "<link>" "<opt0,opt1,...>" [close_height] [--unlisted|--listed false]
    Deploy a new Poll contract and register it in the governance registry

    title         Poll title (max 50 chars)
    description   Poll description (max 300 chars)
    link          Reference URL (must start with http:// or https://)
    options       Comma-separated vote option labels (min 2)
    close_height  Future block height when poll closes; use 0 or omit for open-ended

  vote <poll_address> <option_number>
    Vote on a poll by option number (0-based)

  revoke <poll_address>
    Revoke your vote on a poll

  delegate <ak_address>
    Delegate your global voting power to another address

  delegatee [ak_address]
    Show the delegatee for an address (defaults to your wallet)

  delegators [ak_address]
    Show direct delegators for an address (defaults to your wallet)

  revoke-delegation
    Revoke your current delegation

Examples:
  node scripts/superhero-governance.mjs list 10
  node scripts/superhero-governance.mjs list 10 --all
  node scripts/superhero-governance.mjs info ct_abc...
  node scripts/superhero-governance.mjs info-by-id 42
  node scripts/superhero-governance.mjs create "Upgrade protocol?" "Should we upgrade to v3?" "https://forum.aeternity.com/t/123" "Yes,No,Abstain"
  node scripts/superhero-governance.mjs create "Feature vote" "Pick a feature" "https://forum.aeternity.com/t/456" "Option A,Option B" 1500000 --unlisted
  node scripts/superhero-governance.mjs vote ct_abc... 0
  node scripts/superhero-governance.mjs revoke ct_abc...
  node scripts/superhero-governance.mjs delegate ak_xyz...
  node scripts/superhero-governance.mjs delegatee
  node scripts/superhero-governance.mjs delegators ak_xyz...
  node scripts/superhero-governance.mjs revoke-delegation

Note: Official governance results are stake-weighted. Raw vote counts are address counts only.
Creating a poll requires 2 on-chain transactions (deploy + register). Allow up to 5 minutes.
`);
    process.exit(0);
  }

  switch (command) {
    case 'list': {
      await listPolls(parseListArgs(process.argv.slice(3)));
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
    case 'info-by-id': {
      const pollId = process.argv[3];
      if (!pollId) {
        console.error('Usage: node scripts/superhero-governance.mjs info-by-id <poll_id>');
        process.exit(1);
      }
      await getPollInfoById(pollId);
      break;
    }
    case 'create': {
      const title = process.argv[3];
      const description = process.argv[4];
      const link = process.argv[5];
      const optionsStr = process.argv[6];
      const createOptions = parseCreateOptions(process.argv.slice(7));
      if (!title || !description || !optionsStr) {
        console.error('Usage: node scripts/superhero-governance.mjs create "<title>" "<description>" "<link>" "<opt0,opt1,...>" [close_height] [--unlisted|--listed false]');
        process.exit(1);
      }
      await createPoll(title, description, link, optionsStr, createOptions);
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
    case 'delegatee': {
      await showDelegatee(process.argv[3]);
      break;
    }
    case 'delegators': {
      await showDelegators(process.argv[3]);
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
