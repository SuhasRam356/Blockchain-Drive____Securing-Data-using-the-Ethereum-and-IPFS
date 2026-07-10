const fs = require("fs");
const { execSync } = require("child_process");

console.log("=== Circom / SnarkJS Compilation Script ===");
console.log("NOTE: You must have 'circom' installed on your system to run this script.");
console.log("To install circom: https://docs.circom.io/getting-started/installation/");
console.log("");

try {
    // 1. Compile the circuit
    console.log("Compiling circuit...");
    execSync("circom payload_hash.circom --r1cs --wasm --sym", { stdio: "inherit" });

    // 2. Setup (Powers of Tau)
    console.log("Running Trusted Setup (Powers of Tau)...");
    execSync("snarkjs powersoftau new bn128 12 pot12_0000.ptau -v", { stdio: "inherit" });
    execSync("snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name=\"First contribution\" -v -e=\"random text\"", { stdio: "inherit" });
    execSync("snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v", { stdio: "inherit" });

    // 3. Generate ZKey
    console.log("Generating zkey...");
    execSync("snarkjs groth16 setup payload_hash.r1cs pot12_final.ptau payload_hash_0000.zkey", { stdio: "inherit" });
    execSync("snarkjs zkey contribute payload_hash_0000.zkey payload_hash_final.zkey --name=\"Second contribution\" -v -e=\"another random text\"", { stdio: "inherit" });
    execSync("snarkjs zkey export verificationkey payload_hash_final.zkey verification_key.json", { stdio: "inherit" });

    // 4. Move artifacts to client public folder so React can access them
    console.log("Moving artifacts to frontend public folder...");
    fs.mkdirSync("../client/public/zkp", { recursive: true });
    fs.copyFileSync("payload_hash_js/payload_hash.wasm", "../client/public/zkp/payload_hash.wasm");
    fs.copyFileSync("payload_hash_final.zkey", "../client/public/zkp/payload_hash_final.zkey");
    fs.copyFileSync("verification_key.json", "../client/public/zkp/verification_key.json");

    console.log("Compilation and Setup Successful!");
} catch (e) {
    console.error("Error during compilation. Ensure circom is installed and in your PATH.");
}
