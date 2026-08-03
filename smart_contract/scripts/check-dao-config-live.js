const { ethers } = require("hardhat");
require("dotenv").config({ path: "../client/.env" });

async function main() {
    const daoAddress = process.env.VITE_DAO_ADDRESS;
    if (!daoAddress) {
        console.log("No DAO address found");
        return;
    }
    const dao = await ethers.getContractAt("DriveDAO", daoAddress);
    const votingPeriod = await dao.votingPeriod();
    const votingDelay = await dao.votingDelay();
    console.log("DAO on Sepolia Voting Period (blocks):", votingPeriod.toString());
    console.log("DAO on Sepolia Voting Delay (blocks):", votingDelay.toString());
    
    const proxyAddress = process.env.VITE_CONTRACT_ADDRESS;
    const proxyAdmin = await upgrades.erc1967.getAdminAddress(proxyAddress);
    console.log("Proxy Admin Address:", proxyAdmin);
    
    // Check who owns the proxy (if it's UUPS, the admin is usually the proxy itself, but Owner is checked)
    const v10 = await ethers.getContractAt("UploadUpgradeableV10", proxyAddress);
    const owner = await v10.owner();
    console.log("Proxy Owner:", owner);
}

main().catch(console.error);
