const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy Governance Token
  console.log("\nDeploying DriveToken...");
  const DriveToken = await ethers.getContractFactory("DriveToken");
  const driveToken = await DriveToken.deploy();
  await driveToken.waitForDeployment();
  const tokenAddress = await driveToken.getAddress();
  console.log("DriveToken deployed to:", tokenAddress);

  // Delegate votes to deployer so they can vote right away
  const tx = await driveToken.delegate(deployer.address);
  await tx.wait();
  console.log("Delegated voting power to deployer");

  // 2. Deploy DAO (Governor)
  console.log("\nDeploying DriveDAO...");
  const DriveDAO = await ethers.getContractFactory("DriveDAO");
  const driveDAO = await DriveDAO.deploy(tokenAddress);
  await driveDAO.waitForDeployment();
  const daoAddress = await driveDAO.getAddress();
  console.log("DriveDAO deployed to:", daoAddress);

  // 3. Deploy UUPS Upgradeable Storage Proxy
  console.log("\nDeploying UploadUpgradeable Proxy...");
  const UploadUpgradeable = await ethers.getContractFactory("UploadUpgradeable");
  const uploadProxy = await upgrades.deployProxy(UploadUpgradeable, [], { kind: 'uups' });
  await uploadProxy.waitForDeployment();
  const proxyAddress = await uploadProxy.getAddress();
  console.log("UploadUpgradeable Proxy deployed to:", proxyAddress);

  // 4. Transfer Ownership of the Proxy to the DAO
  console.log("\nTransferring ownership of Proxy to DAO...");
  const transferTx = await uploadProxy.transferOwnership(daoAddress);
  await transferTx.wait();
  console.log("Proxy ownership successfully transferred to DAO!");

  // Summary
  console.log("\n--- DEPLOYMENT SUMMARY ---");
  console.log("DriveToken:", tokenAddress);
  console.log("DriveDAO:", daoAddress);
  console.log("UploadUpgradeable (Proxy):", proxyAddress);
  
  // Write to env file or constants script so frontend can pick it up
  const fs = require('fs');
  const envPath = '../client/.env';
  
  let envContent = '';
  if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update VITE_CONTRACT_ADDRESS
  if (envContent.includes('VITE_CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(/VITE_CONTRACT_ADDRESS=.*/, `VITE_CONTRACT_ADDRESS="${proxyAddress}"`);
  } else {
      envContent += `\nVITE_CONTRACT_ADDRESS="${proxyAddress}"`;
  }

  // Update token and dao addresses
  if (envContent.includes('VITE_TOKEN_ADDRESS=')) {
      envContent = envContent.replace(/VITE_TOKEN_ADDRESS=.*/, `VITE_TOKEN_ADDRESS="${tokenAddress}"`);
  } else {
      envContent += `\nVITE_TOKEN_ADDRESS="${tokenAddress}"`;
  }

  if (envContent.includes('VITE_DAO_ADDRESS=')) {
      envContent = envContent.replace(/VITE_DAO_ADDRESS=.*/, `VITE_DAO_ADDRESS="${daoAddress}"`);
  } else {
      envContent += `\nVITE_DAO_ADDRESS="${daoAddress}"`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log("\nUpdated client/.env with new contract addresses!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
