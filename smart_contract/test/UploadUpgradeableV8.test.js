const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("UploadUpgradeableV8", function () {
    let uploadV8;
    let owner;
    let alice;
    let bob;
    let hacker;

    beforeEach(async function () {
        [owner, alice, bob, hacker] = await ethers.getSigners();

        const UploadV8Factory = await ethers.getContractFactory("UploadUpgradeableV8");
        // Deploying as an upgradeable contract
        uploadV8 = await upgrades.deployProxy(UploadV8Factory, [], { initializer: 'initialize', kind: 'uups' });
        await uploadV8.waitForDeployment();
    });

    describe("Happy Path: File Uploading & Sharing", function () {
        const hash1 = "0x1111111111111111111111111111111111111111111111111111111111111111";
        const sig1 = "0x1111";
        
        it("should allow a user to upload a file and fetch the encrypted AES key", async function () {
            await uploadV8.connect(alice).addWithE2EE("ipfs://file1", "Docs", hash1, sig1, "AESKey1");
            
            expect(await uploadV8.getFileHash(alice.address, "ipfs://file1")).to.equal(hash1);
            expect(await uploadV8.getFileSignature(alice.address, "ipfs://file1")).to.equal(sig1);
            expect(await uploadV8.getEncryptedAESKey(alice.address, "ipfs://file1")).to.equal("AESKey1");
            
            const fileCount = await uploadV8.connect(alice).getFileCount(alice.address);
            expect(fileCount).to.equal(1);
        });

        it("should allow a user to share a file and the receiver to fetch the shared key", async function () {
            await uploadV8.connect(alice).addWithE2EE("ipfs://file1", "Docs", hash1, sig1, "AESKey1");
            
            // Alice shares with Bob
            await uploadV8.connect(alice).shareFileKeysForUser(bob.address, ["ipfs://file1"], ["SharedBobAES"]);
            
            expect(await uploadV8.getSharedEncryptedAESKey(alice.address, "ipfs://file1", bob.address)).to.equal("SharedBobAES");
        });
    });

    describe("Security Fix 1: Access Control on Sharing", function () {
        const hash1 = "0x" + "1".repeat(64);
        const sig1 = "0x1111";
        
        it("should PREVENT a hacker from overwriting Alice's shared keys for Bob", async function () {
            await uploadV8.connect(alice).addWithE2EE("ipfs://file1", "Docs", hash1, sig1, "AESKey1");
            await uploadV8.connect(alice).shareFileKeysForUser(bob.address, ["ipfs://file1"], ["SharedBobAES"]);

            // Hacker tries to overwrite Bob's shared key for Alice's file
            await expect(
                uploadV8.connect(hacker).shareFileKeysForUser(bob.address, ["ipfs://file1"], ["GarbageKey"])
            ).to.be.revertedWith("Not owner of file");

            // Bob's key should remain uncorrupted
            expect(await uploadV8.getSharedEncryptedAESKey(alice.address, "ipfs://file1", bob.address)).to.equal("SharedBobAES");
        });
    });

    describe("Security Fix 2: Mapping Collisions", function () {
        const hashA = "0x" + "a".repeat(64);
        const sigA = "0xaaaa";
        const hashB = "0x" + "b".repeat(64);
        const sigB = "0xbbbb";
        
        it("should isolate state when Alice and Bob upload identical IPFS CIDs", async function () {
            const sharedCID = "ipfs://identicalCID";
            
            await uploadV8.connect(alice).addWithE2EE(sharedCID, "Docs", hashA, sigA, "AES_A");
            await uploadV8.connect(bob).addWithE2EE(sharedCID, "Images", hashB, sigB, "AES_B");

            // Fetching Alice's keys
            expect(await uploadV8.getEncryptedAESKey(alice.address, sharedCID)).to.equal("AES_A");
            
            // Fetching Bob's keys
            expect(await uploadV8.getEncryptedAESKey(bob.address, sharedCID)).to.equal("AES_B");
        });
    });

    describe("Security Fix 3: Emergency Pausability", function () {
        const hash1 = "0x" + "1".repeat(64);
        const sig1 = "0x1111";
        
        it("should allow owner to pause and prevent file uploads", async function () {
            await uploadV8.connect(owner).pause();
            
            await expect(
                uploadV8.connect(alice).addWithE2EE("ipfs://file1", "Docs", hash1, sig1, "AESKey1")
            ).to.be.revertedWithCustomError(uploadV8, "EnforcedPause");
        });

        it("should not allow non-owners to pause the contract", async function () {
            // OpenZeppelin v5 uses Custom Errors for Ownable
            await expect(
                uploadV8.connect(alice).pause()
            ).to.be.revertedWithCustomError(uploadV8, "OwnableUnauthorizedAccount");
        });

        it("should allow uploads again after unpausing", async function () {
            await uploadV8.connect(owner).pause();
            await uploadV8.connect(owner).unpause();
            
            await expect(
                uploadV8.connect(alice).addWithE2EE("ipfs://file1", "Docs", hash1, sig1, "AESKey1")
            ).to.not.be.reverted;
        });
    });
});
