/**
 * contractVersion.js
 * Utility for detecting smart contract version and capabilities.
 */

/**
 * Detects contract version based on available functions on the contract instance.
 * @param {object} contract - Ethers Contract instance
 * @returns {Promise<number>} Detected version number (1 to 9)
 */
export const detectContractVersion = async (contract) => {
  if (!contract) return 0;

  // 1. Explicit version check if contract exposes version()
  try {
    if (typeof contract.version === 'function') {
      const v = await contract.version();
      return typeof v === 'object' && v.toNumber ? v.toNumber() : parseInt(v, 10);
    }
  } catch (e) {
    // Fall back to interface feature detection
  }

  // 2. Feature-based detection on ethers contract instance / ABI interface
  try {
    const hasUserEncryptedAESKeys = contract.userEncryptedAESKeys !== undefined;
    const hasAddBatchWithE2EE = contract.addBatchWithE2EE !== undefined;
    const hasUpdateFile = contract.updateFile !== undefined;
    const hasSetEncryptionPublicKey = contract.setEncryptionPublicKey !== undefined;
    const hasAllow = contract.allow !== undefined;

    if (hasUserEncryptedAESKeys || hasAddBatchWithE2EE) return 9;
    if (hasUpdateFile) return 8;
    if (hasSetEncryptionPublicKey) return 7;
    if (hasAllow) return 5;
    return 1;
  } catch (err) {
    console.warn("Contract version detection warning:", err);
    return 1; // Fallback to baseline version
  }
};

/**
 * Verifies if contract supports required version and displays toast if not.
 * @param {object} contract - Ethers contract instance
 * @param {number} minVersion - Minimum required version (e.g. 9)
 * @param {string} featureName - Human-readable name of feature
 * @returns {Promise<boolean>} True if supported, false otherwise
 */
export const ensureContractVersion = async (contract, minVersion = 9, featureName = "Feature") => {
  const version = await detectContractVersion(contract);
  if (version < minVersion) {
    const toastModule = await import('react-hot-toast');
    const toast = toastModule.default || toastModule;
    toast.error(`Contract V${minVersion}+ required for ${featureName} (Detected: V${version}). Please upgrade contract.`);
    return false;
  }
  return true;
};
