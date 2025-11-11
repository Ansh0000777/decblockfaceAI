# BlockDFace - Decentralized Voting System

A blockchain-based voting platform with face authentication, built with React, Solidity, and face-api.js.

## Features

- 🗳️ Secure blockchain voting using Ethereum smart contracts
- 👤 Face-based voter authentication
- 🦊 MetaMask wallet integration
- 🏛️ Admin dashboard for candidate management
- ⏰ Time-based voting periods
- 🎊 Automatic winner announcement
- 🔒 Privacy-preserving face recognition (local processing only)

## Setup Instructions

### Prerequisites

Install or verify the following before you begin:

1. **Node.js** v18 or newer (includes `npm`). Download from [nodejs.org](https://nodejs.org/).
2. **Git** for cloning this repository.
3. **MetaMask** browser extension (Chrome, Firefox, Brave, etc.).
4. **Local Ethereum network** – the bundled Hardhat node (`npm run node`) is sufficient; Ganache is optional.
5. _(Optional)_ **VS Code** with Solidity/TypeScript extensions for a smoother developer experience.

### Installation & Environment Setup

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/your-org/blockdface.git
   cd blockdface
   npm install
   ```

2. **Create your environment file**
   ```bash
   cp .env.example .env  # if the template exists; otherwise create .env manually
   ```
   Minimum variables required:
   ```dotenv
   REACT_APP_RPC_URL=http://127.0.0.1:8545
   ADMIN_OWNER_PRIVATE_KEY=0xYOUR_LOCAL_PRIVATE_KEY
   ```
   Use the private key of the account that will deploy the contract (for local chains, this is typically the first Hardhat/Ganache account). **Never commit this key.**

3. **Download face recognition models (one-time)**
   ```bash
   npm run setup:models
   ```

4. **Start the local blockchain (keep this terminal running)**
   ```bash
   npm run node
   ```
   This launches a Hardhat JSON-RPC node on `http://127.0.0.1:8545` with pre-funded accounts.

5. **Deploy the smart contract using the Node script**
   ```bash
   npm run deploy:node
   # equivalent to
   node scripts/deploy-node.cjs
   ```
   The script compiles `contracts/VotingSystem.sol`, deploys it with the private key from `.env`, and automatically updates:
   - `public/contractInfo.json`
   - `.env → REACT_APP_CONTRACT_ADDRESS`

   Need to set an admin immediately? Append `-- --set-admin 0xADMIN_ADDRESS` to the command.

6. **Configure MetaMask**
   - Add a network pointing to `http://127.0.0.1:8545` (chain ID `1337`).
   - Import one of the pre-funded private keys printed by `npm run node`.
   - Switch MetaMask to this network before interacting with the DApp.

7. **Start the React application**
   ```bash
   npm start
   ```
   Visit [http://localhost:3000](http://localhost:3000). Restart the dev server after redeploying contracts so the new address is picked up.

### Security Features

- Face data processed locally (never leaves device)
- One vote per wallet enforcement
- Smart contract-based access control
- MetaMask transaction confirmations
- Time-locked voting periods
