const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying VotingSystem contract...");

  // Get the contract factory
  const VotingSystem = await ethers.getContractFactory("VotingSystem");

  // Deploy the contract
  const votingSystem = await VotingSystem.deploy();

  // Wait for deployment to complete
  await votingSystem.deployed();

  console.log("VotingSystem deployed to:", votingSystem.address);
  console.log("Transaction hash:", votingSystem.deployTransaction.hash);

  // Save contract address and ABI for frontend use
  const fs = require("fs");
  const contractInfo = {
    address: votingSystem.address,
    abi: require("../artifacts/contracts/VotingSystem.sol/VotingSystem.json").abi
  };

  // Ensure src directory exists
  if (!fs.existsSync("src")) {
    fs.mkdirSync("src");
  }

  fs.writeFileSync(
    "src/contractInfo.json",
    JSON.stringify(contractInfo, null, 2)
  );

  console.log("Contract info saved to src/contractInfo.json");

  // Log the owner (deployer) address
  const [owner] = await ethers.getSigners();
  console.log("Contract owner (admin):", owner.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });