import { ethers } from 'ethers';
import * as sigUtilImport from '@metamask/eth-sig-util';
const sigUtil = sigUtilImport.default || sigUtilImport;

// Cache the deterministic key in memory so the user only signs once per session
let cachedSecretKey = null;

const SIGN_MESSAGE = "Sign this message to generate your secure E2EE key for Blockchain Drive.";

/**
 * Prompts the user to sign a deterministic message and derives a 32-byte secret key.
 * @param {ethers.Signer} signer - Ethers signer object
 * @returns {Promise<string>} The 32-byte secret key as a hex string (without '0x')
 */
export const getDeterministicKey = async (signer) => {
    if (cachedSecretKey) return cachedSecretKey;
    
    try {
        const signature = await signer.signMessage(SIGN_MESSAGE);
        // Hash the signature to get a deterministic 32-byte seed
        const hash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(signature));
        // Remove '0x' prefix for eth-sig-util compatibility
        cachedSecretKey = hash.slice(2);
        return cachedSecretKey;
    } catch (error) {
        console.error("Failed to generate deterministic key", error);
        throw new Error("You must sign the message to enable End-to-End Encryption.");
    }
};

/**
 * Derives the X25519 public key from the 32-byte secret key.
 * @param {string} secretKeyHex - 32-byte hex string (without 0x)
 * @returns {string} Base64 encoded public key
 */
export const derivePublicKey = (secretKeyHex) => {
    return sigUtil.getEncryptionPublicKey(secretKeyHex);
};

/**
 * Encrypts an AES key (or any data) using the receiver's public key.
 * @param {string} data - Data to encrypt
 * @param {string} publicKeyBase64 - Receiver's base64 public key
 * @returns {Promise<string>} Hex encoded string (with 0x prefix) of the encrypted JSON object
 */
export const encryptAESKey = async (data, publicKeyBase64) => {
    const encryptedObj = sigUtil.encrypt({
        publicKey: publicKeyBase64,
        data: data,
        version: 'x25519-xsalsa20-poly1305'
    });
    const bufferModule = await import('buffer');
    const Buffer = window.Buffer || bufferModule.Buffer;
    return "0x" + Buffer.from(JSON.stringify(encryptedObj), 'utf8').toString('hex');
};

/**
 * Decrypts an AES key using the user's secret key.
 * @param {string} encryptedDataHex - Hex string (with 0x) of the encrypted JSON
 * @param {string} secretKeyHex - User's 32-byte secret key hex (without 0x)
 * @returns {Promise<string>} Decrypted data
 */
export const decryptAESKey = async (encryptedDataHex, secretKeyHex) => {
    const bufferModule = await import('buffer');
    const Buffer = window.Buffer || bufferModule.Buffer;
    const jsonStr = Buffer.from(encryptedDataHex.replace('0x', ''), 'hex').toString('utf8');
    const encryptedObj = JSON.parse(jsonStr);
    
    return sigUtil.decrypt({
        encryptedData: encryptedObj,
        privateKey: secretKeyHex
    });
};
