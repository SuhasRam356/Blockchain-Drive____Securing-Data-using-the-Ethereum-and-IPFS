const { ethers } = require("hardhat");

async function main() {
    const daoAddress = "0x13e1c606D34cbdd657d122E22572D962956eAC3E";
    const dao = await ethers.getContractAt("DriveDAO", daoAddress);
    
    try {
        const delay = await dao.votingDelay();
        const period = await dao.votingPeriod();
        console.log("Voting Delay:", delay.toString());
        console.log("Voting Period:", period.toString());
    } catch(e) {
        console.log("Error:", e.message);
    }
}

main();
