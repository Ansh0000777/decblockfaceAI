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

1. **Node.js** (v16 or higher)
2. **MetaMask** browser extension
3. **Ganache** for local blockchain development

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd blockdface
   npm install
   ```

2. **Download face recognition models:**
   ```bash
   npm run setup:models
   ```

3. **Start local blockchain:**
   ```bash
   npm run node
   ```
   (Keep this running in a separate terminal)

4. **Compile and deploy smart contract:**
   ```bash
   npm run compile
   npm run deploy
   ```

5. **Configure MetaMask:**
   - Add Localhost 8545 network
   - Import first Ganache account (100 ETH)
   - Set network to "Localhost 8545"

6. **Start the application:**
   ```bash
   npm start
   ```

### Usage

#### Admin Setup
1. Visit `http://localhost:3000/admin`
2. Connect MetaMask with admin account
3. Add candidates using the dashboard
4. Set voting period (start/end times)
5. Monitor results in real-time

#### Voter Registration & Voting
1. Visit `http://localhost:3000`
2. Click "Register Face" for new voters
3. Allow camera access and follow prompts
4. Login with face for returning voters
5. Connect MetaMask wallet
6. Select candidate and cast vote
7. View results after voting period ends

### Development

```bash
# Start development server
npm start

# Compile smart contracts
npm run compile

# Deploy to local blockchain
npm run deploy

# Run local blockchain
npm run node

# Setup face models
npm run setup:models
```

### Security Features

- Face data processed locally (never leaves device)
- One vote per wallet enforcement
- Smart contract-based access control
- MetaMask transaction confirmations
- Time-locked voting periods

### License

MIT License
