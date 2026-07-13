import { ethers } from 'ethers';
import * as sigUtilImport from '@metamask/eth-sig-util';
const sigUtil = sigUtilImport.default || sigUtilImport;

// Cache the deterministic key in memory so the user only signs once per session
let cachedSecretKey = null;

/**
 * Derives a 32-byte secret key using PBKDF2 from a master password.
 * @param {string} password - User provided master password
 * @param {string} address - User's wallet address (used for domain separation / salt)
 * @returns {Promise<string>} The 32-byte secret key as a hex string (without '0x')
 */
export const getDeterministicKey = async (password, address) => {
    if (cachedSecretKey) return cachedSecretKey;
    
    if (!password) {
        throw new Error("Master password is required for E2EE.");
    }
    
    try {
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );
        
        const salt = encoder.encode("BlockchainDrive_E2EE_" + address.toLowerCase());
        
        const derivedBits = await window.crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            256
        );
        
        const hashArray = Array.from(new Uint8Array(derivedBits));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        cachedSecretKey = hashHex;
        return cachedSecretKey;
    } catch (error) {
        console.error("Failed to generate deterministic key", error);
        throw new Error("Failed to derive E2EE key from password.");
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
