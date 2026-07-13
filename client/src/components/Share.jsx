import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import { contractAbi, contractAddress } from '../utils/constants';
import toast from 'react-hot-toast';

import { usePasswordModal } from '../context/PasswordContext';

const Share = () => {
    const { requestPassword } = usePasswordModal();
    const [account, setAccount] = useState('');
    const [contract, setContract] = useState('');
    const [provider, setProvider] = useState('');
    const [sharedAddress, setSharedAddress] = useState([]);
    const [duration, setDuration] = useState("0");

    useEffect(() => {
        if (window.ethereum) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const loadProvider = async () => {
                if (provider) {
                    window.ethereum.on('chainChanged', () => {
                        window.location.reload();
                    })

                    window.ethereum.on('accountsChanged', () => {
                        window.location.reload();
                    })

                    await provider.send("eth_requestAccounts", [])
                    const signer = provider.getSigner();
                    const address = await signer.getAddress();
                    setAccount(address);

                    const contract = new ethers.Contract(
                        contractAddress, contractAbi, signer
                    )
                    setContract(contract);
                    setProvider(provider)
                }
                else {
                    console.log("MetaMask is not installed")
                }
            }
            provider && loadProvider();
        }
        else {
            alert('Please Install Metamusk')
        }
    }, [])

    const fetchAccessList = async () => {
        if(contract) {
            try {
                const addressList = await contract.shareAccess();
                setSharedAddress(addressList);
            } catch (error) {
                console.error("Error fetching access list", error);
            }
        }
    };

    useEffect(() => {
        fetchAccessList();
    }, [contract]);

    const sharing = async () => {
        const addressInput = document.querySelector(".address");
        const address = addressInput.value.trim();
        
        if (!address) {
            toast.error("Please enter a valid Ethereum address or ENS name");
            return;
        }

        const task = async () => {
            let finalAddress = address;
            if (finalAddress.endsWith(".eth")) {
                const ensProvider = new ethers.providers.JsonRpcProvider("https://cloudflare-eth.com");
                const resolved = await ensProvider.resolveName(finalAddress);
                if (resolved) {
                    finalAddress = resolved;
                } else {
                    throw new Error(`Could not resolve ENS name: ${finalAddress}`);
                }
            } else if (!ethers.utils.isAddress(finalAddress)) {
                throw new Error(`Invalid Ethereum address: ${finalAddress}`);
            }

            // 1. Check if receiver has E2EE set up
            const receiverPubKey = await contract.encryptionPublicKeys(finalAddress);
            if (!receiverPubKey || receiverPubKey === "") {
                throw new Error(`User ${finalAddress.substring(0,6)}... has not set up E2EE yet. They must log in first.`);
            }

            // 2. Fetch sender's files to re-encrypt keys
            const fileCount = await contract.getFileCount(account);
            const countNum = fileCount.toNumber();
            
            if (countNum > 0) {
                // Fetch all files. Wait, if the user has many files this could be large, but for now we fetch all.
                const allFiles = [];
                for(let i=0; i<countNum; i++) {
                    // Since displayPage is 1-indexed for offset? Wait, let's use display if available.
                    const filesBatch = await contract.displayPage(account, i, 1);
                    if (filesBatch.length > 0) allFiles.push(filesBatch[0]);
                }

                if (allFiles.length > 0) {
                    const password = await requestPassword("Share Files", "Enter your Master Password to securely encrypt your files for the receiver:");
                    if (!password) {
                        throw new Error("Master Password required to share encrypted files.");
                    }

                    const { getDeterministicKey, decryptAESKey, encryptAESKey } = await import('../utils/encryption');
                    const secretKey = await getDeterministicKey(password, account);

                    const urls = [];
                    const encryptedKeysForReceiver = [];

                    for (const file of allFiles) {
                        const encryptedAesKeyHex = await contract.encryptedAESKeys(file.url);
                        if (encryptedAesKeyHex && encryptedAesKeyHex !== "MANUAL" && encryptedAesKeyHex !== "") {
                            // Decrypt AES key with Alice's secret key
                            const aesKey = await decryptAESKey(encryptedAesKeyHex, secretKey);
                            // Encrypt AES key with Bob's public key
                            const newEncryptedKey = await encryptAESKey(aesKey, receiverPubKey);
                            
                            urls.push(file.url);
                            encryptedKeysForReceiver.push(newEncryptedKey);
                        }
                    }

                    if (urls.length > 0) {
                        toast("Sharing encrypted keys on blockchain...");
                        const shareKeysTx = await contract.shareFileKeysForUser(finalAddress, urls, encryptedKeysForReceiver);
                        await shareKeysTx.wait();
                    }
                }
            }

            const durationInMins = parseInt(duration);
            const tx = await contract.allow(finalAddress, isNaN(durationInMins) ? 0 : durationInMins);
            await tx.wait(); // Wait for blockchain confirmation
            await fetchAccessList(); // Refresh list without reloading page
            addressInput.value = ""; // clear input
            setDuration("0");
        };

        toast.promise(task(), {
            loading: 'Granting access on blockchain...',
            success: 'Access granted successfully!',
            error: (err) => {
                console.error(err);
                if (err.reason) return `Blockchain error: ${err.reason}`;
                if (err.message && err.message.includes("Invalid Ethereum address")) return err.message;
                if (err.message && err.message.includes("user rejected transaction")) return "Transaction rejected in MetaMask";
                return 'Failed to grant access. Please verify the address.';
            }
        });
    };

    const removAccess = async (address) => { 
        const task = async () => {
            const tx = await contract.disallow(address);
            await tx.wait(); // Wait for blockchain confirmation
            await fetchAccessList(); // Refresh list without reloading page
        };

        toast.promise(task(), {
            loading: `Revoking access for ${address.substring(0, 6)}...`,
            success: 'Access revoked successfully!',
            error: (err) => {
                console.error(err);
                if (err.reason) return `Blockchain error: ${err.reason}`;
                if (err.message && err.message.includes("user rejected transaction")) return "Transaction rejected in MetaMask";
                return 'Failed to revoke access.';
            }
        });
    };

    return (
        <div className="relative z-10 min-h-screen pb-20 pt-10">
            <div id='share' className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-5">
                <div className="glass-panel p-8 mb-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -z-10 -ml-10 -mt-10"></div>
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2">Manage Access</h2>
                    <p className="text-slate-400 mb-8">
                        {account ? 'Share your files with specific Ethereum addresses.' : "Please connect your wallet to manage access."}
                    </p>

                    <div className="flex flex-col md:flex-row gap-4 w-full"> 
                        <input
                            type="text"
                            placeholder="Enter 0x... Address"
                            className="address glass-input flex-1"
                        />
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                placeholder="Minutes"
                                min="0"
                                className="glass-input w-24 text-center"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                            />
                            <span className="text-sm text-slate-400">mins (0 = Forever)</span>
                        </div>
                        <button className="btn-primary whitespace-nowrap px-8" onClick={() => sharing()}>
                            Grant Access
                        </button> 
                    </div>
                </div>

                <div className="glass-panel p-8 relative overflow-hidden">
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10 -mr-10 -mb-10"></div>
                    
                    <h3 className="text-xl font-bold text-slate-200 mb-6">Shared Accounts</h3>
                    
                    {sharedAddress.length > 0 && sharedAddress.some(addr => addr[1]) ? (
                        <ul className="space-y-3">
                            {sharedAddress.map((address, id) => (
                                address[1] ? (
                                    <li key={id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
                                                {id + 1}
                                            </div>
                                            <p className="text-sm font-medium text-slate-300 break-all">
                                                {address[0]}
                                            </p>
                                        </div>
                                        
                                        <button 
                                            className="btn-danger whitespace-nowrap w-full sm:w-auto"
                                            onClick={() => removAccess(address[0])}
                                        >
                                            Revoke Access
                                        </button>
                                    </li>
                                ) : null
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-8 border-2 border-dashed border-slate-700/50 rounded-xl bg-slate-800/20">
                            <svg className="mx-auto h-12 w-12 text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                            <p className="text-sm text-slate-400">No accounts have been granted access yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Share;
