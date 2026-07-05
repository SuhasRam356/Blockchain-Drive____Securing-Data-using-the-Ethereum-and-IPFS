import contractAbi from '../abis/UploadV5.json';
import tokenAbi from '../abis/DriveToken.json';
import daoAbi from '../abis/DriveDAO.json';

export { contractAbi, tokenAbi, daoAbi };

export const API_Key = import.meta.env.VITE_PINATA_API_KEY;
export const API_Secret = import.meta.env.VITE_PINATA_SECRET_KEY;
export const JWT = import.meta.env.VITE_PINATA_JWT;
export const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
