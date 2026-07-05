const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DriveDAO and DriveToken", function () {
  let driveToken;
  let driveDAO;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy DriveToken
    const DriveToken = await ethers.getContractFactory("DriveToken");
    driveToken = await DriveToken.deploy();
    await driveToken.waitForDeployment();

    // Deploy DriveDAO
    const DriveDAO = await ethers.getContractFactory("DriveDAO");
    driveDAO = await DriveDAO.deploy(await driveToken.getAddress());
    await driveDAO.waitForDeployment();
  });

  describe("Token Lifecycle", function () {
    it("Should mint tokens correctly", async function () {
      // Owner should have 1,000,000 tokens
      const ownerBalance = await driveToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(ethers.parseEther("1000000"));
    });

    it("Should allow transfers and delegation for voting power", async function () {
      // Transfer to user1
      await driveToken.transfer(user1.address, ethers.parseEther("1000"));
      
      // Before delegation, voting power is 0
      let votes = await driveToken.getVotes(user1.address);
      expect(votes).to.equal(0);

      // Delegate to self
      await driveToken.connect(user1).delegate(user1.address);

      // After delegation, voting power should match balance
      votes = await driveToken.getVotes(user1.address);
      expect(votes).to.equal(ethers.parseEther("1000"));
    });
  });

  describe("DAO Proposal Execution Failure (Malicious Upgrade)", function () {
    let mockMaliciousUpgrade;

    beforeEach(async function () {
      // Delegate owner's tokens to themselves to have voting power
      await driveToken.connect(owner).delegate(owner.address);
    });

    it("Should revert proposal execution gracefully without locking the DAO", async function () {
      // Create a dummy contract that doesn't implement UUPS correctly, or just use a random contract
      const MockContract = await ethers.getContractFactory("DriveToken"); 
      mockMaliciousUpgrade = await MockContract.deploy();
      await mockMaliciousUpgrade.waitForDeployment();
      
      const maliciousAddress = await mockMaliciousUpgrade.getAddress();

      // We need a proxy to target. Let's deploy a dummy UploadV5 proxy first
      const UploadV5 = await ethers.getContractFactory("UploadUpgradeableV5");
      const { upgrades } = require("hardhat");
      const proxy = await upgrades.deployProxy(UploadV5, [], { kind: 'uups' });
      await proxy.waitForDeployment();
      const proxyAddress = await proxy.getAddress();

      // Transfer proxy ownership to DAO
      await proxy.transferOwnership(await driveDAO.getAddress());

      // Prepare upgrade proposal data: proxy.upgradeToAndCall(maliciousAddress, "0x")
      const proxyInterface = new ethers.Interface(["function upgradeToAndCall(address,bytes)"]);
      const callData = proxyInterface.encodeFunctionData("upgradeToAndCall", [maliciousAddress, "0x"]);

      // Propose
      const targets = [proxyAddress];
      const values = [0];
      const calldatas = [callData];
      const description = "Malicious Upgrade Proposal";
      
      const tx = await driveDAO.propose(targets, values, calldatas, description);
      const receipt = await tx.wait();
      const proposalId = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === 'ProposalCreated'
      ).args[0];

      // Wait for voting delay (1 block)
      await time.advanceBlock();

      // Vote For (1)
      await driveDAO.castVote(proposalId, 1);

      // Wait for voting period (50400 blocks)
      // Hardhat network helper to mine many blocks
      await time.advanceBlock(50400 + 1); // 1 week + 1 block

      const descriptionHash = ethers.id(description);

      // No Timelock, so no queue step is needed. We proceed directly to execution.

      // Execution should REVERT because the malicious upgrade does not support UUPS 
      // or because DriveToken (the malicious upgrade) doesn't have the proxiableUUID
      await expect(
        driveDAO.execute(targets, values, calldatas, descriptionHash)
      ).to.be.reverted; 
      
      // The state of the DAO remains stable (proposal remains in succeeded state, not executed)
      const state = await driveDAO.state(proposalId);
      // 4 = Succeeded in Governor (IGovernor.ProposalState)
      expect(state).to.equal(4); 
    });
  });
});
