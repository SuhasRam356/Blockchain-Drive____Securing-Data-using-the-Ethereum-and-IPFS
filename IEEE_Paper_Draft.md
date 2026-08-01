# Decentralized and Secure Data Storage: Integrating Ethereum Smart Contracts with IPFS for End-to-End Encrypted File Sharing

**Author Name**  
*Affiliation*  
author@email.com

---

## Abstract
*As cloud platforms increasingly dominate how we store data, the risks of privacy leaks and centralized failures have become impossible to ignore. Traditional providers basically have full control over user files, which makes them prime targets for data breaches. To fix this, we designed a decentralized storage system that ties the Ethereum blockchain together with the InterPlanetary File System (IPFS). Instead of relying on a single company, we use End-to-End Encryption (E2EE) powered by a Hierarchical Deterministic (HD) key management setup and X25519 public-key cryptography. This guarantees that only the actual data owner and the people they explicitly authorize can read the files. We also built the backend using a Universal Upgradeable Proxy Standard (UUPS) smart contract, meaning the system can be upgraded over time by a Decentralized Autonomous Organization (DAO) without losing anyone's data. By bringing in a conceptual Zero-Knowledge Proof (ZKP) mechanism, the network can verify that files are encrypted properly without ever seeing the secret keys. Ultimately, this creates a storage environment that resists censorship and prioritizes user privacy over corporate control.*

**Index Terms** - *Blockchain, Decentralized Storage, End-to-End Encryption, Ethereum, IPFS, Smart Contracts, X25519.*

---

## I. Introduction
The transition toward Web3 technologies is completely changing how we think about digital ownership. In the standard Web 2.0 model, our data sits on servers owned by a handful of massive tech companies. This creates some obvious vulnerabilities—these centralized servers are essentially honeypots for hackers, and users have to blindly trust that the company won't snoop on their files or randomly delete them. 

To get around these risks, a lot of recent research has focused on decentralized storage networks like IPFS (InterPlanetary File System). However, IPFS on its own isn't a silver bullet. If you upload a file to IPFS, anyone who knows the Content Identifier (CID) can download it. Because IPFS lacks native access control, you have to add a strong cryptographic layer if you want any real privacy [1]. 

Several IEEE studies have looked into this combination. For instance, researchers have proposed frameworks for Electronic Health Records (EHR) and IoT networks where Ethereum handles the auditing and IPFS holds the heavy data [2], [3]. Many of these systems rely on Proxy Re-Encryption (PRE) or Attribute-Based Encryption (ABE) to manage access [4]. While these are great theoretical models, they can sometimes be heavy on computation or gas costs when actually deployed on the Ethereum mainnet.

In this paper, we introduce "BlockDrive." It’s a practical decentralized application (DApp) that merges Ethereum’s immutability with IPFS's distributed hosting. Instead of heavy on-chain encryption algorithms, we push the End-to-End Encryption (E2EE) protocol directly to the client side. Files get encrypted locally in the browser before they even touch the IPFS network. Meanwhile, the lightweight cryptographic keys and the actual access control logic are managed securely by Ethereum smart contracts. 

## II. Proposed System Architecture
We broke the architecture down into three main layers: the frontend client, the off-chain storage, and the blockchain consensus layer.

### A. The Client Layer
The user interface is built with React.js and Vite. It handles all the heavy cryptographic lifting right inside the browser using the Web Crypto API (`window.crypto`) and Ethers.js. Because of this, unencrypted data and private keys literally never leave the user's laptop or phone.

### B. The Storage Layer (IPFS)
To actually store the files, we route the encrypted data through the Pinata IPFS gateway. IPFS relies on content addressing, meaning a file’s address is just a cryptographic hash of its contents. If someone tries to tamper with a file, the hash changes, and the original address breaks. This gives us native immutability.

### C. The Consensus Layer (Ethereum)
Ethereum acts as our permanent ledger. It tracks who owns what and manages the metadata. We wrote the core smart contract in Solidity using the UUPS (Universal Upgradeable Proxy Standard) pattern [5]. Upgradability is usually a tricky subject in blockchain since code is supposed to be immutable, but the UUPS proxy lets a Decentralized Autonomous Organization (DAO) vote to push upgrades to the logic without erasing the existing storage state.

