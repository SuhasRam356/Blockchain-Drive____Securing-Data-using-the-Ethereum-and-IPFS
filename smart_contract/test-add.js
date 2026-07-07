const { ethers } = require("hardhat");

async function main() {
    const [signer] = await ethers.getSigners();
    
    const proxyAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
    const contract = await ethers.getContractAt("UploadUpgradeableV6", proxyAddress);

    console.log("Testing addWithE2EE...");
    try {
        const tx = await contract.addWithE2EE(
            "ipfs_hash",
            "Category",
            ethers.ZeroHash,
            "0x",
            "encryptedKey_hex"
        );
        await tx.wait();
        console.log("Success!");
    } catch (e) {
        console.error("Failed:", e.message);
    }
}
main().catch(console.error);
