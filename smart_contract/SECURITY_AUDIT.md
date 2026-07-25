# Security Audit Report — Blockchain Drive (UploadUpgradeableV9)

**Date:** July 2026  
**Auditor:** Manual Threat-Model Review (Student Conference Paper)  
**Scope:** UploadUpgradeableV9.sol — UUPS Upgradeable Proxy on Ethereum Sepolia  
**Framework:** OpenZeppelin Contracts Upgradeable v5.x  

---

## 1. Threat Model

| #  | Threat Vector                        | Severity | Mitigation Status |
|----|--------------------------------------|----------|-------------------|
| T1 | Unauthorized File Access             | Critical | ✅ Mitigated       |
| T2 | Mapping Collision (Multi-User CIDs)  | High     | ✅ Mitigated (V9)  |
| T3 | Key Sharing Hijack                   | Critical | ✅ Mitigated (V8+) |
| T4 | Replay Attack on PKI Setup           | High     | ✅ Mitigated       |
| T5 | Unauthorized Upgrade                 | Critical | ✅ Mitigated       |
| T6 | Denial of Service (Pause Abuse)      | Medium   | ✅ Mitigated       |
| T7 | Self-Referencing Exploits            | Low      | ✅ Mitigated       |
| T8 | Storage Layout Collision on Upgrade  | High     | ⚠️ Acknowledged    |
| T9 | Gas Griefing (Unbounded Loops)       | Medium   | ✅ Partially Mitigated (V10) |
| T10| On-Chain Metadata Visibility         | Medium   | ⚠️ Acknowledged (By Design) |

---

## 2. Detailed Findings

### T1: Unauthorized File Access (Critical → Mitigated)
**Location:** `display()`, `getFileCount()`, `displayPage()`  
**Description:** All view functions enforce a dual-check: `_user == msg.sender || hasAccess`. The `hasAccess` check validates both the boolean `ownership` mapping AND the time-locked `accessExpiry` mapping.  
**Verification:** Unit tests confirm that unauthorized users are reverted with "You don't have access".

### T2: Mapping Collision — Multi-User CIDs (High → Mitigated in V9)
**Location:** V9 storage additions (lines 70–75)  
**Description:** Prior versions (V2–V7) stored file metadata in flat `mapping(string => ...)` structures, meaning two users uploading the same IPFS CID would overwrite each other's encryption keys. V9 introduces user-scoped mappings: `mapping(address => mapping(string => ...))`.  
**Verification:** Unit test "V9 Storage Isolation" proves two users with identical CIDs maintain completely independent state.

### T3: Key Sharing Hijack (Critical → Mitigated in V8+)
**Location:** `shareFileKeysForUser()`, `shareFileKeysForMultipleUsers()`  
**Description:** Both functions enforce `require(_ownsFile(msg.sender, urls[i]))` before allowing key writes. This prevents a malicious third party from overwriting a legitimate user's shared encryption key.  
**Verification:** Unit tests confirm that a `hacker` account is reverted with "Not owner of file".

### T4: Replay Attack on PKI Setup (High → Mitigated)
**Location:** `setEncryptionPublicKey()`  
**Description:** The function uses an incrementing `encryptionKeyNonces` counter bound to each address. The signed message includes the current nonce, so replaying an old signature fails because the nonce no longer matches.  
**Verification:** Unit tests confirm that replaying a previous signature is reverted with "Invalid signature: signer does not match sender".

### T5: Unauthorized Upgrade (Critical → Mitigated)
**Location:** `_authorizeUpgrade()` (UUPS pattern)  
**Description:** Only the `owner` (deployer) can authorize a proxy upgrade, enforced by the `onlyOwner` modifier from OwnableUpgradeable.  
**Verification:** Unit test confirms that a non-owner calling `upgradeToAndCall` is reverted with `OwnableUnauthorizedAccount`.

### T6: Denial of Service via Pause Abuse (Medium → Mitigated)
**Location:** `pause()`, `unpause()`  
**Description:** Both functions are protected by `onlyOwner`. A malicious user cannot pause the contract.  
**Verification:** Unit tests confirm non-owners are reverted with `OwnableUnauthorizedAccount`.

