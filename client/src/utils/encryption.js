import { ethers } from 'ethers';
import * as sigUtilImport from '@metamask/eth-sig-util';
const sigUtil = sigUtilImport.default || sigUtilImport;
import { contractAddress } from './constants';

// Cache the deterministic key in memory so the user only signs once per session
let cachedSecretKey = null;

/**
 * Derives a 32-byte secret key cryptographically using an Ethereum signature.
 * @param {string} address - User's wallet address 
 * @param {ethers.Signer} signer - Ethers signer object to request the signature
 * @returns {Promise<string>} The 32-byte secret key as a hex string (without '0x')
 */
export const getDeterministicKey = async (address, signer) => {
    if (cachedSecretKey) return cachedSecretKey;
    
    if (!signer) {
        throw new Error("Signer is required to authenticate E2EE.");
    }
    
    try {
        const chainId = await signer.getChainId();

        // EIP-712 Domain Separator
        // This mathematically binds the signature to our specific application, network, and smart contract.
        // It prevents cross-domain replay attacks (phishing) and cross-chain replay attacks.
        const domain = {
            name: "Blockchain Drive",
            version: "1.0",
            chainId: chainId,
            verifyingContract: contractAddress
        };

        const types = {
            Authentication: [
                { name: "message", type: "string" },
                { name: "intent", type: "string" }
            ]
        };

        const value = {
            message: "Sign this message to authenticate your E2EE session.",
            intent: "Derive cryptographic master key for file encryption/decryption."
        };

        // ethers v5 uses _signTypedData to execute EIP-712
        const signature = await signer._signTypedData(domain, types, value);
        
        const encoder = new TextEncoder();
        const data = encoder.encode(signature);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        cachedSecretKey = hashHex;
        return cachedSecretKey;
    } catch (error) {
        console.error("Failed to generate deterministic key", error);
        throw new Error("Failed to derive E2EE key from signature.");
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
