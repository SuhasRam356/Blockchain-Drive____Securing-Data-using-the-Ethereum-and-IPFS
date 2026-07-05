import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { tokenAbi, daoAbi } from '../utils/constants';

const Governance = () => {
    const [account, setAccount] = useState('');
    const [provider, setProvider] = useState(null);
    const [balance, setBalance] = useState('0');
    const [votingPower, setVotingPower] = useState('0');
    const [isLoading, setIsLoading] = useState(true);
    const [proposals, setProposals] = useState([]);
    const [newProposalDescription, setNewProposalDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const tokenAddress = import.meta.env.VITE_TOKEN_ADDRESS;
    const daoAddress = import.meta.env.VITE_DAO_ADDRESS;

    const PROPOSAL_STATES = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];

    useEffect(() => {
        const init = async () => {
            if (window.ethereum) {
                const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
                setProvider(web3Provider);
                try {
                    const accounts = await web3Provider.send("eth_requestAccounts", []);
                    setAccount(accounts[0]);
                } catch (e) {
                    console.error("Wallet connection failed:", e);
                }
            } else {
                console.error("Please install MetaMask");
            }
        };
        init();
    }, []);

    const fetchProposals = async () => {
        if (!provider || !daoAddress) return;
        try {
            const daoContract = new ethers.Contract(daoAddress, daoAbi, provider);
            const filter = daoContract.filters.ProposalCreated();
            const events = await daoContract.queryFilter(filter, 0, "latest");
            
            const fetchedProposals = await Promise.all(events.map(async (event) => {
                const [proposalId, proposer, targets, values, signatures, calldatas, voteStart, voteEnd, description] = event.args;
                const stateCode = await daoContract.state(proposalId);
                
                return {
                    proposalId: proposalId.toString(),
                    proposer,
                    description,
                    state: PROPOSAL_STATES[stateCode],
                    voteStart: voteStart.toString(),
                    voteEnd: voteEnd.toString()
                };
            }));
            
            setProposals(fetchedProposals.reverse()); // Show newest first
        } catch (err) {
            console.error("Error fetching proposals:", err);
        }
    };

    useEffect(() => {
        const fetchGovernanceData = async () => {
            if (!provider || !account || !tokenAddress) return;
            setIsLoading(true);
            try {
                const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
                const bal = await tokenContract.balanceOf(account);
                setBalance(ethers.utils.formatUnits(bal, 18));
                
                const votes = await tokenContract.getVotes(account);
                setVotingPower(ethers.utils.formatUnits(votes, 18));
                
                await fetchProposals();
            } catch (err) {
                console.error("Error fetching governance data:", err);
            }
            setIsLoading(false);
        };
        fetchGovernanceData();
    }, [provider, account, tokenAddress, daoAddress]);

    const delegateVotes = async () => {
        try {
            const signer = provider.getSigner();
            const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
            const tx = await tokenContract.delegate(account);
            await tx.wait();
            
            const votes = await tokenContract.getVotes(account);
            setVotingPower(ethers.utils.formatUnits(votes, 18));
            alert("Voting power successfully delegated to yourself!");
        } catch (err) {
            console.error(err);
            alert("Failed to delegate votes: " + (err.reason || err.message));
        }
    };

    const createProposal = async () => {
        if (!newProposalDescription.trim()) return;
        setIsSubmitting(true);
        try {
            const signer = provider.getSigner();
            const daoContract = new ethers.Contract(daoAddress, daoAbi, signer);
            
            // Dummy execution: transferring 0 tokens to the zero address
            const tokenContractInterface = new ethers.utils.Interface(tokenAbi);
            const encodedCall = tokenContractInterface.encodeFunctionData("transfer", [ethers.constants.AddressZero, 0]);
            
            const tx = await daoContract.propose(
                [tokenAddress], // target contract
                [0], // ether value
                [encodedCall], // calldata
                newProposalDescription // description
            );
            await tx.wait();
            setNewProposalDescription('');
            await fetchProposals();
            alert("Proposal created successfully! Wait 1 block for voting to open.");
        } catch (err) {
            console.error(err);
            const errMsg = err.reason || err.message || "Unknown error";
            if (errMsg.includes("GovernorUnexpectedProposalState") || errMsg.includes("proposal already exists")) {
                alert("Failed: A proposal with this exact description already exists. Please change the description text and try again.");
            } else {
                alert("Failed to create proposal: " + errMsg);
            }
        }
        setIsSubmitting(false);
    };

    const castVote = async (proposalId, support) => {
        try {
            const signer = provider.getSigner();
            const daoContract = new ethers.Contract(daoAddress, daoAbi, signer);
            const tx = await daoContract.castVote(proposalId, support);
            await tx.wait();
            await fetchProposals();
            alert("Vote cast successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to cast vote. You may have already voted, or voting is closed.");
        }
    };

    return (
        <div className="relative z-10 min-h-screen pb-20 pt-10">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-5">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-8">DAO Governance</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Voting Power Card */}
                    <div className="bg-slate-900/50 rounded-xl shadow-xl p-6 border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <svg className="w-24 h-24 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path></svg>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">My Voting Power</h3>
                        {isLoading ? (
                            <div className="h-10 w-24 bg-slate-800 rounded animate-pulse"></div>
                        ) : (
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-cyan-300">{Number(votingPower).toLocaleString()}</span>
                                <span className="text-sm text-slate-500 font-medium">Votes</span>
                            </div>
                        )}
                        {Number(votingPower) === 0 && Number(balance) > 0 && (
                            <button onClick={delegateVotes} className="mt-4 text-xs bg-cyan-500/20 text-cyan-300 px-3 py-1.5 rounded-full hover:bg-cyan-500/40 transition">
                                Delegate tokens to activate voting power
                            </button>
                        )}
                    </div>

                    {/* Token Balance Card */}
                    <div className="bg-slate-900/50 rounded-xl shadow-xl p-6 border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <svg className="w-24 h-24 text-purple-400" fill="currentColor" viewBox="0 0 20 20"><path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"></path></svg>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">$DRIVE Balance</h3>
                        {isLoading ? (
                            <div className="h-10 w-24 bg-slate-800 rounded animate-pulse"></div>
                        ) : (
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-purple-300">{Number(balance).toLocaleString()}</span>
                                <span className="text-sm text-slate-500 font-medium">Tokens</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* DAO Info */}
                <div className="bg-slate-900/50 rounded-xl shadow-xl p-6 border border-white/5">
                    <h3 className="text-xl font-bold text-white mb-4">Decentralized Storage Protocol</h3>
                    <p className="text-slate-400 mb-6 leading-relaxed">
                        This application is fully governed by the <strong>DriveDAO</strong>. The smart contract logic securing your encrypted files is built on an Upgradeable Proxy architecture.
                        However, ownership of this proxy has been revoked from the developer and transferred to the DAO. 
                        This means the smart contract can <strong>only</strong> be upgraded or paused if $DRIVE token holders mathematically pass a governance proposal.
                    </p>
                    <div className="flex flex-col gap-3 text-sm">
                        <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                            <span className="text-slate-400">DAO Contract Address</span>
                            <span className="font-mono text-cyan-400">{daoAddress}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                            <span className="text-slate-400">Token Contract Address</span>
                            <span className="font-mono text-purple-400">{tokenAddress}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                            <span className="text-slate-400">Total Proposals</span>
                            <span className="font-bold text-white">{proposals.length}</span>
                        </div>
                    </div>
                </div>

                {/* Create Proposal Section */}
                <div className="mt-8 bg-slate-900/50 rounded-xl shadow-xl p-6 border border-white/5">
                    <h3 className="text-xl font-bold text-white mb-4">Create a New Proposal</h3>
                    <p className="text-slate-400 mb-4 text-sm">Submit a text proposal for the DAO to vote on. Creating a proposal requires a minimum amount of voting power (currently set to 0 for testing).</p>
                    <div className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Describe your proposal (e.g., 'Should we implement Dark Mode?')"
                            className="glass-input flex-1"
                            value={newProposalDescription}
                            onChange={(e) => setNewProposalDescription(e.target.value)}
                            disabled={isSubmitting}
                        />
                        <button 
                            className="btn-primary whitespace-nowrap px-8 disabled:opacity-50" 
                            onClick={createProposal}
                            disabled={isSubmitting || !newProposalDescription.trim()}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Proposal'}
                        </button>
                    </div>
                </div>

                {/* Proposals List Section */}
                <div className="mt-8 mb-12">
                    <h3 className="text-2xl font-bold text-white mb-6">Recent Proposals</h3>
                    {proposals.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-700/50 rounded-xl bg-slate-800/20">
                            <p className="text-slate-400">No proposals have been created yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {proposals.map((proposal) => (
                                <div key={proposal.proposalId} className="bg-slate-900/50 rounded-xl shadow-xl p-6 border border-white/5 transition-all hover:border-cyan-500/30">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                        <div className="flex-1">
                                            <h4 className="text-lg font-semibold text-white mb-1">{proposal.description}</h4>
                                            <p className="text-xs text-slate-500 font-mono">ID: {proposal.proposalId.substring(0, 10)}...{proposal.proposalId.substring(proposal.proposalId.length - 10)}</p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                            proposal.state === 'Active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                            proposal.state === 'Pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                            proposal.state === 'Succeeded' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                                            proposal.state === 'Defeated' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                            'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                        }`}>
                                            {proposal.state}
                                        </div>
                                    </div>
                                    
                                    {proposal.state === 'Active' && (
                                        <div className="flex gap-3 mt-4 pt-4 border-t border-white/5">
                                            <button onClick={() => castVote(proposal.proposalId, 1)} className="flex-1 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 transition-colors font-semibold text-sm">
                                                Vote For
                                            </button>
                                            <button onClick={() => castVote(proposal.proposalId, 0)} className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition-colors font-semibold text-sm">
                                                Vote Against
                                            </button>
                                            <button onClick={() => castVote(proposal.proposalId, 2)} className="flex-1 py-2 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/30 rounded-lg text-slate-400 transition-colors font-semibold text-sm">
                                                Abstain
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Governance;
