const { ethers } = require("hardhat");

async function main() {
    const [signer] = await ethers.getSigners();
    const address = signer.address;

    // Use the actual proxy address deployed
    const proxyAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
    const contract = await ethers.getContractAt("UploadUpgradeableV6", proxyAddress);

    const pubKey = "test_pub_key";
    const message = `Confirm E2EE Public Key: ${pubKey}`;
    const signature = await signer.signMessage(message);

    console.log("Testing setEncryptionPublicKey...");
    try {
        const tx = await contract.setEncryptionPublicKey(pubKey, signature);
        await tx.wait();
        console.log("Success!");
    } catch (e) {
        console.error("Failed:", e.message);
    }
}
main().catch(console.error);
