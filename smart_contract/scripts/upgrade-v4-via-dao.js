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

    // 1. Deploy V4 implementation
    console.log("Deploying V4 Implementation...");
    const UploadV4 = await ethers.getContractFactory("UploadUpgradeableV4");
    const v4Impl = await UploadV4.deploy();
    await v4Impl.waitForDeployment();
    const v4ImplAddress = await v4Impl.getAddress();
    console.log("V4 Implementation deployed to:", v4ImplAddress);

    // 2. Prepare upgrade calldata
    const proxyInterface = new ethers.Interface([
        "function upgradeToAndCall(address newImplementation, bytes data) payable"
    ]);
    const encodedCall = proxyInterface.encodeFunctionData("upgradeToAndCall", [v4ImplAddress, "0x"]);

    // 3. Propose upgrade
    console.log("Creating upgrade proposal...");
    const description = "Upgrade to V4 for Asymmetric E2EE PKI support";
    const txPropose = await dao.propose(
        [proxyAddress],
        [0],
        [encodedCall],
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
    console.log("Upgrade Executed successfully! We are now on V4.");
}

main().catch(console.error);
