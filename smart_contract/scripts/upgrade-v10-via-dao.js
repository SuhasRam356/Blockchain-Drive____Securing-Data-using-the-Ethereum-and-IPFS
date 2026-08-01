const { ethers, network } = require("hardhat");
require("dotenv").config({ path: "../client/.env" });

async function main() {
    const proxyAddress = process.env.VITE_CONTRACT_ADDRESS;
    const daoAddress = process.env.VITE_DAO_ADDRESS;
    const tokenAddress = process.env.VITE_TOKEN_ADDRESS;

    if (!proxyAddress || !daoAddress || !tokenAddress) {
        console.error("Missing environment variables!");
        return;
    }

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const dao = await ethers.getContractAt("DriveDAO", daoAddress);
    const token = await ethers.getContractAt("DriveToken", tokenAddress);

    // 1. Deploy V10 implementation
    console.log("Deploying V10 Implementation...");
    const V10 = await ethers.getContractFactory("UploadUpgradeableV10");
    const v10Impl = await upgrades.prepareUpgrade(proxyAddress, V10, { kind: 'uups' });
    console.log("V10 Implementation deployed at:", v10Impl);

    // 2. Prepare the upgrade transaction
    console.log("\n2. Preparing upgrade transaction...");
    const proxy = await ethers.getContractAt("UploadUpgradeableV10", proxyAddress);
    const upgradeCallData = proxy.interface.encodeFunctionData("upgradeTo", [v10Impl]);

    // 3. Submit proposal to DAO
    console.log("\n3. Proposing upgrade to DAO...");
    const description = "Upgrade Upload Contract to V10 - Advanced IEEE Features (Deduplication & Key Rotation)";
    const txPropose = await dao.propose(
        [proxyAddress],
        [0],
        [upgradeCallData],
        description
    );
    const proposeReceipt = await txPropose.wait();
    
    // Extract Proposal ID from ProposalCreated event
    const event = proposeReceipt.logs.find(log => log.eventName === "ProposalCreated");
    const proposalId = event.args.proposalId;
    console.log("Proposal ID:", proposalId.toString());

    // 4. Mine 1 block to pass votingDelay
    console.log("Mining 1 block to start voting...");
    await network.provider.send("evm_mine");

    // 5. Cast Vote
    console.log("Casting vote FOR...");
    const txVote = await dao.castVote(proposalId, 1);
    await txVote.wait();
    console.log("Vote cast!");

    // 6. Fast-forward blocks to pass votingPeriod (50400 blocks)
    console.log("Fast-forwarding 50400 blocks...");
    await network.provider.send("hardhat_mine", ["0xC4E0"]); // 50400 in hex

    // 7. Execute proposal
    console.log("Executing upgrade proposal...");
    const descriptionHash = ethers.id(description);
    const txExecute = await dao.execute(
        [proxyAddress],
        [0],
        [encodedCall],
        descriptionHash
    );
    await txExecute.wait();
    console.log("Upgrade Executed successfully! We are now on V8.");
}

main().catch(console.error);
