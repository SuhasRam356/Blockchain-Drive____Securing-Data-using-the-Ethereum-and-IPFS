const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("UploadUpgradeableV6", function () {
  let upload;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const UploadV6 = await ethers.getContractFactory("UploadUpgradeableV6");
    
    // We can deploy directly as proxy for testing V6 logic
    upload = await upgrades.deployProxy(UploadV6, [], { kind: 'uups' });
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

  describe("Publish Public Key Overwrite (E2EE V6 Signature Verification)", function () {
    it("Should successfully verify signature and set public key", async function () {
      const pubKey = "KeyA";
      const nonceA = await upload.encryptionKeyNonces(owner.address);
      const message = `Confirm E2EE Public Key: ${pubKey} Nonce: ${nonceA}`;
      const signature = await owner.signMessage(message);

      await upload.connect(owner).setEncryptionPublicKey(pubKey, signature);
      expect(await upload.encryptionPublicKeys(owner.address)).to.equal(pubKey);
      expect(await upload.encryptionKeyNonces(owner.address)).to.equal(nonceA + 1n);

      // Overwrite
      const pubKeyB = "KeyB";
      const nonceB = await upload.encryptionKeyNonces(owner.address);
      const messageB = `Confirm E2EE Public Key: ${pubKeyB} Nonce: ${nonceB}`;
      const signatureB = await owner.signMessage(messageB);

      await upload.connect(owner).setEncryptionPublicKey(pubKeyB, signatureB);
      expect(await upload.encryptionPublicKeys(owner.address)).to.equal(pubKeyB);
    });

    it("Should revert if signature is invalid or belongs to someone else", async function () {
      const pubKey = "KeyC";
      const nonceC = await upload.encryptionKeyNonces(owner.address);
      const message = `Confirm E2EE Public Key: ${pubKey} Nonce: ${nonceC}`;
      // Malicious user1 signs the message for owner's transaction
      const invalidSignature = await user1.signMessage(message);

      await expect(
        upload.connect(owner).setEncryptionPublicKey(pubKey, invalidSignature)
      ).to.be.revertedWith("Invalid signature: signer does not match sender");
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
