const { ethers } = require("hardhat");

async function main() {
    const [sender] = await ethers.getSigners();
    const receiverAddress = "0x1048946c54F864B5Fabd7d81F03d31dcdC79c13a";
    const amount = ethers.parseEther("0.02"); // Send 0.02 ETH

    console.log("Sender address:", sender.address);
    console.log("Sender balance:", ethers.formatEther(await ethers.provider.getBalance(sender.address)));

    console.log(`Sending ${ethers.formatEther(amount)} ETH to ${receiverAddress}...`);
    
    const tx = await sender.sendTransaction({
        to: receiverAddress,
        value: amount
    });
    
    await tx.wait();
    console.log("Transaction successful! Hash:", tx.hash);
}

main().catch(console.error);
