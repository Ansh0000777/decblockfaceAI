#!/usr/bin/env node
/*
 Pure Node deploy script (no Hardhat)
 Requires: npm i -D solc

 Usage:
   node scripts/deploy-node.cjs
   node scripts/deploy-node.cjs --set-admin 0xADMIN_ADDRESS

 Reads:
   - .env: REACT_APP_RPC_URL (default http://127.0.0.1:8545)
   - .env: ADMIN_OWNER_PRIVATE_KEY (or OWNER_PRIVATE_KEY / PRIVATE_KEY)

 Outputs:
   - Deployed address. Copy it to .env as REACT_APP_CONTRACT_ADDRESS
*/
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');

const RPC_URL = process.env.REACT_APP_RPC_URL || 'http://127.0.0.1:8545';
const PRIVATE_KEY =
  process.env.ADMIN_OWNER_PRIVATE_KEY ||
  process.env.OWNER_PRIVATE_KEY ||
  process.env.PRIVATE_KEY;

if (!PRIVATE_KEY || !/^0x[0-9a-fA-F]{64}$/.test(PRIVATE_KEY)) {
  console.error('ERROR: Put the owner private key in .env as ADMIN_OWNER_PRIVATE_KEY (or OWNER_PRIVATE_KEY / PRIVATE_KEY).');
  process.exit(1);
}

const contractFile = path.join(__dirname, '..', 'contracts', 'VotingSystem.sol');
if (!fs.existsSync(contractFile)) {
  console.error('ERROR: contracts/VotingSystem.sol not found');
  process.exit(1);
}

function findImports(importPath) {
  const fullPath = path.isAbsolute(importPath)
    ? importPath
    : path.join(path.dirname(contractFile), importPath);
  try {
    const contents = fs.readFileSync(fullPath, 'utf8');
    return { contents };
  } catch {
    return { error: 'File not found: ' + importPath };
  }
}

async function compileExact() {
  const source = fs.readFileSync(contractFile, 'utf8');
  // Choose a stable 0.8.x compiler; adjust if your pragma requires different
  const solcVersion = 'v0.8.19+commit.7dd6d404';
  const solcSpecific = await new Promise((resolve, reject) => {
    solc.loadRemoteVersion(solcVersion, (err, s) => (err ? reject(err) : resolve(s)));
  });

  const input = {
    language: 'Solidity',
    sources: {
      'VotingSystem.sol': { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      }
    }
  };

  const output = JSON.parse(solcSpecific.compile(JSON.stringify(input), { import: findImports }));
  if (output.errors) {
    const fatal = output.errors.filter(e => e.severity === 'error');
    fatal.forEach(e => console.error(e.formattedMessage || e.message));
    if (fatal.length) process.exit(1);
  }
  const compiled = output.contracts['VotingSystem.sol']?.['VotingSystem'];
  if (!compiled) {
    console.error('Compilation failed: contract not found in output');
    process.exit(1);
  }
  return {
    abi: compiled.abi,
    bytecode: '0x' + compiled.evm.bytecode.object
  };
}

async function main() {
  const args = process.argv.slice(2);
  const setAdminIndex = args.indexOf('--set-admin');
  const adminAddress = setAdminIndex >= 0 ? (args[setAdminIndex + 1] || '') : '';

  const { abi, bytecode } = await compileExact();

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log('Deploying from:', await wallet.getAddress());

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  // Add generous gasLimit to bypass estimateGas quirks on Ganache
  const contract = await factory.deploy({ gasLimit: 6_000_000 });
  const deployTx = contract.deploymentTransaction();
  if (deployTx) {
    console.log('Deploy tx:', deployTx.hash);
    await deployTx.wait();
  }
  const address = await contract.getAddress();
  console.log('Deployed VotingSystem at:', address);

  if (adminAddress) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(adminAddress)) {
      console.error('Invalid admin address after --set-admin');
      process.exit(1);
    }
    console.log('Setting admin to', adminAddress, '...');
    const tx = await contract.setAdmin(adminAddress, { gasLimit: 200_000 });
    const rc = await tx.wait();
    console.log('setAdmin tx:', rc?.hash);
  }

  console.log('\nNext steps:');
  console.log('  1) Update .env -> REACT_APP_CONTRACT_ADDRESS=' + address);
  console.log('  2) npm start (restart if running)');
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});