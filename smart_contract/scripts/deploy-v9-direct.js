const { ethers, upgrades } = require("hardhat");
const fs = require('fs');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying directly with the account:", deployer.address);

  // Use Existing Addresses on Sepolia to save gas
  const tokenAddress = "0x9007d99de707BAe1F7Ab2e0766D6C14Dcec00415";
  const daoAddress = "0x0Be449711c726E3072F76e4564b2e1BD340CE9d4";
  const faucetAddress = "0xd534f6152C36784F4A6E861b2445c9FEe64D6D36";

  console.log("Using existing DriveToken:", tokenAddress);
  console.log("Using existing DriveDAO:", daoAddress);
  console.log("Using existing DriveFaucet:", faucetAddress);

  // Deploy V9 Proxy DIRECTLY (bypassing DAO voting for local dev)
  console.log("\nDeploying UploadUpgradeableV9 Proxy directly...");
  const UploadV9 = await ethers.getContractFactory("UploadUpgradeableV9");
  const uploadProxy = await upgrades.deployProxy(UploadV9, [], { kind: 'uups' });
  await uploadProxy.waitForDeployment();
  const proxyAddress = await uploadProxy.getAddress();
  console.log("UploadUpgradeableV9 Proxy deployed to:", proxyAddress);

  // Transfer Ownership to DAO (so future upgrades can still use DAO)
  console.log("\nTransferring ownership of Proxy to DAO...");
  const transferTx = await uploadProxy.transferOwnership(daoAddress);
  await transferTx.wait();
  console.log("Proxy ownership successfully transferred to DAO!");

  // Write to env file
  const envPath = '../client/.env';
  let envContent = '';
  if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
  }

  const updateEnv = (key, value) => {
      if (envContent.includes(`${key}=`)) {
          envContent = envContent.replace(new RegExp(`${key}=.*`), `${key}="${value}"`);
      } else {
          envContent += `\n${key}="${value}"`;
      }
  };

  updateEnv('VITE_CONTRACT_ADDRESS', proxyAddress);
  updateEnv('VITE_TOKEN_ADDRESS', tokenAddress);
  updateEnv('VITE_DAO_ADDRESS', daoAddress);
  updateEnv('VITE_FAUCET_ADDRESS', faucetAddress);

  fs.writeFileSync(envPath, envContent);
  console.log("\nUpdated client/.env with all new addresses!");
  
  // Get current block number to optimize subgraph syncing
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log("Current Block Number:", currentBlock);
  
  // Write proxy address and startBlock to subgraph.yaml
  const subgraphPath = '../subgraph/subgraph.yaml';
  let subgraphContent = fs.readFileSync(subgraphPath, 'utf8');
  subgraphContent = subgraphContent.replace(/address: "0x[a-fA-F0-9]{40}"/, `address: "${proxyAddress}"`);
  subgraphContent = subgraphContent.replace(/startBlock: \d+/, `startBlock: ${currentBlock}`);
  fs.writeFileSync(subgraphPath, subgraphContent);
  console.log(`Updated subgraph.yaml with new proxy address and startBlock: ${currentBlock}!`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
