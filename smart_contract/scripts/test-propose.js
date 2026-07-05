const { ethers } = require("hardhat");
require("dotenv").config({ path: "../client/.env" });

async function main() {
  const [deployer] = await ethers.getSigners();
  const daoAddress = process.env.VITE_DAO_ADDRESS;
  const tokenAddress = process.env.VITE_TOKEN_ADDRESS;
  
  console.log("DAO Address:", daoAddress);
  console.log("Token Address:", tokenAddress);
  console.log("Deployer:", deployer.address);

  const dao = await ethers.getContractAt("DriveDAO", daoAddress);
  const token = await ethers.getContractAt("DriveToken", tokenAddress);

  // Check voting power
  const votes = await token.getVotes(deployer.address);
  console.log("Voting Power:", ethers.formatUnits(votes, 18));
  
  if (votes === 0n) {
      console.log("Delegating votes...");
      const tx = await token.delegate(deployer.address);
      await tx.wait();
      console.log("Votes delegated.");
  }

  // Create proposal
  console.log("Creating proposal...");
  const encodedCall = token.interface.encodeFunctionData("transfer", [ethers.ZeroAddress, 0]);
  
  try {
      const tx = await dao.propose(
          [tokenAddress],
          [0],
          [encodedCall],
          "Test Proposal"
      );
      await tx.wait();
      console.log("Proposal created successfully!");
  } catch (err) {
      console.error("Propose failed:", err);
  }
}

main().catch(console.error);
