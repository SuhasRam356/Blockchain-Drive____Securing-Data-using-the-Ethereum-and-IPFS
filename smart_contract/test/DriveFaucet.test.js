const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DriveFaucet", function () {
    let driveToken;
    let driveFaucet;
    let owner;
    let user1;
    let user2;

    const claimAmount = ethers.parseEther("100");
    const cooldownTime = 24 * 60 * 60; // 24 hours
    const fundAmount = ethers.parseEther("500000");

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy Token
        const DriveToken = await ethers.getContractFactory("DriveToken");
        driveToken = await DriveToken.deploy();
        await driveToken.waitForDeployment();
        const tokenAddress = await driveToken.getAddress();

        // Deploy Faucet
        const DriveFaucet = await ethers.getContractFactory("DriveFaucet");
        driveFaucet = await DriveFaucet.deploy(tokenAddress, claimAmount, cooldownTime);
        await driveFaucet.waitForDeployment();

        // Fund Faucet
        await driveToken.transfer(await driveFaucet.getAddress(), fundAmount);
    });

    it("Should dispense tokens to a user", async function () {
        await driveFaucet.connect(user1).requestTokens();
        
        const balance = await driveToken.balanceOf(user1.address);
        expect(balance).to.equal(claimAmount);
    });

    it("Should reject requests during the cooldown period", async function () {
        await driveFaucet.connect(user1).requestTokens();
        
        await expect(driveFaucet.connect(user1).requestTokens()).to.be.revertedWith(
            "Cooldown period has not elapsed"
        );
    });

    it("Should allow requests after the cooldown period", async function () {
        await driveFaucet.connect(user1).requestTokens();
        
        // Fast forward 24 hours + 1 second
        await time.increase(cooldownTime + 1);

        await expect(driveFaucet.connect(user1).requestTokens()).to.not.be.reverted;
        const balance = await driveToken.balanceOf(user1.address);
        expect(balance).to.equal(claimAmount * 2n); // Note: using 2n for BigInt multiplication
    });
});
