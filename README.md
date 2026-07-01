# Decentralized Secure File Storage (Blockchain Drive)

A decentralized file storage system built using Ethereum and IPFS. This application allows users to securely upload files to IPFS and store the resulting hashes on the Ethereum blockchain via smart contract.

## 🚀 Features

- **Decentralized Storage:** Files are securely stored on IPFS.
- **Blockchain Security:** File metadata and access controls are managed by an Ethereum smart contract.
- **Access Control:** Share files with other Ethereum addresses. You can grant permanent access or time-limited access (e.g., allow access for 60 minutes).
- **Direct Transfer:** Send files directly to another user's account.
- **Categorization:** Categorize files when uploading for better organization.
- **File Management:** View, share, and delete uploaded files from your account.

## 📸 Screenshots

![Application Screenshot](./screenshot/Screenshot%202026-07-01%20103522.png)

![Application Screenshot](./screenshot/Screenshot%202026-07-01%20103536.png)

## 🛠️ Technology Stack

- **Frontend:** React.js, Vite, Tailwind CSS, Ethers.js
- **Smart Contract:** Solidity, Hardhat, OpenZeppelin
- **Storage:** IPFS (via Pinata or direct API)
- **Blockchain Network:** Local Hardhat Node / Any EVM-compatible testnet (Goerli, Sepolia, etc.)

## 📋 Prerequisites

Before you begin, ensure you have met the following requirements:
* **Node.js** (v16 or higher recommended)
* **MetaMask** wallet extension installed in your browser.
* **Pinata API Keys** (if using Pinata for IPFS uploads - configure in `.env`).

## ⚙️ Installation and Setup

### 1. Clone the repository
```bash
git clone https://github.com/SuhasRam356/Blockchain-Drive____Securing-Data-using-the-Ethereum-and-IPFS.git
cd Blockchain-Drive
```

### 2. Smart Contract Setup
Navigate to the `smart_contract` directory, install dependencies, and deploy the contract.

```bash
cd smart_contract
npm install
```

Open a new terminal and start a local Hardhat node:
```bash
npx hardhat node
```

Keep the node running. Open another terminal in the `smart_contract` directory and deploy the contract to the local network:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

*Note: After deployment, copy the contract address. You will need it for the frontend.*

### 3. Frontend Setup
Navigate to the `client` directory and install dependencies.

```bash
cd ../client
npm install
```

**Configure your environment variables:**
Create a `.env` file in the `client` directory and add your necessary keys (like Pinata API keys for IPFS).

**Update the contract address and ABI:**
Make sure to update the deployed contract address and ABI in your React app (usually located in `src/utils/upload.json` or `src/App.jsx`).

**Start the Vite development server:**
```bash
npm run dev
```

The application should now be running at `http://localhost:5173`.

## 💻 Usage

1. Open the application in your browser.
2. Connect your MetaMask wallet (make sure it's connected to the Localhost 8545 network if running locally).
3. **Upload:** Select a file, provide a category, and upload it. The file goes to IPFS, and the hash is stored on the blockchain.
4. **Share:** Navigate to the sharing section, enter another user's Ethereum address, and specify a time limit (or leave at 0 for permanent access) to share your files.
5. **View:** Browse your uploaded files and files shared with you by others.

## 📝 Smart Contract Structure

The core logic is implemented in `Upload.sol`:
- `add(address _user, string url, string category)`: Uploads a new file.
- `allow(address user, uint256 durationInMinutes)`: Grants access to another user (supports time-bound access).
- `disallow(address user)`: Revokes access from a user.
- `display(address _user)`: Retrieves files owned by or shared with the caller.
- `sendFileToReceiver(...)`: Directly sends a file to another address.
- `deleteFile(string url)`: Deletes a file from the user's records.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📜 License

This project is licensed under the MIT License.
