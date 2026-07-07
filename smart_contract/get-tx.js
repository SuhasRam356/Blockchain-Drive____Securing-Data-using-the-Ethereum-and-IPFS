const { ethers } = require("hardhat");

async function main() {
    const provider = ethers.provider;
    const blockNum = await provider.getBlockNumber();
    console.log("Current block:", blockNum);
    
    // Look at last 50 blocks for failed transactions
    let found = false;
    for (let i = blockNum; i > Math.max(0, blockNum - 50); i--) {
        const block = await provider.getBlock(i);
        if (block.transactions.length > 0) {
            for (const txHash of block.transactions) {
                const receipt = await provider.getTransactionReceipt(txHash);
                if (receipt.status === 0) {
                    found = true;
                    console.log(`\nFound failed TX: ${txHash} in block ${i}`);
                    const tx = await provider.getTransaction(txHash);
                    // Try to get revert reason
                    try {
                        await provider.call(tx, tx.blockNumber);
                    } catch (err) {
                        console.log("Revert reason:", err.message);
                        if (err.data) {
                            console.log("Revert data:", err.data);
                        }
                    }
                }
            }
        }
    }
    if (!found) {
        console.log("No failed transactions found in the last 50 blocks.");
    }
}
main().catch(console.error);
