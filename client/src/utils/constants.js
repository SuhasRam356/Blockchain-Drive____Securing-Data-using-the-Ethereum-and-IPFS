import UploadUpgradeableV9 from "./UploadUpgradeableV9.json";
import DriveDAO from "../abis/DriveDAO.json";
import DriveToken from "../abis/DriveToken.json";
import DriveFaucet from "../abis/DriveFaucet.json";



export const contractAddress = "0x71D9B51bFE5DE572673B241B1f9109e58F0B834F"; // Automatically use new V9 proxy
export const contractAbi = UploadUpgradeableV9.abi || UploadUpgradeableV9;
export const daoAddress = import.meta.env.VITE_DAO_ADDRESS;
export const daoAbi = DriveDAO.abi || DriveDAO;
export const tokenAddress = import.meta.env.VITE_TOKEN_ADDRESS;
export const tokenAbi = DriveToken.abi || DriveToken;
export const faucetAddress = import.meta.env.VITE_FAUCET_ADDRESS;
export const faucetAbi = DriveFaucet.abi;
