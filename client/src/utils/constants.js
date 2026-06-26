// ! ||--------------------------------------------------------------------------------||
// ! ||                                 Smart Contract                                 ||
// ! ||--------------------------------------------------------------------------------||

const abi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_user",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "url",
        "type": "string"
      }
    ],
    "name": "add",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "admin",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "allow",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "url",
        "type": "string"
      }
    ],
    "name": "deleteFile",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "disallow",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_user",
        "type": "address"
      }
    ],
    "name": "display",
    "outputs": [
      {
        "internalType": "string[]",
        "name": "",
        "type": "string[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "url",
        "type": "string"
      }
    ],
    "name": "sendFileToReceiver",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "shareAccess",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "access",
            "type": "bool"
          }
        ],
        "internalType": "struct Upload.Access[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

// Use environment variable, fallback to localhost dummy address for safety
export const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d';
export const contractAbi = abi;


// ! ||--------------------------------------------------------------------------------||
// ! ||                                   Pinata IPFS                                  ||
// ! ||--------------------------------------------------------------------------------||

export const API_Key = import.meta.env.VITE_PINATA_API_KEY;
export const API_Secret = import.meta.env.VITE_PINATA_SECRET_KEY;
export const JWT = import.meta.env.VITE_PINATA_JWT;



