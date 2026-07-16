const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("Validating upgrade from V7 to V8...");
    const UploadV7 = await ethers.getContractFactory("UploadUpgradeableV7");
    const UploadV8 = await ethers.getContractFactory("UploadUpgradeableV8");

    try {
        await upgrades.validateUpgrade(UploadV7, UploadV8, { kind: 'uups' });
        console.log("✅ Upgrade is storage-compatible!");
    } catch (error) {
        console.error("❌ Storage layout is incompatible!");
        console.error(error);
        process.exitCode = 1;
    }
}

main();
