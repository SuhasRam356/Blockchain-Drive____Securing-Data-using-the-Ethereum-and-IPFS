const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("Setting up E2EE for the user directly on Sepolia...");
    
    // Get the deployer wallet (the user's wallet from .env)
    const [userWallet] = await ethers.getSigners();
    const address = await userWallet.getAddress();
    console.log("User Address:", address);

    // Read the contract address from client/.env
    const envContent = fs.readFileSync('../client/.env', 'utf8');
    const contractAddressMatch = envContent.match(/VITE_CONTRACT_ADDRESS="([^"]+)"/);
    if (!contractAddressMatch) throw new Error("Could not find contract address");
    const contractAddress = contractAddressMatch[1];
    
    console.log("Contract Address:", contractAddress);

    // Connect to contract
    const UploadV6 = await ethers.getContractFactory("UploadUpgradeableV6");
    const contract = UploadV6.attach(contractAddress);

    // 1. Generate Deterministic Key
    const message = `Welcome to BlockDrive!
    
Sign this message to generate your secure, deterministic encryption key. 
This allows you to encrypt and decrypt files securely without relying on third parties.

Address: ${address}`;

    console.log("Signing deterministic message...");
    // Hardhat ethers v6 signMessage
    const signature1 = await userWallet.signMessage(message);
    
    // In ethers v6, arrayify is getBytes, sha256 is sha256
    const secretKey = ethers.sha256(ethers.getBytes(signature1));
    
    // Derive public key using ethers v6 SigningKey
    const signingKey = new ethers.SigningKey(secretKey);
    const pubKey = signingKey.publicKey;
    
    console.log("Generated E2EE Public Key:", pubKey);

    // 2. Check if already published
    const existingKey = await contract.encryptionPublicKeys(address);
    if (existingKey === pubKey) {
        console.log("Key is already published and matches!");
        return;
    }

    // 3. Create validation signature
    const validationMessage = "Confirm E2EE Public Key: " + pubKey;
    console.log("Signing validation message...");
    const signature2 = await userWallet.signMessage(validationMessage);

    // 4. Send transaction
    console.log("Publishing key to Sepolia...");
    const tx = await contract.setEncryptionPublicKey(pubKey, signature2);
    console.log("Transaction sent! Hash:", tx.hash);
    
    await tx.wait();
    console.log("Transaction confirmed! E2EE is fully set up.");
}

main().catch(console.error);
