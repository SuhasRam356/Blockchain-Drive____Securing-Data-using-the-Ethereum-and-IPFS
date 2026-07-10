pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

template PayloadHash() {
    // Private inputs
    signal input secretKey; // The AES encryption key (represented as a field element)
    
    // Public outputs
    signal output publicHash;

    // Component to hash the secret key
    component hasher = Poseidon(1);
    hasher.inputs[0] <== secretKey;

    publicHash <== hasher.out;
}

// Instantiate the main component
component main {public [secretKey]} = PayloadHash();
