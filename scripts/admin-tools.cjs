#!/usr/bin/env node
/*
 Dev admin tools for local Ganache

 Examples:
  - Set admin:
      npm run admin:set -- 0xe80b4B815428f337d8713da553FA183e4704012A
  - Add candidate:
      npm run admin:add -- "Alice"
  - Show owner:
      npm run admin:owner
  - Show admin:
      npm run admin:who
  - List candidates:
      npm run admin:candidates
  - Show contract address:
      npm run admin:address
  - Clear voting period:
      npm run admin:clear
*/
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const RPC_URL = process.env.REACT_APP_RPC_URL || 'http://127.0.0.1:8545';
let CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || process.env.REACT_APP_CONTRACT_ADDRESS || '';
if (!/^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS)) {
  try {
    const p = path.join(process.cwd(), 'public', 'contractInfo.json');
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (data && data.address && /^0x[a-fA-F0-9]{40}$/.test(data.address)) {
      CONTRACT_ADDRESS = data.address;
    }
  } catch {}
}
const PRIVATE_KEY =
  process.env.ADMIN_OWNER_PRIVATE_KEY ||
  process.env.OWNER_PRIVATE_KEY ||
  process.env.PRIVATE_KEY;

if (!CONTRACT_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS)) {
  console.error('ERROR: CONTRACT_ADDRESS missing. Set CONTRACT_ADDRESS or REACT_APP_CONTRACT_ADDRESS in .env, or ensure public/contractInfo.json has a valid {"address":"0x..."}.');
  process.exit(1);
}
if (!PRIVATE_KEY || !/^0x[0-9a-fA-F]{64}$/.test(PRIVATE_KEY)) {
  console.error('ERROR: Put the owner private key in .env as ADMIN_OWNER_PRIVATE_KEY (or OWNER_PRIVATE_KEY / PRIVATE_KEY).');
  console.error('Tip: In Ganache, click the key icon next to the account to copy its private key.');
  process.exit(1);
}

// Minimal ABI subset for needed actions
const ABI = [
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_admin","type":"address"}],"name":"setAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"string","name":"_name","type":"string"}],"name":"addCandidate","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"getCandidates","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"string[]","name":"","type":"string[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"clearVotingPeriod","outputs":[],"stateMutability":"nonpayable","type":"function"}
];

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd) return printHelpAndExit();

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  switch (cmd) {
    case 'address': {
      console.log('Using contract address:', CONTRACT_ADDRESS);
      break;
    }
    case 'set-admin': {
      const addr = (args[0] || '').trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
        console.error('Usage: npm run admin:set -- 0xADMIN_ADDRESS');
        process.exit(1);
      }
      console.log('Setting admin to', addr, '...');
      const tx = await contract.setAdmin(addr, { gasLimit: 200_000 });
      const rc = await tx.wait();
      console.log('Done. Tx:', rc?.hash);
      break;
    }
    case 'add-candidate': {
      const name = (args.join(' ') || '').trim();
      if (!name) {
        console.error('Usage: npm run admin:add -- "Candidate Name"');
        process.exit(1);
      }
      console.log('Adding candidate', JSON.stringify(name), '...');
      const tx = await contract.addCandidate(name, { gasLimit: 200_000 });
      const rc = await tx.wait();
      console.log('Done. Tx:', rc?.hash);
      break;
    }
    case 'clear': {
      console.log('Clearing voting period...');
      const tx = await contract.clearVotingPeriod({ gasLimit: 200_000 });
      const rc = await tx.wait();
      console.log('Done. Tx:', rc?.hash);
      break;
    }
    case 'owner': {
      const owner = await contract.owner();
      console.log('Owner:', owner);
      break;
    }
    case 'admin':
    case 'who': {
      const admin = await contract.admin();
      console.log('Admin:', admin);
      break;
    }
    case 'candidates': {
      const [ids, names] = await contract.getCandidates();
      const list = ids.map((id, i) => ({ id: Number(id), name: names[i] }));
      console.table(list);
      break;
    }
    default:
      console.error('Unknown command:', cmd);
      printHelpAndExit();
  }
}

function printHelpAndExit() {
  console.log('Commands:');
  console.log('  address                 Show which contract address will be used');
  console.log('  set-admin <address>     Set the on-chain admin address');
  console.log('  add-candidate <name>    Add a candidate (owner/admin only)');
  console.log('  clear                   Clear voting period (owner/admin only)');
  console.log('  owner                   Show owner address');
  console.log('  admin|who               Show admin address');
  console.log('  candidates              List candidates');
  process.exit(1);
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});