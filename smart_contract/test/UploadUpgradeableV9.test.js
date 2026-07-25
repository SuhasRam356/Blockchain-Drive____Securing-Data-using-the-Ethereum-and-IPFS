const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("UploadUpgradeableV9", function () {
    let upload;
    let owner;
    let alice;
    let bob;
    let charlie;
    let hacker;

    const HASH_A = "0x" + "a".repeat(64);
    const HASH_B = "0x" + "b".repeat(64);
    const HASH_C = "0x" + "c".repeat(64);
    const SIG_A = "0xaaaa";
    const SIG_B = "0xbbbb";
    const ZERO_HASH = ethers.ZeroHash;

    beforeEach(async function () {
        [owner, alice, bob, charlie, hacker] = await ethers.getSigners();

        const V9Factory = await ethers.getContractFactory("UploadUpgradeableV9");
        upload = await upgrades.deployProxy(V9Factory, [], { initializer: 'initialize', kind: 'uups' });
        await upload.waitForDeployment();
    });

    // =========================================================
    // SECTION 1: Core File Operations
    // =========================================================
    describe("1. Core File Operations", function () {
        it("should upload a file with E2EE and store all metadata correctly", async function () {
            await upload.connect(alice).addWithE2EE("ipfs://f1", "Documents", HASH_A, SIG_A, "EncKey1");

            const count = await upload.connect(alice).getFileCount(alice.address);
            expect(count).to.equal(1);

            expect(await upload.getFileHash(alice.address, "ipfs://f1")).to.equal(HASH_A);
            expect(await upload.getFileSignature(alice.address, "ipfs://f1")).to.equal(SIG_A);
            expect(await upload.getEncryptedAESKey(alice.address, "ipfs://f1")).to.equal("EncKey1");
        });

        it("should emit FileAdded and FileSigned events on upload", async function () {
            await expect(upload.connect(alice).addWithE2EE("ipfs://f1", "Docs", HASH_A, SIG_A, "Key1"))
                .to.emit(upload, "FileAdded").withArgs(alice.address, alice.address, "ipfs://f1", "Docs")
                .and.to.emit(upload, "FileSigned").withArgs(alice.address, "ipfs://f1", HASH_A);
        });

        it("should upload a file without E2EE (legacy add)", async function () {
            await upload.connect(alice).add("ipfs://legacy", "Photos");
            const count = await upload.connect(alice).getFileCount(alice.address);
            expect(count).to.equal(1);
        });

        it("should upload files in batch", async function () {
            await upload.connect(alice).addBatch(["ipfs://b1", "ipfs://b2", "ipfs://b3"], "Batch");
            const count = await upload.connect(alice).getFileCount(alice.address);
            expect(count).to.equal(3);
        });

        it("should upload files in batch with E2EE", async function () {
            await upload.connect(alice).addBatchWithE2EE(
                ["ipfs://be1", "ipfs://be2"],
                "Encrypted",
                [HASH_A, HASH_B],
                [SIG_A, SIG_B],
                ["Key1", "Key2"]
            );
            const count = await upload.connect(alice).getFileCount(alice.address);
            expect(count).to.equal(2);
            expect(await upload.getEncryptedAESKey(alice.address, "ipfs://be1")).to.equal("Key1");
            expect(await upload.getEncryptedAESKey(alice.address, "ipfs://be2")).to.equal("Key2");
        });

        it("should revert addBatchWithE2EE if array lengths mismatch", async function () {
            await expect(
                upload.connect(alice).addBatchWithE2EE(
                    ["ipfs://be1", "ipfs://be2"],
                    "Encrypted",
                    [HASH_A], // wrong length
                    [SIG_A, SIG_B],
                    ["Key1", "Key2"]
                )
            ).to.be.revertedWith("Arrays length mismatch");
        });

        it("should delete a file and emit FileDeleted event", async function () {
            await upload.connect(alice).addWithE2EE("ipfs://f1", "Docs", HASH_A, SIG_A, "Key1");
            await upload.connect(alice).addWithE2EE("ipfs://f2", "Docs", HASH_B, SIG_B, "Key2");

            await expect(upload.connect(alice).deleteFile("ipfs://f1"))
                .to.emit(upload, "FileDeleted").withArgs(alice.address, "ipfs://f1");

            const count = await upload.connect(alice).getFileCount(alice.address);
            expect(count).to.equal(1);
        });

        it("should handle deleting a file that does not exist (no-op)", async function () {
            await upload.connect(alice).addWithE2EE("ipfs://f1", "Docs", HASH_A, SIG_A, "Key1");
            await upload.connect(alice).deleteFile("ipfs://nonexistent");
            const count = await upload.connect(alice).getFileCount(alice.address);
            expect(count).to.equal(1);
        });
    });

    // =========================================================
    // SECTION 2: File Sending to Receiver
    // =========================================================
    describe("2. File Sending to Receiver", function () {
        it("should send a file to another user with E2EE", async function () {
            await upload.connect(alice).sendFileToReceiverWithE2EE(
                bob.address, "ipfs://shared1", "Shared", HASH_A, SIG_A, "SharedKey1"
            );

            const count = await upload.connect(bob).getFileCount(bob.address);
            expect(count).to.equal(1);
            expect(await upload.getEncryptedAESKey(bob.address, "ipfs://shared1")).to.equal("SharedKey1");
        });

        it("should emit FileAdded with correct sender (not receiver)", async function () {
            await expect(
                upload.connect(alice).sendFileToReceiverWithE2EE(
                    bob.address, "ipfs://shared1", "Shared", HASH_A, SIG_A, "Key1"
                )
            ).to.emit(upload, "FileAdded").withArgs(bob.address, alice.address, "ipfs://shared1", "Shared");
        });

        it("should REVERT when sending a file to yourself", async function () {
            await expect(
                upload.connect(alice).sendFileToReceiverWithE2EE(
                    alice.address, "ipfs://self", "Self", HASH_A, SIG_A, "Key1"
                )
            ).to.be.revertedWith("Use addWithE2EE() for your own files");
        });

        it("should send batch files to receiver with E2EE", async function () {
            await upload.connect(alice).sendFileToReceiverBatchWithE2EE(
                bob.address,
                ["ipfs://rb1", "ipfs://rb2"],
                "Batch",
                [HASH_A, HASH_B],
                [SIG_A, SIG_B],
                ["BKey1", "BKey2"]
            );
            const count = await upload.connect(bob).getFileCount(bob.address);
            expect(count).to.equal(2);
        });

        it("should REVERT batch send to self", async function () {
            await expect(
                upload.connect(alice).sendFileToReceiverBatchWithE2EE(
                    alice.address, ["ipfs://f1"], "Cat", [HASH_A], [SIG_A], ["K1"]
                )
            ).to.be.revertedWith("Use addBatchWithE2EE() for your own files");
        });
    });

    // =========================================================
    // SECTION 3: Access Control (allow / disallow / time-lock)
    // =========================================================
    describe("3. Access Control", function () {
        beforeEach(async function () {
            await upload.connect(alice).addWithE2EE("ipfs://f1", "Docs", HASH_A, SIG_A, "Key1");
        });

        it("should grant access to another user", async function () {
            await upload.connect(alice).allow(bob.address, 0);
            expect(await upload.ownership(alice.address, bob.address)).to.be.true;
        });

        it("should emit AccessGranted event", async function () {
            await expect(upload.connect(alice).allow(bob.address, 60))
                .to.emit(upload, "AccessGranted").withArgs(alice.address, bob.address, 60);
        });

        it("should PREVENT self-sharing", async function () {
            await expect(
                upload.connect(alice).allow(alice.address, 0)
            ).to.be.revertedWith("Cannot share with yourself");
        });

        it("should allow shared user to view files", async function () {
            await upload.connect(alice).allow(bob.address, 0);
            const files = await upload.connect(bob).display(alice.address);
            expect(files.length).to.equal(1);
            expect(files[0].url).to.equal("ipfs://f1");
        });

        it("should PREVENT unauthorized user from viewing files", async function () {
            await expect(
                upload.connect(hacker).display(alice.address)
            ).to.be.revertedWith("You don't have access");
        });

        it("should revoke access and emit AccessRevoked event", async function () {
            await upload.connect(alice).allow(bob.address, 0);
            await expect(upload.connect(alice).disallow(bob.address))
                .to.emit(upload, "AccessRevoked").withArgs(alice.address, bob.address);

            await expect(
                upload.connect(bob).display(alice.address)
            ).to.be.revertedWith("You don't have access");
        });

        it("should REVERT revoking access from user who never had access", async function () {
            await expect(
                upload.connect(alice).disallow(charlie.address)
            ).to.be.revertedWith("User does not have access");
        });

        it("should enforce time-locked access expiry", async function () {
            await upload.connect(alice).allow(bob.address, 1);
            const files = await upload.connect(bob).display(alice.address);
            expect(files.length).to.equal(1);

            await ethers.provider.send("evm_increaseTime", [120]);
            await ethers.provider.send("evm_mine");

            await expect(
                upload.connect(bob).display(alice.address)
            ).to.be.revertedWith("You don't have access");
        });

        it("should correctly enumerate access list via shareAccess()", async function () {
            await upload.connect(alice).allow(bob.address, 0);
            await upload.connect(alice).allow(charlie.address, 0);

            const accessList = await upload.connect(alice).shareAccess();
            expect(accessList.length).to.equal(2);
            expect(accessList[0].access).to.be.true;
            expect(accessList[1].access).to.be.true;
        });

        it("should perform O(1) removal correctly (swap-and-pop)", async function () {
            await upload.connect(alice).allow(bob.address, 0);
            await upload.connect(alice).allow(charlie.address, 0);

            await upload.connect(alice).disallow(bob.address);

            const accessList = await upload.connect(alice).shareAccess();
            expect(accessList.length).to.equal(1);
            expect(accessList[0].user).to.equal(charlie.address);
        });
    });

    // =========================================================
    // SECTION 4: File Key Sharing (_ownsFile access control)
    // =========================================================
    describe("4. File Key Sharing (shareFileKeysForUser)", function () {
        const HASH_1 = "0x" + "1".repeat(64);

        beforeEach(async function () {
            await upload.connect(alice).addWithE2EE("ipfs://f1", "Docs", HASH_1, "0x1111", "AliceKey1");
        });

        it("should allow owner to share file keys", async function () {
            await upload.connect(alice).shareFileKeysForUser(bob.address, ["ipfs://f1"], ["SharedBobKey"]);
            expect(await upload.getSharedEncryptedAESKey(alice.address, "ipfs://f1", bob.address)).to.equal("SharedBobKey");
        });

        it("should PREVENT non-owner from sharing file keys", async function () {
            await expect(
                upload.connect(hacker).shareFileKeysForUser(bob.address, ["ipfs://f1"], ["Garbage"])
            ).to.be.revertedWith("Not owner of file");
        });

        it("should allow owner to share keys with multiple users at once", async function () {
            await upload.connect(alice).shareFileKeysForMultipleUsers(
                "ipfs://f1", [bob.address, charlie.address], ["BobKey", "CharlieKey"]
            );
            expect(await upload.getSharedEncryptedAESKey(alice.address, "ipfs://f1", bob.address)).to.equal("BobKey");
            expect(await upload.getSharedEncryptedAESKey(alice.address, "ipfs://f1", charlie.address)).to.equal("CharlieKey");
        });

        it("should PREVENT non-owner from shareFileKeysForMultipleUsers", async function () {
            await expect(
                upload.connect(hacker).shareFileKeysForMultipleUsers(
                    "ipfs://f1", [bob.address], ["Garbage"]
                )
            ).to.be.revertedWith("Not owner of file");
        });
    });

    // =========================================================
    // SECTION 5: V9 Storage Isolation (Mapping Collision Fix)
    // =========================================================
    describe("5. V9 Storage Isolation (Anti-Collision)", function () {
        it("should isolate state when two users upload identical CIDs", async function () {
            const cid = "ipfs://identicalCID";
            await upload.connect(alice).addWithE2EE(cid, "Docs", HASH_A, SIG_A, "AES_Alice");
            await upload.connect(bob).addWithE2EE(cid, "Images", HASH_B, SIG_B, "AES_Bob");

            expect(await upload.getEncryptedAESKey(alice.address, cid)).to.equal("AES_Alice");
            expect(await upload.getEncryptedAESKey(bob.address, cid)).to.equal("AES_Bob");

            expect(await upload.getFileHash(alice.address, cid)).to.equal(HASH_A);
            expect(await upload.getFileHash(bob.address, cid)).to.equal(HASH_B);
        });

        it("should isolate shared keys across different owners with same CID", async function () {
            const cid = "ipfs://identicalCID";
            await upload.connect(alice).addWithE2EE(cid, "Docs", HASH_A, SIG_A, "AES_Alice");
            await upload.connect(bob).addWithE2EE(cid, "Images", HASH_B, SIG_B, "AES_Bob");

            await upload.connect(alice).shareFileKeysForUser(charlie.address, [cid], ["AliceShared"]);
            await upload.connect(bob).shareFileKeysForUser(charlie.address, [cid], ["BobShared"]);

            expect(await upload.getSharedEncryptedAESKey(alice.address, cid, charlie.address)).to.equal("AliceShared");
            expect(await upload.getSharedEncryptedAESKey(bob.address, cid, charlie.address)).to.equal("BobShared");
        });
    });

    // =========================================================
    // SECTION 6: File Versioning (updateFile)
    // =========================================================
    describe("6. File Versioning", function () {
        beforeEach(async function () {
            await upload.connect(alice).addWithE2EE("ipfs://v1", "Docs", HASH_A, SIG_A, "Key_V1");
        });

        it("should update a file and emit FileUpdated event", async function () {
            await expect(
                upload.connect(alice).updateFile("ipfs://v1", "ipfs://v2", HASH_B, SIG_B, "Key_V2")
            ).to.emit(upload, "FileUpdated").withArgs(alice.address, "ipfs://v1", "ipfs://v2");
        });

        it("should track version history correctly", async function () {
            await upload.connect(alice).updateFile("ipfs://v1", "ipfs://v2", HASH_B, SIG_B, "Key_V2");
            
            const history = await upload.getFileHistory(alice.address, "ipfs://v2");
            expect(history.length).to.equal(2);
            expect(history[0].url).to.equal("ipfs://v1");
            expect(history[1].url).to.equal("ipfs://v2");
        });

        it("should REVERT update if file does not exist", async function () {
            await expect(
                upload.connect(alice).updateFile("ipfs://nonexistent", "ipfs://v2", HASH_B, SIG_B, "Key_V2")
            ).to.be.revertedWith("File not found");
        });

        it("should PREVENT another user from updating Alice's file", async function () {
            await expect(
                upload.connect(hacker).updateFile("ipfs://v1", "ipfs://v2", HASH_B, SIG_B, "Key_V2")
            ).to.be.revertedWith("File not found");
        });

        it("should store new metadata for the updated file", async function () {
            await upload.connect(alice).updateFile("ipfs://v1", "ipfs://v2", HASH_B, SIG_B, "Key_V2");

            expect(await upload.getFileHash(alice.address, "ipfs://v2")).to.equal(HASH_B);
            expect(await upload.getEncryptedAESKey(alice.address, "ipfs://v2")).to.equal("Key_V2");
        });
    });

    // =========================================================
    // SECTION 7: E2EE Public Key Infrastructure
    // =========================================================
    describe("7. E2EE PKI (setEncryptionPublicKey)", function () {
        it("should set encryption public key with valid signature and emit event", async function () {
            const pubKey = "TestPublicKey123";
            const nonce = await upload.encryptionKeyNonces(alice.address);
            const message = "Confirm E2EE Public Key: " + pubKey + " Nonce: " + nonce.toString();
            const signature = await alice.signMessage(message);

            await expect(upload.connect(alice).setEncryptionPublicKey(pubKey, signature))
                .to.emit(upload, "PublicKeyPublished").withArgs(alice.address, pubKey);

            expect(await upload.encryptionPublicKeys(alice.address)).to.equal(pubKey);
        });

        it("should increment nonce after setting key (replay protection)", async function () {
            const pubKey = "Key1";
            const nonce0 = await upload.encryptionKeyNonces(alice.address);
            const message = "Confirm E2EE Public Key: " + pubKey + " Nonce: " + nonce0.toString();
            const signature = await alice.signMessage(message);

            await upload.connect(alice).setEncryptionPublicKey(pubKey, signature);

            const nonce1 = await upload.encryptionKeyNonces(alice.address);
            expect(nonce1).to.equal(nonce0 + 1n);
        });

        it("should REVERT if signature is from a different account", async function () {
            const pubKey = "TestKey";
            const nonce = await upload.encryptionKeyNonces(alice.address);
            const message = "Confirm E2EE Public Key: " + pubKey + " Nonce: " + nonce.toString();
            const signature = await hacker.signMessage(message);

            await expect(
                upload.connect(alice).setEncryptionPublicKey(pubKey, signature)
            ).to.be.revertedWith("Invalid signature: signer does not match sender");
        });

        it("should REVERT replay of an old signature (wrong nonce)", async function () {
            const pubKey1 = "Key1";
            const nonce0 = await upload.encryptionKeyNonces(alice.address);
            const message1 = "Confirm E2EE Public Key: " + pubKey1 + " Nonce: " + nonce0.toString();
            const sig1 = await alice.signMessage(message1);

            await upload.connect(alice).setEncryptionPublicKey(pubKey1, sig1);

            await expect(
                upload.connect(alice).setEncryptionPublicKey(pubKey1, sig1)
            ).to.be.revertedWith("Invalid signature: signer does not match sender");
        });
    });

    // =========================================================
    // SECTION 8: Emergency Pausability
    // =========================================================
    describe("8. Emergency Pausability", function () {
        it("should allow owner to pause and block all state-changing operations", async function () {
            await upload.connect(owner).pause();

            await expect(
                upload.connect(alice).addWithE2EE("ipfs://f1", "D", HASH_A, SIG_A, "K")
            ).to.be.revertedWithCustomError(upload, "EnforcedPause");

            await expect(
                upload.connect(alice).add("ipfs://f1", "D")
            ).to.be.revertedWithCustomError(upload, "EnforcedPause");

            await expect(
                upload.connect(alice).allow(bob.address, 0)
            ).to.be.revertedWithCustomError(upload, "EnforcedPause");

            await expect(
                upload.connect(alice).deleteFile("ipfs://f1")
            ).to.be.revertedWithCustomError(upload, "EnforcedPause");
        });

        it("should ONLY allow the owner to pause", async function () {
            await expect(
                upload.connect(alice).pause()
            ).to.be.revertedWithCustomError(upload, "OwnableUnauthorizedAccount");
        });

        it("should resume operations after unpausing", async function () {
            await upload.connect(owner).pause();
            await upload.connect(owner).unpause();

            await expect(
                upload.connect(alice).addWithE2EE("ipfs://f1", "Docs", HASH_A, SIG_A, "Key1")
            ).to.not.be.reverted;
        });
    });

    // =========================================================
    // SECTION 9: Pagination (displayPage)
    // =========================================================
    describe("9. Pagination", function () {
        beforeEach(async function () {
            for (let i = 0; i < 5; i++) {
                await upload.connect(alice).add(`ipfs://page${i}`, "Docs");
            }
        });

        it("should return correct page of files", async function () {
            const page = await upload.connect(alice).displayPage(alice.address, 0, 2);
            expect(page.length).to.equal(2);
            expect(page[0].url).to.equal("ipfs://page0");
            expect(page[1].url).to.equal("ipfs://page1");
        });

        it("should return empty array if offset exceeds total files", async function () {
            const page = await upload.connect(alice).displayPage(alice.address, 100, 10);
            expect(page.length).to.equal(0);
        });

        it("should clamp the page size to remaining files", async function () {
            const page = await upload.connect(alice).displayPage(alice.address, 3, 100);
            expect(page.length).to.equal(2);
        });
    });

    // =========================================================
    // SECTION 10: UUPS Upgrade Authorization
    // =========================================================
    describe("10. UUPS Upgrade Authorization", function () {
        it("should ONLY allow the owner to authorize upgrades", async function () {
            const V9Factory = await ethers.getContractFactory("UploadUpgradeableV9");
            const newImpl = await V9Factory.deploy();
            await newImpl.waitForDeployment();

            await expect(
                upload.connect(hacker).upgradeToAndCall(await newImpl.getAddress(), "0x")
            ).to.be.revertedWithCustomError(upload, "OwnableUnauthorizedAccount");
        });
    });

    // =========================================================
    // SECTION 11: O(1) Ownership After Delete (Stale-File Guard)
    // =========================================================
    describe("11. Stale-File Sharing Guard (Fix #3)", function () {
        const HASH_1 = "0x" + "1".repeat(64);

        it("should PREVENT sharing keys for a deleted file", async function () {
            await upload.connect(alice).addWithE2EE("ipfs://f1", "Docs", HASH_1, "0x1111", "Key1");

            // Alice deletes the file
            await upload.connect(alice).deleteFile("ipfs://f1");

            // Alice tries to share keys for the deleted file → should revert
            await expect(
                upload.connect(alice).shareFileKeysForUser(bob.address, ["ipfs://f1"], ["SharedKey"])
            ).to.be.revertedWith("Not owner of file");
        });

        it("should PREVENT sharing keys for a file that was never uploaded", async function () {
            await expect(
                upload.connect(alice).shareFileKeysForUser(bob.address, ["ipfs://ghost"], ["Key"])
            ).to.be.revertedWith("Not owner of file");
        });

        it("should allow sharing keys for an updated file (new URL)", async function () {
            await upload.connect(alice).addWithE2EE("ipfs://v1", "Docs", HASH_1, "0x1111", "Key_V1");
            await upload.connect(alice).updateFile("ipfs://v1", "ipfs://v2", HASH_A, SIG_A, "Key_V2");

            // Old URL ownership should be revoked
            await expect(
                upload.connect(alice).shareFileKeysForUser(bob.address, ["ipfs://v1"], ["OldKey"])
            ).to.be.revertedWith("Not owner of file");

            // New URL ownership should be active
            await upload.connect(alice).shareFileKeysForUser(bob.address, ["ipfs://v2"], ["NewKey"]);
            expect(await upload.getSharedEncryptedAESKey(alice.address, "ipfs://v2", bob.address)).to.equal("NewKey");
        });
    });

    // =========================================================
    // SECTION 12: O(1) Ownership Consistency
    // =========================================================
    describe("12. O(1) Ownership Consistency", function () {
        it("should maintain ownership for all add variants", async function () {
            // add()
            await upload.connect(alice).add("ipfs://a1", "Cat");
            // addWithSignature()
            await upload.connect(alice).addWithSignature("ipfs://a2", "Cat", HASH_A, SIG_A);
            // addWithE2EE()
            await upload.connect(alice).addWithE2EE("ipfs://a3", "Cat", HASH_B, SIG_B, "Key");

            // All should be owned
            // Verify by trying to share keys (only works if _ownsFile returns true)
            await upload.connect(alice).shareFileKeysForUser(bob.address, ["ipfs://a1"], ["K1"]);
            await upload.connect(alice).shareFileKeysForUser(bob.address, ["ipfs://a2"], ["K2"]);
            await upload.connect(alice).shareFileKeysForUser(bob.address, ["ipfs://a3"], ["K3"]);
        });

        it("should maintain ownership for receiver-sent files", async function () {
            await upload.connect(alice).sendFileToReceiverWithE2EE(
                bob.address, "ipfs://sent1", "Cat", HASH_A, SIG_A, "Key"
            );

            // Bob (the receiver) should own it
            await upload.connect(bob).shareFileKeysForUser(charlie.address, ["ipfs://sent1"], ["SharedKey"]);

            // Alice (the sender) should NOT own it
            await expect(
                upload.connect(alice).shareFileKeysForUser(charlie.address, ["ipfs://sent1"], ["Hack"])
            ).to.be.revertedWith("Not owner of file");
        });
    });
});
