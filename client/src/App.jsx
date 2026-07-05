import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import "./App.css";
import { ethers } from "ethers";
import { contractAbi, contractAddress } from './utils/constants';
import FileUpload from './components/FileUpload'; 
// import Modal from './components/Modal';
import Display from './components/Display';
import Navigation from './components/Navigation';
import Files from './components/Files';
import Dashboard from './components/Dashboard';
import SharedLinkView from './components/SharedLinkView';
import { Toaster } from 'react-hot-toast';
 

function App() {
  const [account , setAccount] = useState('');
  const [contract , setContract] = useState('');
  const [provider , setProvider] = useState(''); 
  // const [modalOpen, setModalOpen] = useState(false);

  useEffect(()=>{
    if(window.ethereum){
       
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const loadProvider= async()=>{
      if(provider){
        window.ethereum.on('chainChanged', ()=>{
          window.location.reload();
        })

        window.ethereum.on('accountsChanged', ()=>{
          window.location.reload();
        })



        await provider.send("eth_requestAccounts",[])
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        console.log('contractAddress ', contractAddress)
        console.log('abi ', contractAbi)

        const contract = new ethers.Contract(
          contractAddress,contractAbi,signer
        )
        setContract(contract);
        setProvider(provider)

        // E2EE PKI Setup
        try {
            const currentPubKey = await contract.encryptionPublicKeys(address);
            if (!currentPubKey || currentPubKey === "") {
                const pubKey = await window.ethereum.request({
                    method: 'eth_getEncryptionPublicKey',
                    params: [address],
                });
                const tx = await contract.setEncryptionPublicKey(pubKey);
                await tx.wait();
            }
        } catch (e) {
            console.error("Failed to setup E2EE", e);
        }
      }
      else{
        console.log("MetaMask is not installed")

      }
    }


    provider && loadProvider();
  }

  else{
    alert('Please Install Metamusk')
  }

  },
  []

  )


  const urlParams = new URLSearchParams(window.location.search);
  const isShareLink = urlParams.has('hash');

  if (isShareLink) {
    return (
      <div className="relative z-10 min-h-screen pb-20"> 
        <Toaster position="bottom-right" />
        <SharedLinkView />
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen pb-20"> 
      <Toaster position="bottom-right" />
      <div className="pt-20 pb-10 px-4 flex flex-col items-center justify-center text-center">
        <h1 className='text-5xl md:text-7xl font-extrabold tracking-tight mb-6'>
          <span className="text-white">Secure. </span>
          <span className="text-gradient">Decentralized. </span>
          <span className="text-gradient-purple">Storage.</span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-8">
          Upload and share your files securely on the Ethereum blockchain and IPFS.
        </p>
        
        <div className="glass-panel p-8 w-full max-w-xl mx-auto shadow-2xl relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-[1rem] blur opacity-20 -z-10"></div>
          <div className="flex items-center justify-center space-x-2 mb-6 bg-slate-800/50 py-2 px-4 rounded-full w-fit mx-auto border border-white/5">
            <div className={`h-2.5 w-2.5 rounded-full ${account ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></div>
            <p className="text-sm text-slate-300 font-mono tracking-wider">
              {account ? `${account.substring(0, 6)}...${account.substring(38)}` : "Wallet Not Connected"}
            </p>
          </div>
          
          <FileUpload
            account={account}
            provider={provider}
            contract={contract}
          />
        </div>
      </div>
 
      <div id='files' className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <Dashboard contract={contract} account={account} />
        
        <div className="glass-panel p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -z-10 -mr-10 -mt-10"></div>
          <Files contract={contract} account={account} provider={provider} title="My Files" />
        </div>
        
        <div className="glass-panel p-8 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10 -ml-10 -mb-10"></div>
          <Files contract={contract} account={account} provider={provider} title="Shared With Me" shared='1' />
        </div>
      </div>
    </div>
  )
}

export default App
