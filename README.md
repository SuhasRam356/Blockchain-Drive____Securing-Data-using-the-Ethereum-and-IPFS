# Decentralized Secure File Storage (Blockchain Drive)

A decentralized, end-to-end encrypted (E2EE) file storage system built using Ethereum and IPFS. This application allows users to securely encrypt files locally, upload them to IPFS, and store the resulting hashes on the Ethereum blockchain via smart contracts. Users can manage their files, share access with others, view version history, and even hide data inside images using steganography.

## 🚀 Features

- **End-to-End Encryption (E2EE):** All files are encrypted locally in the browser using AES-256 before being sent to IPFS. Decryption keys are deterministically generated using your MetaMask signature, ensuring only you (and authorized users) can read the data.
- **Decentralized Storage:** Files are securely stored on IPFS via Pinata.
- **Blockchain Security:** File metadata, access controls, and encrypted E2EE keys are managed by an Ethereum smart contract (`UploadUpgradeableV6.sol`).
- **Access Control:** Share files with other Ethereum addresses. You can grant permanent access or time-limited access (e.g., allow access for 60 minutes).
- **Version History & Rollback:** Update existing files without losing the old data. View the version history and roll back to previous versions directly on the blockchain.
- **Steganography:** Optionally hide your encrypted files inside cover images (LSB steganography) to completely obscure the fact that data is being stored.
- **Direct Blockchain Analytics:** The dashboard fetches data and recent activity directly from the smart contract logs using `ethers.js` for instant loading without needing centralized databases.

## 🛠️ Technology Stack

- **Frontend:** React.js, Vite, Tailwind CSS, Ethers.js, Recharts
- **Smart Contract:** Solidity, Hardhat, OpenZeppelin (Upgradeable Contracts)
- **Cryptography:** CryptoJS (AES Encryption), Ethers.js (Deterministic Keys)
- **Storage:** IPFS (via Pinata)
- **Blockchain Network:** Sepolia Testnet / Local Hardhat Node

## 📋 Prerequisites

Before you begin, ensure you have met the following requirements:
* **Node.js** (v16 or higher recommended)
* **MetaMask** wallet extension installed in your browser.
* **Pinata API Keys** (for IPFS uploads - configure in `client/.env`).
* **Sepolia Testnet ETH** (for deploying/transacting on the Sepolia network).

## ⚙️ Installation and Setup

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/Blockchain-Drive.git
cd Blockchain-Drive
```

### 2. Smart Contract Setup
Navigate to the `smart_contract` directory and install dependencies.

```bash
cd smart_contract
npm install
```

**Configure your environment variables:**
Create a `.env` file in the `smart_contract` directory:
```env
SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
PRIVATE_KEY=your_metamask_private_key
```

**Deploy the contract to Sepolia:**
```bash
npx hardhat run scripts/deploy-v6-direct.js --network sepolia
```

*Note: After deployment, copy the contract address. You will need it for the frontend.*

### 3. Frontend Setup
Navigate to the `client` directory and install dependencies.

```bash
cd ../client
npm install
```

**Configure your environment variables:**
Create a `.env` file in the `client` directory:
```env
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_KEY=your_pinata_secret_key
VITE_JWT=your_pinata_jwt (optional)
```

**Update the contract address:**
Make sure to update the deployed contract address in your React app (located in `src/utils/constants.js`).

**Start the Vite development server:**
```bash
npm run dev
```

The application should now be running at `http://localhost:5050` (or `5173`).

## 💻 Usage

1. Open the application in your browser.
2. Connect your MetaMask wallet (make sure it's connected to the Sepolia Testnet).
3. **Upload (E2EE):** Select a file. The app will prompt you to sign a message to generate your encryption keys. The file will be encrypted, uploaded to IPFS, and the encrypted key + IPFS hash will be stored on the blockchain.
4. **Steganography:** Check the "Hide in Image" box during upload to embed your encrypted file inside a visible cover image.
5. **Share:** Navigate to the sharing section, enter another user's Ethereum address, and share your files.
6. **Dashboard:** View your real-time analytics fetched directly from the blockchain.

## 📝 Smart Contract Structure

The core logic is implemented in `UploadUpgradeableV6.sol`:
- `add(address _user, string url, string category, string signature, string encryptedAESKey)`: Uploads a new E2EE file.
- `updateFile(string oldUrl, string newUrl, string newHash, string newSignature, string encryptedAESKey)`: Appends a new version to a file's history.
- `getFileHistory(string url)`: Returns the version history for a given file.
- `allow(address user, uint256 durationInMinutes)`: Grants access to another user (supports time-bound access).
- `disallow(address user)`: Revokes access from a user.
- `displayPage(address _user, uint256 offset, uint256 limit)`: Retrieves paginated files owned by or shared with the caller.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📜 License

This project is licensed under the MIT License.