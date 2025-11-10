const fs = require('fs');
const path = require('path');

console.log("🔍 BlockDFace System Check\n");

// Check project structure
const requiredFiles = [
  'src/App.tsx',
  'src/components/FaceLogin.tsx',
  'src/components/AdminDashboard.tsx',
  'src/components/VoterInterface.tsx',
  'src/services/ContractService.ts',
  'src/services/FaceRecognitionService.ts',
  'contracts/VotingSystem.sol',
  'scripts/deploy.js',
  'hardhat.config.js',
  'public/models',
  'package.json'
];

let allFilesExist = true;

console.log("📁 Checking project structure:");
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

// Check models directory
const modelsDir = 'public/models';
if (fs.existsSync(modelsDir)) {
  const modelFiles = fs.readdirSync(modelsDir);
  console.log(`\n📦 Face recognition models: ${modelFiles.length} files`);
  modelFiles.forEach(file => console.log(`  ✅ ${file}`));
} else {
  console.log("\n❌ Models directory not found");
  allFilesExist = false;
}

// Check package.json
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log("\n📋 Package configuration:");
  console.log(`  ✅ Name: ${packageJson.name}`);
  console.log(`  ✅ Version: ${packageJson.version}`);

  const scripts = packageJson.scripts || {};
  console.log("  ✅ Scripts:");
  Object.keys(scripts).forEach(script => {
    console.log(`    - ${script}: ${scripts[script]}`);
  });
} catch (error) {
  console.log("\n❌ Invalid package.json");
  allFilesExist = false;
}

// Check README
if (fs.existsSync('README.md')) {
  console.log("\n📖 Documentation: README.md present");
} else {
  console.log("\n❌ README.md missing");
}

console.log("\n" + "=".repeat(50));

if (allFilesExist) {
  console.log("🎉 BlockDFace system setup complete!");
  console.log("\n🚀 Ready to deploy:");
  console.log("1. npm run node      # Start Ganache blockchain");
  console.log("2. npm run compile   # Compile smart contract");
  console.log("3. npm run deploy    # Deploy contract");
  console.log("4. npm start          # Start the application");
  console.log("\n📱 Access points:");
  console.log("- Voters: http://localhost:3000");
  console.log("- Admin:  http://localhost:3000/admin");
} else {
  console.log("❌ System setup incomplete. Check missing files above.");
}