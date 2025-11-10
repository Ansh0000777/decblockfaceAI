const fs = require('fs');
const path = require('path');
const https = require('https');

// Create models directory
const modelsDir = path.join(__dirname, '../public/models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Face-api.js model files to download
const models = [
  {
    name: 'tiny_face_detector_model-weights_manifest.json',
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/tiny_face_detector_model-weights_manifest.json'
  },
  {
    name: 'tiny_face_detector_model-shard1',
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/tiny_face_detector_model-shard1'
  },
  {
    name: 'face_landmark_68_model-weights_manifest.json',
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-weights_manifest.json'
  },
  {
    name: 'face_landmark_68_model-shard1',
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-shard1'
  },
  {
    name: 'face_recognition_model-weights_manifest.json',
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-weights_manifest.json'
  },
  {
    name: 'face_recognition_model-shard1',
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-shard1'
  },
  {
    name: 'face_recognition_model-shard2',
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-shard2'
  },
  {
    name: 'face_expression_model-weights_manifest.json',
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_expression_model-weights_manifest.json'
  },
  {
    name: 'face_expression_model-shard1',
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_expression_model-shard1'
  }
];

// Download function
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirects
        downloadFile(response.headers.location, filePath).then(resolve).catch(reject);
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${path.basename(filePath)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete the partial file
      console.error(`❌ Error downloading ${url}:`, err.message);
      reject(err);
    });
  });
}

// Download all models
async function downloadModels() {
  console.log('📦 Downloading face-api.js models...');

  try {
    for (const model of models) {
      const filePath = path.join(modelsDir, model.name);
      console.log(`⬇️  Downloading: ${model.name}`);
      await downloadFile(model.url, filePath);
    }

    console.log('\n🎉 All models downloaded successfully!');
    console.log('📁 Models are available in: public/models/');

  } catch (error) {
    console.error('\n❌ Failed to download models:', error.message);
    console.log('\n💡 You can download them manually from:');
    console.log('https://github.com/justadudewhohacks/face-api.js#pre-trained-models');
  }
}

// Create .env file template
function createEnvTemplate() {
  const envContent = `# Blockchain Configuration
REACT_APP_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
REACT_APP_NETWORK_ID=1337

# Face Recognition Configuration
REACT_APP_FACE_MATCH_THRESHOLD=0.6
REACT_APP_FACE_PHOTOS_REQUIRED=3

# Application Settings
REACT_APP_MIN_VOTING_DURATION=3600
`;

  const envPath = path.join(__dirname, '../.env.example');
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envContent);
    console.log('📝 Created .env.example file');
  }
}

// Create README setup section
function updateReadme() {
  const readmePath = path.join(__dirname, '../README.md');
  const existingContent = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : '';

  if (!existingContent.includes('# Setup Instructions')) {
    const setupContent = `# BlockDFace - Decentralized Voting System

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
   \`\`\`bash
   cd blockdface
   npm install
   \`\`\`

2. **Download face recognition models:**
   \`\`\`bash
   npm run setup:models
   \`\`\`

3. **Start local blockchain:**
   \`\`\`bash
   npm run node
   \`\`\`
   (Keep this running in a separate terminal)

4. **Compile and deploy smart contract:**
   \`\`\`bash
   npm run compile
   npm run deploy
   \`\`\`

5. **Configure MetaMask:**
   - Add Localhost 8545 network
   - Import first Ganache account (100 ETH)
   - Set network to "Localhost 8545"

6. **Start the application:**
   \`\`\`bash
   npm start
   \`\`\`

### Usage

#### Admin Setup
1. Visit \`http://localhost:3000/admin\`
2. Connect MetaMask with admin account
3. Add candidates using the dashboard
4. Set voting period (start/end times)
5. Monitor results in real-time

#### Voter Registration & Voting
1. Visit \`http://localhost:3000\`
2. Click "Register Face" for new voters
3. Allow camera access and follow prompts
4. Login with face for returning voters
5. Connect MetaMask wallet
6. Select candidate and cast vote
7. View results after voting period ends

### Development

\`\`\`bash
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
\`\`\`

### Security Features

- Face data processed locally (never leaves device)
- One vote per wallet enforcement
- Smart contract-based access control
- MetaMask transaction confirmations
- Time-locked voting periods

### License

MIT License
`;

    fs.writeFileSync(readmePath, setupContent);
    console.log('📖 Updated README.md with setup instructions');
  }
}

// Run setup
async function runSetup() {
  console.log('🚀 Setting up BlockDFace project...\n');

  await downloadModels();
  createEnvTemplate();
  updateReadme();

  console.log('\n✨ Setup complete! Run "npm start" to begin.');
}

runSetup().catch(console.error);