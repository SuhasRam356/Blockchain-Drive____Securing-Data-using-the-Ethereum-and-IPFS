const sigUtil = require('@metamask/eth-sig-util');
const { ethers } = require('ethers');

// Simulate a deterministic 32-byte seed from a signature
const seedHex = ethers.utils.sha256(ethers.utils.toUtf8Bytes("Simulated signature 1234567890"));
// It must be passed as a Buffer or hex string without 0x or a Uint8Array depending on version. Let's try Buffer.
const seedBuffer = Buffer.from(seedHex.slice(2), 'hex');

console.log("Seed Buffer:", seedBuffer.length);

const pubKey = sigUtil.getEncryptionPublicKey(seedHex.slice(2));
console.log("Public Key (base64):", pubKey);

const message = "Secret AES Key";

const encrypted = sigUtil.encrypt({
    publicKey: pubKey,
    data: message,
    version: 'x25519-xsalsa20-poly1305'
});
console.log("Encrypted:", encrypted);

const decrypted = sigUtil.decrypt({
    encryptedData: encrypted,
    privateKey: seedHex.slice(2) // expects hex string without 0x
});

console.log("Decrypted:", decrypted);