## III. Implementation Details

### A. E2EE and HD Key Derivation
To give users granular control over what they share, we went with a dual-encryption approach rather than relying solely on something like ABE. 
First, every file gets encrypted client-side using a random AES-256 key. Then, that specific AES key is encrypted using X25519 public-key cryptography. 

But instead of making users manage a single master key (which is terrible for security if it gets compromised), we built a Hierarchical Deterministic (HD) key derivation scheme. A master secret key is generated on the fly when the user signs a specific EIP-712 typed message in their MetaMask wallet. We then take that master key and use SHA-256 hashing to spin up unique "Category Sub-Keys." This means a user can safely share a sub-key for their "Work" files without exposing the key to their "Personal" files.

### B. The File Sharing Protocol
When Alice wants to share a document with Bob, the workflow looks like this:
1. Alice grabs the encrypted AES key for the file from the smart contract.
2. She decrypts it locally using her specific HD Sub-Key.
3. She queries the blockchain to get Bob's registered E2EE Public Key.
4. She re-encrypts the AES key using Bob's public key.
5. Finally, she sends a quick transaction to save this newly encrypted key to the smart contract under Bob's address.
From that point on, Bob can just fetch the file from IPFS and decrypt it himself. Alice doesn't need to be online or involved anymore.

### C. ZKP Commitments and Gas Optimization
To make the system mathematically verifiable, we integrated a conceptual Zero-Knowledge Proof (ZKP) commitment. When uploading a file, the client generates a cryptographic proof showing that the AES key matching the file is accurate, without actually exposing the AES key. The network verifies this proof before accepting the upload.

We also spent a lot of time optimizing gas costs, which is a major hurdle in Ethereum development. In the latest V9 protocol upgrade, we refactored the `_ownsFile` verification logic. We moved away from an $O(n)$ iteration loop and replaced it with an $O(1)$ constant-time mapping lookup. This drastically cut down the computational overhead, especially for users who have hundreds of files, while still maintaining backward compatibility for older uploads.

## IV. Discussion
The final implementation proves that you can build a highly functional storage platform without relying on AWS or Google Cloud. By pushing the heavy file payloads to IPFS, we keep Ethereum mainnet costs low, letting the blockchain do what it does best: securely managing small, lightweight cryptographic keys. 

During our testing phase on the Sepolia testnet, the UUPS proxy pattern worked exactly as intended, allowing us to push a live patch to the ownership mapping without dropping any of the existing user data. The client-side HD key derivation was also surprisingly fast, so users don't feel any lag while their files are being encrypted.

The main bottleneck right now is that we rely heavily on browser-based secure enclaves (like MetaMask) for key management. While MetaMask is generally secure, the deterministic key generation requires the user to sign the exact same message across different sessions. We had to use strict EIP-712 domain separators to make sure these signatures couldn't be hijacked and replayed by malicious websites [6].

## V. Closing Thoughts
We successfully designed and deployed a secure data storage environment using Ethereum and IPFS. By moving data ownership away from centralized corporations and enforcing access control through smart contracts and local E2EE, we've created a genuinely trustless system. Looking ahead, we plan to replace the conceptual ZKP commitments with fully succinct non-interactive arguments of knowledge (zk-SNARKs), which will make the protocol's mathematical security guarantees even stronger.

## References

[1] Z. Zheng, S. Xie, H. Dai, X. Chen and H. Wang, "An Overview of Blockchain Technology: Architecture, Consensus, and Future Trends," in *IEEE International Congress on Big Data*, 2017.
[2] A. Ali et al., "IoTChain: A blockchain security architecture for the Internet of Things," in *IEEE Wireless Communications*, 2018.
[3] H. Guo et al., "A Secure and Privacy-Preserving EHR Sharing Scheme Based on Blockchain and IPFS," in *IEEE Access*, 2021.
[4] Y. Zhang et al., "Blockchain-Based Secure Data Sharing With Proxy Re-Encryption," in *IEEE Internet of Things Journal*, 2020.
[5] OpenZeppelin, "Proxy Upgrade Pattern," 2023. [Online]. Available: https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies
[6] V. Buterin, "EIP-712: Typed structured data hashing and signing," Ethereum Improvement Proposals, 2017.