### T7: Self-Referencing Exploits (Low → Mitigated)
**Location:** `allow()`, `sendFileToReceiverWithE2EE()`  
**Description:** Explicit `require(user != msg.sender)` and `require(receiver != msg.sender)` guards prevent users from granting access to themselves or sending files to themselves, which could create confusing access-list states.

### T8: Storage Layout Collision on Upgrade (High → Acknowledged)
**Description:** UploadUpgradeableV9 carries deprecated storage slots from V2–V7 (e.g., `fileSignatures`, `encryptedAESKeys`). These are intentionally preserved to maintain storage layout compatibility with the UUPS proxy pattern. Removing or reordering them would corrupt live data.  
**Status:** This is a known trade-off of the UUPS upgradeable pattern. The deprecated mappings are clearly marked with `// DEPRECATED` comments. Future work: formal verification with Certora or the K-Framework would provide mathematical guarantees that no storage slot overlaps exist.

### T9: Gas Griefing — Unbounded Loops (Medium → Partially Mitigated in V10)
**Description:** Functions like `deleteFile()` and `updateFile()` still iterate over a user's file array for the swap-and-pop deletion pattern. However, the critical `_ownsFile()` function was rewritten in V10 to use a `mapping(address => mapping(bytes32 => bool))` lookup, reducing its gas cost from O(n) to O(1). This eliminates the primary DoS vector where an attacker could force expensive ownership checks.  
**Status:** The `deleteFile()` loop remains as an unavoidable consequence of the array-based file storage model. Mitigated in practice by the expectation that individual users will not store thousands of files. Future work: a hash-indexed file registry would provide O(1) deletions.

### T10: On-Chain Metadata Visibility (Medium → Acknowledged by Design)
**Description:** File metadata fields (`category`, `sender` address, `url` (IPFS CID), and `timestamp`) are stored on-chain in plaintext and indexed by The Graph subgraph. While the actual file **contents** are AES-256-GCM encrypted end-to-end and mathematically unreadable without the user's private key, the metadata remains visible to anyone inspecting the blockchain.  
**Status:** This is an intentional architectural trade-off. On-chain metadata visibility is required to enable the Dashboard analytics (file categories, activity log, gas tracking) powered by The Graph indexer. Encrypting metadata would require a private indexing layer, which is documented as future work. For the current conference demo, file privacy (E2EE content encryption) is the primary security guarantee, and metadata visibility is an accepted limitation.

---

## 3. Test Coverage Summary

| Test Section                       | Tests | Status |
|------------------------------------|-------|--------|
| 1. Core File Operations            | 8     | ✅ PASS |
| 2. File Sending to Receiver        | 5     | ✅ PASS |
| 3. Access Control (Time-Locked)    | 10    | ✅ PASS |
| 4. File Key Sharing (Access Ctrl)  | 4     | ✅ PASS |
| 5. V9 Storage Isolation            | 2     | ✅ PASS |
| 6. File Versioning                 | 5     | ✅ PASS |
| 7. E2EE PKI (Replay Protection)   | 4     | ✅ PASS |
| 8. Emergency Pausability           | 3     | ✅ PASS |
| 9. Pagination                      | 3     | ✅ PASS |
| 10. UUPS Upgrade Authorization     | 1     | ✅ PASS |
| 11. Stale-File Sharing Guard       | 3     | ✅ PASS |
| 12. O(1) Ownership Consistency     | 2     | ✅ PASS |
| **TOTAL**                          | **50**| **✅ ALL PASS** |

---

## 4. Future Work

1. **Formal Verification:** Apply Certora or K-Framework to mathematically prove storage-layout safety across all upgrade versions.
2. **O(1) File Deletions:** Replace the file array with a hash-indexed registry for O(1) deletions and lookups.
3. **Metadata Encryption:** Encrypt category tags and file metadata client-side before on-chain storage, using a private subgraph indexer for analytics.
4. **Professional Audit:** Engage a third-party auditing firm (e.g., OpenZeppelin, Trail of Bits) for a production-grade audit before mainnet deployment.
5. **Upgrade Safety CI:** Integrate `check-upgrade-safety.js` into CI/CD pipeline to automatically validate storage layout before every deployment.
