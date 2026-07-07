const { ethers } = require("hardhat");
require("dotenv").config({ path: "../client/.env" });

async function main() {
    const tokenAddress = process.env.VITE_TOKEN_ADDRESS;
    if (!tokenAddress) {
        console.error("Missing VITE_TOKEN_ADDRESS in env");
        return;
    }

    const [deployer] = await ethers.getSigners();
    console.log("Deploying Faucet from account:", deployer.address);

    const token = await ethers.getContractAt("DriveToken", tokenAddress);
    const deployerBalance = await token.balanceOf(deployer.address);
    console.log("Deployer token balance:", ethers.formatEther(deployerBalance));

    // Deploy Faucet
    const claimAmount = ethers.parseEther("100"); // 100 DRIVE per claim
    const cooldownTime = 24 * 60 * 60; // 24 hours

    const DriveFaucet = await ethers.getContractFactory("DriveFaucet");
    const faucet = await DriveFaucet.deploy(tokenAddress, claimAmount, cooldownTime);
    await faucet.waitForDeployment();
    
    const faucetAddress = await faucet.getAddress();
    console.log("DriveFaucet deployed to:", faucetAddress);

    // Transfer 500,000 DRIVE to Faucet
    const fundAmount = ethers.parseEther("500000");
    console.log(`Funding Faucet with ${ethers.formatEther(fundAmount)} DRIVE...`);
    
    const tx = await token.transfer(faucetAddress, fundAmount);
    await tx.wait();
    
    console.log("Faucet successfully funded!");
    
    // Write to env file
    const fs = require('fs');
    const envPath = '../client/.env';
    let envContent = '';
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }
    if (envContent.includes('VITE_FAUCET_ADDRESS=')) {
        envContent = envContent.replace(/VITE_FAUCET_ADDRESS=.*/, `VITE_FAUCET_ADDRESS="${faucetAddress}"`);
    } else {
        envContent += `\nVITE_FAUCET_ADDRESS="${faucetAddress}"`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log("Updated client/.env with Faucet address!");
}

main().catch(console.error);
