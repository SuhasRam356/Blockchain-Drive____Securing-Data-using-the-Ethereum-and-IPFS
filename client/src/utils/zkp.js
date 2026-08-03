import * as snarkjs from "snarkjs";
import { buildPoseidon } from "circomlibjs";

/**
 * Computes the Poseidon hash of an AES key string.
 * @param {string} aesKey
 * @returns {string} decimal string representation of the hash
 */
export async function computeZkHash(aesKey) {
    if (!aesKey) return "0";
    
    try {
        const poseidon = await buildPoseidon();
        
        // Convert AES key string to a numeric field element for Circom
        // We take the first 32 characters, convert to buffer, and interpret as BigInt
        let keyBuffer = new TextEncoder().encode(aesKey);
        // Ensure it's not larger than the prime field. A simple hash to big integer works.
        // But circomlibjs poseidon takes BigInts directly.
        // Let's just create a safe big int from the string bytes.
        let hex = "0x";
        for (let i = 0; i < Math.min(keyBuffer.length, 31); i++) {
            hex += keyBuffer[i].toString(16).padStart(2, '0');
        }
        let secretInt = BigInt(hex);

        const hashBuffer = poseidon([secretInt]);
        const hash = poseidon.F.toString(hashBuffer);
        return { zkHash: hash, secretInt: secretInt.toString() };
    } catch (e) {
        console.error("ZKP Hash Generation Error:", e);
        return { zkHash: "0", secretInt: "0" };
    }
}

/**
 * Generates the Zero-Knowledge Proof (a, b, c) to prove knowledge of the secret.
 * @param {string} secretInt
 * @returns {object} { a, b, c, publicSignals }
 */
export async function generateZKProof(secretInt) {
    try {
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            { secretKey: secretInt },
            "/zkp/payload_hash.wasm",
            "/zkp/payload_hash_final.zkey"
        );

        // Format proof for Solidity Verifier
        const a = [proof.pi_a[0], proof.pi_a[1]];
        const b = [
            [proof.pi_b[0][1], proof.pi_b[0][0]],
            [proof.pi_b[1][1], proof.pi_b[1][0]]
        ];
        const c = [proof.pi_c[0], proof.pi_c[1]];

        return { a, b, c, publicSignals };
    } catch (e) {
        console.error("ZKP Proof Generation Error:", e);
        throw e;
    }
}
