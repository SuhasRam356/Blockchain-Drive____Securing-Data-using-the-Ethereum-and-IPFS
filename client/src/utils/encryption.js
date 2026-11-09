
import { ethers } from 'ethers';
import * as sigUtilImport from '@metamask/eth-sig-util';

const sigUtil = sigUtilImport.default || sigUtilImport;

// Cache keys separately for each wallet, chain and contract.
const deterministicKeyCache = new Map();

/**
 * Clear all cached E2EE keys from the current session.
 */
export const clearDeterministicKeyCache = () => {
    deterministicKeyCache.clear();
};

/**
 * Generates a convergent AES encryption key.
 *
 * @param {string} fileData
 * @returns {string}
 */
export const generateConvergentKey = (fileData) => {
    return ethers.utils.sha256(
        ethers.utils.toUtf8Bytes(fileData)
    );
};

/**
 * Derives a deterministic E2EE key using an Ethereum signature.
 *
 * Cache is isolated by wallet address, chain ID and contract address.
 *
 * @param {string} address
 * @param {ethers.Signer} signer
 * @param {string} contractAddress
 * @returns {Promise<string>}
 */
export const getDeterministicKey = async (
    address,
    signer,
    contractAddress
) => {
    if (!signer) {
        throw new Error(
            "Signer is required to authenticate E2EE."
        );
    }

    if (!address || !contractAddress) {
        throw new Error(
            "Wallet address and contract address are required."
        );
    }

    let cacheKey = null;

    try {
        const [signerAddress, chainId] = await Promise.all([
            signer.getAddress(),
            signer.getChainId()
        ]);

        const normalizedAddress =
            ethers.utils.getAddress(address).toLowerCase();

        const normalizedSignerAddress =
            ethers.utils.getAddress(signerAddress).toLowerCase();

        const normalizedContractAddress =
            ethers.utils.getAddress(contractAddress).toLowerCase();

        // Ensure the requested wallet matches the actual signer.
        if (normalizedAddress !== normalizedSignerAddress) {
            throw new Error(
                "Wallet address does not match the signer account."
            );
        }

        // Create a unique cache identity for this wallet deployment.
        cacheKey = [
            normalizedAddress,
            chainId,
            normalizedContractAddress
        ].join(':');

        // Return an existing key or pending signing operation.
        if (deterministicKeyCache.has(cacheKey)) {
            return await deterministicKeyCache.get(cacheKey);
        }

        const keyPromise = (async () => {
            // EIP-712 domain separator.
            const domain = {
                name: "Blockchain Drive",
                version: "1.0",
                chainId: chainId,
                verifyingContract: contractAddress
            };

            const types = {
                Authentication: [
                    {
                        name: "message",
                        type: "string"
                    },
                    {
                        name: "intent",
                        type: "string"
                    }
                ]
            };

            const value = {
                message:
                    "Sign this message to authenticate your E2EE session.",
                intent:
                    "Derive cryptographic master key for file encryption/decryption."
            };

            // Request the wallet signature.
            const signature = await signer._signTypedData(
                domain,
                types,
                value
            );

            // Derive a 32-byte key using SHA-256.
            const encoder = new TextEncoder();
            const data = encoder.encode(signature);

            const hashBuffer = await window.crypto.subtle.digest(
                'SHA-256',
                data
            );

            const hashArray = Array.from(
                new Uint8Array(hashBuffer)
            );

            return hashArray
                .map(byte => byte.toString(16).padStart(2, '0'))
                .join('');
        })();

        // Cache the pending promise to prevent duplicate signatures.
        deterministicKeyCache.set(cacheKey, keyPromise);

        try {
            return await keyPromise;
        } catch (error) {
            // Remove failed promises from the cache.
            if (
                deterministicKeyCache.get(cacheKey) === keyPromise
            ) {
                deterministicKeyCache.delete(cacheKey);
            }

            throw error;
        }

    } catch (error) {
        console.error(
            "Failed to generate deterministic key",
            error
        );

        // Preserve the useful wallet mismatch error.
        if (
            error.message ===
            "Wallet address does not match the signer account."
        ) {
            throw error;
        }

        throw new Error(
            "Failed to derive E2EE key from signature."
        );
    }
};

/**
 * Derives the X25519 public key from a secret key.
 *
 * @param {string} secretKeyHex
 * @returns {string}
 */
export const derivePublicKey = (secretKeyHex) => {
    return sigUtil.getEncryptionPublicKey(secretKeyHex);
};

/**
 * Derives a category-specific keypair.
 *
 * @param {string} masterSecretKeyHex
 * @param {string} category
 * @returns {Object}
 */
export const deriveCategoryKeypair = (
    masterSecretKeyHex,
    category
) => {
    const hashStr = masterSecretKeyHex + category;

    const categorySecretHex = ethers.utils
        .sha256(ethers.utils.toUtf8Bytes(hashStr))
        .replace('0x', '');

    const categoryPublicKey =
        sigUtil.getEncryptionPublicKey(categorySecretHex);

    return {
        categorySecretHex,
        categoryPublicKey
    };
};

/**
 * Encrypts data using the receiver's public key.
 *
 * @param {string} data
 * @param {string} publicKeyBase64
 * @returns {Promise<string>}
 */
export const encryptAESKey = async (
    data,
    publicKeyBase64
) => {
    const encryptedObj = sigUtil.encrypt({
        publicKey: publicKeyBase64,
        data: data,
        version: 'x25519-xsalsa20-poly1305'
    });

    const bufferModule = await import('buffer');
    const Buffer = window.Buffer || bufferModule.Buffer;

    return "0x" + Buffer
        .from(JSON.stringify(encryptedObj), 'utf8')
        .toString('hex');
};

/**
 * Decrypts data using the user's secret key.
 *
 * @param {string} encryptedDataHex
 * @param {string} secretKeyHex
 * @returns {Promise<string>}
 */
export const decryptAESKey = async (
    encryptedDataHex,
    secretKeyHex
) => {
    const bufferModule = await import('buffer');
    const Buffer = window.Buffer || bufferModule.Buffer;

    const jsonStr = Buffer
        .from(encryptedDataHex.replace('0x', ''), 'hex')
        .toString('utf8');

    const encryptedObj = JSON.parse(jsonStr);

    return sigUtil.decrypt({
        encryptedData: encryptedObj,
        privateKey: secretKeyHex
    });
};
