const { ethers } = require("ethers");
const fs = require("fs");

async function main() {
    const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
    const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

    const env = fs.readFileSync("../client/.env", "utf8");
    const daoAddress = env.match(/VITE_DAO_ADDRESS="(.*?)"/)[1];
    const tokenAddress = env.match(/VITE_TOKEN_ADDRESS="(.*?)"/)[1];

    const constantsFile = fs.readFileSync("../client/src/utils/constants.js", "utf8");
    const daoAbiMatch = constantsFile.match(/export const daoAbi = (\[[\s\S]*?\]);/);
    const tokenAbiMatch = constantsFile.match(/export const tokenAbi = (\[[\s\S]*?\]);/);
    
    const daoAbi = JSON.parse(daoAbiMatch[1]);
    const tokenAbi = JSON.parse(tokenAbiMatch[1]);

    const daoContract = new ethers.Contract(daoAddress, daoAbi, deployer);
    
    try {
        const tokenContractInterface = new ethers.utils.Interface(tokenAbi);
        const encodedCall = tokenContractInterface.encodeFunctionData("transfer", [ethers.constants.AddressZero, 0]);
        
        console.log("Encoded call:", encodedCall);
        
        const tx = await daoContract.propose(
            [tokenAddress], // target contract
            [0], // ether value
            [encodedCall], // calldata
            "New UI Proposal" // description
        );
        console.log("Tx hash:", tx.hash);
        await tx.wait();
        console.log("Proposal created from ethers v5 logic!");
    } catch (err) {
        console.error("Error:", err.message);
    }
}

main().catch(console.error);
