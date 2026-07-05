const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("UploadUpgradeableV5", function () {
  let upload;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const UploadV5 = await ethers.getContractFactory("UploadUpgradeableV5");
    
    // We can deploy directly as proxy for testing V5 logic since the logic doesn't strictly depend on prior states for these tests
    upload = await upgrades.deployProxy(UploadV5, [], { kind: 'uups' });
    await upload.waitForDeployment();
  });

  describe("Access Expiry Edge Cases", function () {
    it("Should grant access and deny it exactly at expiry", async function () {
      await upload.connect(owner).add("ipfs://file1", "Docs");
      
      // Grant 10 minutes access
      await upload.connect(owner).allow(user1.address, 10);
      
      const currentTime = await time.latest();
      const expiry = currentTime + 10 * 60; // 10 minutes
      
      // Fast forward to exactly expiry
      await time.increaseTo(expiry);

      // Contract logic: accessExpiry[_user][msg.sender] > block.timestamp
      // So at exactly the expiry, access should be denied
      await expect(upload.connect(user1).display(owner.address))
        .to.be.revertedWith("You don't have access");
    });

    it("Should deny access after expiry", async function () {
      await upload.connect(owner).add("ipfs://file1", "Docs");
      await upload.connect(owner).allow(user1.address, 5); // 5 minutes
      
      // Fast forward 6 minutes
      await time.increase(6 * 60);

      await expect(upload.connect(user1).display(owner.address))
        .to.be.revertedWith("You don't have access");
    });

    it("Should allow perpetual access with zero duration", async function () {
      await upload.connect(owner).add("ipfs://file1", "Docs");
      await upload.connect(owner).allow(user1.address, 0); // 0 minutes = no expiry
      
      // Fast forward 1 year
      await time.increase(365 * 24 * 60 * 60);

      const files = await upload.connect(user1).display(owner.address);
      expect(files.length).to.equal(1);
      expect(files[0].url).to.equal("ipfs://file1");
    });
  });

  describe("updateFile Edge Cases", function () {
    it("Should revert when trying to update a previously deleted URL", async function () {
      await upload.connect(owner).add("ipfs://file1", "Docs");
      
      // Delete the file
      await upload.connect(owner).deleteFile("ipfs://file1");

      const fileHash = ethers.encodeBytes32String("hash");
      const signature = ethers.hexlify(ethers.randomBytes(65));
      const encryptedKey = "encryptedKey123";

      // Attempt to update the deleted file
      await expect(
        upload.connect(owner).updateFile("ipfs://file1", "ipfs://file2", fileHash, signature, encryptedKey)
      ).to.be.revertedWith("File not found");
    });
  });

  describe("getFileHistory Edge Cases", function () {
    it("Should return a single version with timestamp 0 for a never-updated file", async function () {
      await upload.connect(owner).add("ipfs://file1", "Docs");
      
      const history = await upload.getFileHistory("ipfs://file1");
      expect(history.length).to.equal(1);
      expect(history[0].url).to.equal("ipfs://file1");
      expect(history[0].timestamp).to.equal(0);
    });
  });

  describe("Publish Public Key Overwrite", function () {
    it("Should correctly overwrite an existing public key", async function () {
      await upload.connect(owner).setEncryptionPublicKey("KeyA");
      expect(await upload.encryptionPublicKeys(owner.address)).to.equal("KeyA");

      // Overwrite
      await upload.connect(owner).setEncryptionPublicKey("KeyB");
      expect(await upload.encryptionPublicKeys(owner.address)).to.equal("KeyB");
    });
  });

  describe("Batch Functions with Empty Arrays", function () {
    it("Should succeed but add no files for empty addBatch", async function () {
      await expect(upload.connect(owner).addBatch([], "EmptyCategory"))
        .to.not.be.reverted;
        
      const files = await upload.connect(owner).display(owner.address);
      expect(files.length).to.equal(0);
    });

    it("Should succeed but add no files for empty sendFileToReceiverBatch", async function () {
      await expect(upload.connect(owner).sendFileToReceiverBatch(user1.address, [], "EmptyCategory"))
        .to.not.be.reverted;
        
      const files = await upload.connect(user1).display(user1.address);
      expect(files.length).to.equal(0);
    });
  });
});
