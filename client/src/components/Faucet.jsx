import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { faucetAddress, faucetAbi, tokenAbi, tokenAddress } from '../utils/constants';
import toast from 'react-hot-toast';

const Faucet = ({ provider, account }) => {
    const [loading, setLoading] = useState(false);
    const [faucetBalance, setFaucetBalance] = useState("0");
    const [userBalance, setUserBalance] = useState("0");
    const [cooldownTime, setCooldownTime] = useState(null);
    const [nextClaimTime, setNextClaimTime] = useState(0);

    const loadFaucetData = async () => {
        if (!provider || !account) return;
        try {
            const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
            const faucetContract = new ethers.Contract(faucetAddress, faucetAbi, provider);

            const fBal = await tokenContract.balanceOf(faucetAddress);
            const uBal = await tokenContract.balanceOf(account);
            const nextClaim = await faucetContract.nextClaimTime(account);
            
            setFaucetBalance(ethers.formatEther(fBal));
            setUserBalance(ethers.formatEther(uBal));
            setNextClaimTime(Number(nextClaim));
            
            updateCooldown(Number(nextClaim));
        } catch (error) {
            console.error("Error loading faucet data:", error);
        }
    };

    const updateCooldown = (nextClaimTimestamp) => {
        const now = Math.floor(Date.now() / 1000);
        if (now >= nextClaimTimestamp) {
            setCooldownTime(null);
        } else {
            const remaining = nextClaimTimestamp - now;
            const hours = Math.floor(remaining / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            setCooldownTime(`${hours}h ${minutes}m`);
        }
    };

    useEffect(() => {
        loadFaucetData();
        const interval = setInterval(() => {
            if (nextClaimTime > 0) {
                updateCooldown(nextClaimTime);
            }
        }, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [provider, account, nextClaimTime]);

    const claimTokens = async () => {
        if (!provider) return;
        setLoading(true);
        try {
            const signer = await provider.getSigner();
            const faucetContract = new ethers.Contract(faucetAddress, faucetAbi, signer);
            
            const tx = await faucetContract.requestTokens();
            toast.promise(tx.wait(), {
                loading: 'Claiming tokens...',
                success: 'Successfully claimed 100 DRIVE tokens!',
                error: 'Failed to claim tokens.',
            });
            await tx.wait();
            
            // Reload data
            setTimeout(loadFaucetData, 2000);
        } catch (error) {
            console.error(error);
            if (error.reason) {
                toast.error(error.reason);
            } else {
                toast.error("Failed to claim tokens. Are you on cooldown?");
            }
        }
        setLoading(false);
    };

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-auto my-6 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-2">DRIVE Faucet</h2>
            <p className="text-slate-400 mb-6 text-sm">
                Claim free DRIVE tokens to participate in DAO governance.
            </p>

            <div className="flex justify-between items-center mb-4 text-sm">
                <span className="text-slate-300">Your Balance:</span>
                <span className="font-mono text-emerald-400">{Number(userBalance).toLocaleString()} DRIVE</span>
            </div>
            
            <div className="flex justify-between items-center mb-6 text-sm pb-4 border-b border-slate-700">
                <span className="text-slate-300">Faucet Reserve:</span>
                <span className="font-mono text-sky-400">{Number(faucetBalance).toLocaleString()} DRIVE</span>
            </div>

            {cooldownTime ? (
                <div className="bg-amber-900/30 text-amber-400 p-4 rounded text-center mb-4 text-sm font-medium border border-amber-800/50">
                    Next claim available in: {cooldownTime}
                </div>
            ) : (
                <button
                    onClick={claimTokens}
                    disabled={loading || Number(faucetBalance) < 100}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Claiming..." : "Claim 100 DRIVE Tokens"}
                </button>
            )}
        </div>
    );
};

export default Faucet;
