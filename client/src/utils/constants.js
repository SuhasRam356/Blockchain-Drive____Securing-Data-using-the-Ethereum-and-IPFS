import UploadUpgradeableV7 from "./UploadUpgradeableV7.json";
import DriveDAO from "../abis/DriveDAO.json";
import DriveToken from "../abis/DriveToken.json";
import DriveFaucet from "../abis/DriveFaucet.json";

export const LIGHTHOUSE_API_KEY = import.meta.env.VITE_LIGHTHOUSE_API_KEY;

export const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
export const contractAbi = UploadUpgradeableV7.abi || UploadUpgradeableV7;
export const daoAddress = import.meta.env.VITE_DAO_ADDRESS;
export const daoAbi = DriveDAO.abi || DriveDAO;
export const tokenAddress = import.meta.env.VITE_TOKEN_ADDRESS;
export const tokenAbi = DriveToken.abi || DriveToken;
export const faucetAddress = import.meta.env.VITE_FAUCET_ADDRESS;
export const faucetAbi = DriveFaucet.abi;
