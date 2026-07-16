# Smart Contracts Directory Structure

This directory contains the core smart contracts for Blockchain Drive. 

You will notice multiple versions of the `UploadUpgradeable` contract (`UploadUpgradeable.sol`, `UploadUpgradeableV2.sol`, ..., `UploadUpgradeableV7.sol`).

## Why are there multiple versions?

This project uses the **OpenZeppelin Upgradeable Contracts** pattern (UUPS/Transparent Proxies). 

In a production environment, you would typically only keep the latest version of the contract in this directory and rely on Git history to track previous versions. 

However, for educational purposes, viva demonstrations, and **upgradeability testing**, all previous versions (V1 through V6) have been intentionally kept side-by-side. 

This allows:
1. **Clear Iterative History**: Reviewers can easily side-by-side diff V1 to V7 without digging through Git history to understand how features like Steganography, ZKP, and DAO governance were progressively added.
2. **Robust Testing**: The Hardhat test suites (in `/test` and `/scripts`) explicitly deploy V1 and upgrade sequentially through the versions to verify that state storage layout is not corrupted during upgrades. Deleting V1-V6 would break these critical upgrade tests.

**Currently Deployed Contract**: `UploadUpgradeableV7.sol` is the active implementation contract deployed on Sepolia.
