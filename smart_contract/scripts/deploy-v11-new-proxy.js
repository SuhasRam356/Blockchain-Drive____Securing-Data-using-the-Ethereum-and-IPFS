const { ethers, upgrades } = require("hardhat");
const fs = require('fs');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying directly with the account:", deployer.address);

  // Use Existing Addresses for Token, DAO, Faucet
  const tokenAddress = process.env.VITE_TOKEN_ADDRESS || "0x9007d99de707BAe1F7Ab2e0766D6C14Dcec00415";
  const daoAddress = process.env.VITE_DAO_ADDRESS || "0x0Be449711c726E3072F76e4564b2e1BD340CE9d4";
  const faucetAddress = process.env.VITE_FAUCET_ADDRESS || "0xd534f6152C36784F4A6E861b2445c9FEe64D6D36";

  console.log("Deploying Groth16Verifier...");
  const VerifierFactory = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await VerifierFactory.deploy();
  await verifier.waitForDeployment();
  const verifierAddr = await verifier.getAddress();
  console.log("Groth16Verifier deployed to:", verifierAddr);

  // Deploy NEW V11 Proxy
  console.log("Deploying a completely NEW V11 Proxy...");
  const UploadV11 = await ethers.getContractFactory("UploadUpgradeableV11");
  const upload = await upgrades.deployProxy(UploadV11, [], { kind: "uups" });
  await upload.waitForDeployment();
  const newProxyAddress = await upload.getAddress();
  console.log("Successfully deployed NEW V11 Proxy to:", newProxyAddress);

  // Set Verifier
  console.log("Setting Verifier Address...");
  const tx = await upload.setZkpVerifierAddress(verifierAddr);
  await tx.wait();
  console.log("Verifier address set!");

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

  updateEnv('VITE_CONTRACT_ADDRESS', newProxyAddress);
  fs.writeFileSync(envPath, envContent);
  console.log(`\nUpdated client/.env with NEW proxy address: ${newProxyAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
