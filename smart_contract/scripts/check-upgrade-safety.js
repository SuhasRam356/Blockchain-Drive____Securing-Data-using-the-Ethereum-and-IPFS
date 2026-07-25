/**
 * check-upgrade-safety.js
 * 
 * Pre-flight script to verify storage layout compatibility before
 * deploying a UUPS proxy upgrade. Uses OpenZeppelin's Hardhat Upgrades
 * plugin to validate that the new implementation does not corrupt
 * existing storage slots.
 * 
 * Usage: npx hardhat run scripts/check-upgrade-safety.js
 */

const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("=== Storage Layout Compatibility Check ===\n");

    // Define the upgrade path to validate
    const upgradePath = [
        { name: "UploadUpgradeableV5", label: "V5 (Base)" },
        { name: "UploadUpgradeableV6", label: "V6 (Access Expiry)" },
        // V7 is the subgraph ABI wrapper, skip if not present
        { name: "UploadUpgradeableV8", label: "V8 (Pausability + Access Control Fix)" },
        { name: "UploadUpgradeableV9", label: "V9 (Storage Isolation + O(1) Ownership)" },
    ];

    let previousFactory = null;
    let previousLabel = null;

    for (const step of upgradePath) {
        try {
            const factory = await ethers.getContractFactory(step.name);

            if (previousFactory) {
                console.log(`Checking: ${previousLabel} → ${step.label}...`);
                try {
                    await upgrades.validateUpgrade(previousFactory, factory, {
                        kind: 'uups',
                    });
                    console.log(`  ✅ SAFE: No storage layout collisions detected.\n`);
                } catch (err) {
                    console.error(`  ❌ UNSAFE: ${err.message}\n`);
                    process.exitCode = 1;
                }
            } else {
                console.log(`Baseline: ${step.label} (initial deployment)`);
                // Validate the initial deployment is valid
                await upgrades.validateImplementation(factory, { kind: 'uups' });
                console.log(`  ✅ Valid upgradeable implementation.\n`);
            }

            previousFactory = factory;
            previousLabel = step.label;
        } catch (err) {
            if (err.message.includes("HH700")) {
                console.log(`  ⏭️  Skipping ${step.label} (contract not found)\n`);
            } else {
                console.error(`  ❌ Error loading ${step.label}: ${err.message}\n`);
            }
        }
    }

    console.log("=== Check Complete ===");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
