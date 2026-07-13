const { ethers } = require("hardhat");

async function main() {
    const proxyAddress = "0xd7F39943769411C40470DE6151a892557C2ecf02";
    const UploadV6 = await ethers.getContractFactory("UploadUpgradeableV6");
    const upload = UploadV6.attach(proxyAddress);
    
    try {
        const owner = await upload.owner();
        console.log("Owner is:", owner);
    } catch(e) {
        console.log("Error getting owner:", e.message);
    }
}

main();
