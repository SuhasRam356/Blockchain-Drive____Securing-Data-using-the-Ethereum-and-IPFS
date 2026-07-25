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
| T9 | Gas Griefing (Unbounded Loops)       | Medium   | ⚠️ Acknowledged    |

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

### T9: Gas Griefing — Unbounded Loops (Medium → Acknowledged)
**Description:** Functions like `_ownsFile()`, `deleteFile()`, and `updateFile()` iterate over a user's entire file array. For users with thousands of files, these could hit block gas limits.  
**Status:** Mitigated in practice by pagination (`displayPage`) and the expectation that individual users will not store thousands of files in a conference demo. Future work: indexing files by URL hash would provide O(1) lookups.

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
| **TOTAL**                          | **45**| **✅ ALL PASS** |

---

## 4. Future Work

1. **Formal Verification:** Apply Certora or K-Framework to mathematically prove storage-layout safety across all upgrade versions.
2. **O(1) File Lookups:** Replace linear file array scans with `mapping(address => mapping(bytes32 => uint256))` for URL-hash-indexed O(1) lookups.
3. **Professional Audit:** Engage a third-party auditing firm (e.g., OpenZeppelin, Trail of Bits) for a production-grade audit before mainnet deployment.
