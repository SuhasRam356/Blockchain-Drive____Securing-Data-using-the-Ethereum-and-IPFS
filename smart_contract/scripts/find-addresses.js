const hre = require("hardhat");

async function main() {
    console.log("Connecting to Sepolia...");
    const proxyAddress = "0xd7F39943769411C40470DE6151a892557C2ecf02";
    console.log("Proxy Address:", proxyAddress);

    const UploadV6 = await hre.ethers.getContractAt("UploadUpgradeableV6", proxyAddress);
    const daoAddress = await UploadV6.owner();
    console.log("DAO Address (Owner):", daoAddress);

    const DriveDAO = await hre.ethers.getContractAt("DriveDAO", daoAddress);
    
    // Check if driveToken function exists
    try {
        const tokenAddress = await DriveDAO.token();
        console.log("Token Address:", tokenAddress);
        
        const DriveToken = await hre.ethers.getContractAt("DriveToken", tokenAddress);
        
        // Find transfer events to find faucet
        const filter = DriveToken.filters.Transfer(null, null);
        const events = await DriveToken.queryFilter(filter, -10000); // look at last 10000 blocks
        
        let faucetAddress = null;
        for(let ev of events) {
            // Find a transfer of 500,000 tokens (500000 * 10^18)
            if(ev.args[2].toString() === hre.ethers.parseEther("500000").toString()) {
                faucetAddress = ev.args[1]; // to address
                break;
            }
        }
        
        console.log("Faucet Address:", faucetAddress || "NOT FOUND");
        
    } catch(e) {
        console.error("Error fetching token/faucet", e);
    }
}

main().catch(console.error);
