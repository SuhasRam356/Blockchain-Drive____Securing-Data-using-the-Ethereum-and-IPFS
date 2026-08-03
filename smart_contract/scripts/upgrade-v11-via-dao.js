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

    // 0. Deploy the Groth16Verifier
    console.log("Deploying Groth16Verifier...");
    const VerifierFactory = await ethers.getContractFactory("Groth16Verifier");
    const verifier = await VerifierFactory.deploy();
    await verifier.waitForDeployment(); // Ethers v6
    const verifierAddr = await verifier.getAddress();
    console.log("Groth16Verifier deployed to:", verifierAddr);

    // 1. Deploy V11 implementation
    console.log("Deploying V11 implementation...");
    const V11 = await ethers.getContractFactory("UploadUpgradeableV11");
    const v11Impl = await V11.deploy();
    await v11Impl.waitForDeployment();
    const v11Addr = await v11Impl.getAddress();
    console.log("V11 Implementation address:", v11Addr);

    // 1.5 Ensure Voting Power
    console.log("Delegating tokens to self to activate voting power...");
    const delegateTx = await token.delegate(deployer.address);
    await delegateTx.wait();

    // 2. Propose Upgrade
    console.log("Creating DAO Proposal to upgrade proxy to V11...");
    const abiCoder = new ethers.AbiCoder(); // Ethers v6
    
    // We are calling upgradeToAndCall(address, bytes) on the proxy, wait, UUPS uses upgradeTo
    const upgradeData = V11.interface.encodeFunctionData("upgradeToAndCall", [v11Addr, "0x"]);
    
    const proposeTx = await dao.propose(
        [proxyAddress], 
        [0], 
        [upgradeData], 
        "Upgrade to V11: Integrate Zero-Knowledge Proofs (ZKP)"
    );
    const proposeReceipt = await proposeTx.wait();
    
    // Extract proposalId
    const proposalEvent = proposeReceipt.logs.find(log => {
        try {
            return dao.interface.parseLog(log).name === 'ProposalCreated';
        } catch(e) { return false; }
    });
    const proposalId = dao.interface.parseLog(proposalEvent).args.proposalId;
    console.log("Proposal ID:", proposalId.toString());

    // Wait for voting delay (1 block)
    console.log("Waiting for 1 block to pass votingDelay...");
    await new Promise(r => setTimeout(r, 15000)); // Sleep 15s for Sepolia block time

    // 3. Vote Yes
    console.log("Voting YES...");
    const voteTx = await dao.castVote(proposalId, 1); // 1 = For
    await voteTx.wait();

    // 4. Advance time so voting period ends
    console.log("Waiting for voting period to end...");
    await new Promise(r => setTimeout(r, 60000)); // Sleep 60s for Sepolia

    // 5. Execute Proposal
    console.log("Executing Upgrade Proposal...");
    const descriptionHash = ethers.id("Upgrade to V11: Integrate Zero-Knowledge Proofs (ZKP)");
    await dao.execute([proxyAddress], [0], [upgradeData], descriptionHash);
    
    console.log("Upgrade successful! Proxy is now running V11 logic.");

    // 6. Set Verifier Address (DAO is owner, so we have to propose this too)
    console.log("Proposing to set ZKP Verifier address...");
    const setVerifierData = V11.interface.encodeFunctionData("setZkpVerifierAddress", [verifierAddr]);
    const proposeTx2 = await dao.propose(
        [proxyAddress],
        [0],
        [setVerifierData],
        "Set ZKP Verifier Address to " + verifierAddr
    );
    const proposeReceipt2 = await proposeTx2.wait();
    
    const proposalEvent2 = proposeReceipt2.logs.find(log => {
        try { return dao.interface.parseLog(log).name === 'ProposalCreated'; } catch(e) { return false; }
    });
    const proposalId2 = dao.interface.parseLog(proposalEvent2).args.proposalId;
    
    console.log("Waiting for voting delay...");
    await new Promise(r => setTimeout(r, 15000));
    
    const voteTx2 = await dao.castVote(proposalId2, 1);
    await voteTx2.wait();
    
    console.log("Waiting for voting period...");
    await new Promise(r => setTimeout(r, 60000));
    
    const descriptionHash2 = ethers.id("Set ZKP Verifier Address to " + verifierAddr);
    await dao.execute([proxyAddress], [0], [setVerifierData], descriptionHash2);
    console.log("ZKP Verifier Address set successfully!");
}

main().catch(console.error);
