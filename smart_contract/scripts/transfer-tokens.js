const { ethers } = require("hardhat");
require("dotenv").config({ path: "../client/.env" });

async function main() {
  const [deployer] = await ethers.getSigners();
  const tokenAddress = process.env.VITE_TOKEN_ADDRESS;
  
  if (!tokenAddress) {
    console.error("VITE_TOKEN_ADDRESS not found in .env");
    return;
  }

  const DriveToken = await ethers.getContractFactory("DriveToken");
  const token = DriveToken.attach(tokenAddress);

  const targetAccount = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Account 1
  const amount = ethers.parseUnits("500000", 18);

  console.log(`Transferring 500,000 tokens from deployer to ${targetAccount}...`);
  const tx = await token.transfer(targetAccount, amount);
  await tx.wait();

  console.log("Tokens transferred successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
