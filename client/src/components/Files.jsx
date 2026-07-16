import { useState } from "react"
import toast from 'react-hot-toast';
import axios from 'axios';
import * as CryptoJSImport from "crypto-js";
const CryptoJS = CryptoJSImport.default || CryptoJSImport;
import { ethers } from 'ethers';
import FileUpload from './FileUpload';
import { decodeStego } from '../utils/steganography';
import { usePasswordModal } from '../context/PasswordContext';

export default function Files({ contract, account, shared, title }) {
  const { requestPassword } = usePasswordModal();
  const [allfiles, setAllFiles] = useState([])
  const [otherAddress, setOtherAddress] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('All');
  
  // Versioning State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateFileUrl, setUpdateFileUrl] = useState(null);
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFileUrl, setHistoryFileUrl] = useState(null);
  const [historyIsStego, setHistoryIsStego] = useState(false);

  const getCategoryInfo = (catString) => {
    if (!catString) return { name: "General", tags: [] };
    const parts = catString.split('|');
    
    // Capitalize first letter to match dropdown exactly, and trim whitespace
    let name = parts[0].trim();
    if (name) {
      name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    } else {
      name = "General";
    }

    const tags = parts.length > 1 && parts[1] ? parts[1].split(',') : [];
    return { name, tags };
  };
  
  // Pagination State
  const [pageOffset, setPageOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalFiles, setTotalFiles] = useState(0);
  const LIMIT = 6;

  const fetchFilesPage = async (address, offset, isLoadMore = false) => {
    try {
      const count = await contract.getFileCount(address);
      const countNum = count.toNumber();
      setTotalFiles(countNum);

      if (countNum > 0) {
        const files = await contract.displayPage(address, offset, LIMIT);
        if (isLoadMore) {
          setAllFiles(prev => [...prev, ...files]);
        } else {
          setAllFiles(files);
        }
        
        setPageOffset(offset + LIMIT);
        setHasMore(offset + LIMIT < countNum);
        
        if (!isLoadMore) toast.success("Files loaded!");
      } else {
        setAllFiles([]);
        setHasMore(false);
        if (!isLoadMore) toast.success("No files found!");
      }
    } catch (e) {
      console.error(e);
      toast.error("You don't have access or address is invalid");
      setAllFiles([]);
      setHasMore(false);
    }
  };

  const GetAllFiles = async () => {
    if (shared) {
      if(!otherAddress){
        toast.error('Please enter an address to view their files')
      } else {
        let finalAddress = otherAddress.trim();
        if (finalAddress.endsWith(".eth")) {
            const ensProvider = new ethers.providers.JsonRpcProvider("https://cloudflare-eth.com");
            const resolved = await ensProvider.resolveName(finalAddress);
            if (resolved) {
                finalAddress = resolved;
            } else {
                toast.error(`Could not resolve ENS name: ${finalAddress}`);
                return;
            }
        }
        await fetchFilesPage(finalAddress, 0, false);
      }
    } else {
      await fetchFilesPage(account, 0, false);
    }
  }

  const loadMoreFiles = async () => {
    let address = account;
    if (shared) {
      let finalAddress = otherAddress.trim();
      if (finalAddress.endsWith(".eth")) {
          const ensProvider = new ethers.providers.JsonRpcProvider("https://cloudflare-eth.com");
          address = await ensProvider.resolveName(finalAddress);
      } else {
          address = finalAddress;
      }
    }
    await fetchFilesPage(address, pageOffset, true);
  };

  const deleteFile = async (url) => {
    const task = async () => {
        try {
            const tx = await contract.deleteFile(url);
            await tx.wait();
            await GetAllFiles(); // reset and fetch first page
        } catch (err) {
            console.error(err);
            alert("Delete Error: " + (err.message || err.toString()));
            throw err;
        }
    };

    toast.promise(task(), {
        loading: 'Deleting file from blockchain...',
        success: 'File deleted successfully!',
        error: (err) => {
            if (err.reason) return `Blockchain error: ${err.reason}`;
            if (err.message && err.message.includes("user rejected transaction")) return "Transaction rejected in MetaMask";
            return 'Failed to delete file.';
        }
    });
  };

  const decryptAndOpen = async (url, isStego = false) => {
    const task = async () => {
        let aesKeyToUse = "";
        
        if (!contract.encryptedAESKeys) {
             // Open file directly if we're not on V4
             window.open(url, '_blank');
             return "File opened";
        }
        
        let fileOwner = account;
        if (shared === '1' && otherAddress) {
            fileOwner = otherAddress.trim();
            if (fileOwner.endsWith(".eth")) {
                const ensProvider = new ethers.providers.JsonRpcProvider("https://cloudflare-eth.com");
                fileOwner = (await ensProvider.resolveName(fileOwner)) || fileOwner;
            }
        }

        let encryptedAesKeyHex = "";
        if (shared === '1') {
            if (contract.getSharedEncryptedAESKey) {
                encryptedAesKeyHex = await contract.getSharedEncryptedAESKey(fileOwner, url, account);
            } else if (contract.sharedEncryptedAESKeys) {
                encryptedAesKeyHex = await contract.sharedEncryptedAESKeys(url, account);
            }
        } else {
            if (contract.getEncryptedAESKey) {
                encryptedAesKeyHex = await contract.getEncryptedAESKey(fileOwner, url);
            } else if (contract.encryptedAESKeys) {
                encryptedAesKeyHex = await contract.encryptedAESKeys(url);
            }
        }
        if (encryptedAesKeyHex && encryptedAesKeyHex !== "MANUAL" && encryptedAesKeyHex !== "") {
             // Decrypt AES key using deterministic signature key
             toast("Deriving deterministic key & decrypting...", { icon: '🔐' });
             const provider = new ethers.providers.Web3Provider(window.ethereum);
             const signer = provider.getSigner();
             const { getDeterministicKey, decryptAESKey } = await import('../utils/encryption');
             
             const secretKey = await getDeterministicKey(account, signer);
             aesKeyToUse = await decryptAESKey(encryptedAesKeyHex, secretKey);
        } else if (!encryptedAesKeyHex || encryptedAesKeyHex === "") {
             // Unencrypted file
             window.open(url, '_blank');
             return "File opened";
        } else {
             throw new Error("No valid E2EE key found.");
        }
        
        const response = await axios.get(url, { responseType: isStego ? 'blob' : 'text' });
        let ciphertext = "";
        
        if (isStego) {
            toast("Extracting hidden data from image pixels (Steganography)...", { icon: '🕵️' });
            try {
                ciphertext = await decodeStego(response.data);
            } catch (err) {
                console.error("Stego decode error:", err);
                throw new Error("Failed to extract hidden data from image.");
            }
        } else {
            ciphertext = response.data;
        }
        
        const bytes = CryptoJS.AES.decrypt(ciphertext, aesKeyToUse);
        const originalDataURL = bytes.toString(CryptoJS.enc.Utf8);
        
        if (!originalDataURL || !originalDataURL.startsWith('data:')) {
            throw new Error("Invalid password or file is not encrypted");
        }
        
        const [meta, base64] = originalDataURL.split(',');
        const mime = meta.match(/:(.*?);/)[1];
        const bstr = atob(base64);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        return "Decrypted successfully!";
    };

    toast.promise(task(), {
        loading: 'Decrypting file locally...',
        success: (msg) => msg,
        error: (err) => {
            if (err.message && err.message.includes("user rejected transaction")) return "Transaction rejected in MetaMask";
            return 'Failed to decrypt. Wrong password or not encrypted.';
        }
    });
  };

  const handleUpdateClick = (fileUrl) => {
      setUpdateFileUrl(fileUrl);
      setShowUpdateModal(true);
  };

  const handleHistoryClick = async (fileObj) => {
      setHistoryFileUrl(fileObj.url);
      setHistoryIsStego(fileObj.category.includes('#Stego'));
      setShowHistoryModal(true);
      setHistoryLoading(true);
      
      let fileOwner = account;
      if (shared === '1' && otherAddress) {
          fileOwner = otherAddress.trim();
          if (fileOwner.endsWith(".eth")) {
              const ensProvider = new ethers.providers.JsonRpcProvider("https://cloudflare-eth.com");
              fileOwner = (await ensProvider.resolveName(fileOwner)) || fileOwner;
          }
      }

      try {
          if (contract.getFileHistory) {
              const history = await contract.getFileHistory(fileOwner, fileObj.url);
              setHistoryList(history);
          } else {
              setHistoryList([]);
              toast.error("Smart Contract V5 is required for Version History");
          }
      } catch (err) {
          console.error(err);
          toast.error("Failed to load history");
      }
      setHistoryLoading(false);
  };

  const handleRollback = async (historyUrl) => {
      if (!contract.updateFile) {
          toast.error("Smart Contract V5 is required");
          return;
      }
      
      const task = async () => {
          let storedSignature, storedHash, storedEncKey;
          
          if (contract.getFileSignature) {
              storedSignature = await contract.getFileSignature(account, historyUrl);
              storedHash = await contract.getFileHash(account, historyUrl);
              storedEncKey = await contract.getEncryptedAESKey(account, historyUrl);
          } else {
              storedSignature = await contract.fileSignatures(historyUrl);
              storedHash = await contract.fileHashes(historyUrl);
              storedEncKey = await contract.encryptedAESKeys ? await contract.encryptedAESKeys(historyUrl) : "";
          }
          
          const tx = await contract.updateFile(historyFileUrl, historyUrl, storedHash, storedSignature, storedEncKey);
          await tx.wait();
          await GetAllFiles();
          setShowHistoryModal(false);
          return "Rolled back successfully!";
      };
      
      toast.promise(task(), {
          loading: "Rolling back version...",
          success: (msg) => msg,
          error: "Failed to rollback"
      });
  };

  // Verify Logic removed

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-8">{title}</h2>
      
      <div className="flex flex-col md:flex-row gap-4 mb-10 w-full max-w-2xl">
        {shared && (
          <input
            type="text"
            placeholder="Enter Address (0x... or .eth)"
            className="glass-input flex-1"
            value={otherAddress}
            onChange={(e) => setOtherAddress(e.target.value)}
          />
        )}
        <button className="btn-primary whitespace-nowrap px-8" onClick={GetAllFiles}>
          {shared ? 'View Shared Files' : 'Load My Files'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-10 w-full justify-end items-start md:items-center">
        <div className="w-full md:w-48">
          <label className="block text-sm font-medium text-slate-300 mb-2 text-left ml-1">Filter by Folder</label>
          <select 
            className="glass-input w-full cursor-pointer bg-slate-900/80"
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
          >
            <option value="All">All Files</option>
            <option value="General">General</option>
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
            <option value="Images">Images</option>
            <option value="Documents">Documents</option>
            <option value="Confidential">Confidential</option>
          </select>
        </div>
      </div>

      {allfiles.length > 0 ? (
        <>
          <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allfiles.filter(f => selectedFilter === "All" || getCategoryInfo(f.category).name === selectedFilter).map((fileObj, index) => {
              const { name: catName, tags } = getCategoryInfo(fileObj.category);
              return (
              <li key={index} className="col-span-1 flex flex-col bg-slate-900/50 rounded-xl shadow-xl overflow-hidden border border-white/5 hover:border-cyan-500/30 transition-all duration-300 relative">
                <div className="absolute top-3 right-3 z-10 bg-cyan-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-cyan-500/30 text-xs font-semibold text-cyan-300 shadow-lg">
                  {catName}
                </div>
                {shared && fileObj.sender && (
                  <div className="absolute top-3 left-3 z-10 bg-purple-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-purple-500/30 text-xs font-semibold text-purple-300 shadow-lg" title={fileObj.sender}>
                    From: {(() => {
                      const addrMap = {
                        '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266': 'Kruthik',
                        '0x70997970c51812dc3a010c7d01b50e0d17dc79c8': 'Suhas'
                      };
                      return addrMap[fileObj.sender.toLowerCase()] || (fileObj.sender.substring(0, 6) + '...' + fileObj.sender.substring(38));
                    })()}
                  </div>
                )}
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div className="w-full h-48 bg-slate-800 rounded-lg overflow-hidden relative mb-4 flex items-center justify-center group">
                    <img 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      src={fileObj.url.replace("cf-ipfs.com", "ipfs.io")} 
                      alt="File preview"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden absolute inset-0 items-center justify-center bg-slate-800 flex-col">
                      <svg className="w-12 h-12 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      <span className="text-sm text-slate-400">File Document</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-300 truncate w-full mb-2" title={fileObj.url.substring(34)}>
                    {fileObj.url.substring(34)}
                  </p>
                  {tags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap w-full mb-3">
                      {tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="w-full flex flex-col gap-2">
                    <button 
                      onClick={() => {
                        const shareUrl = `${window.location.origin}/?hash=${encodeURIComponent(fileObj.url)}`;
                        navigator.clipboard.writeText(shareUrl);
                        toast.success('Shareable Link Copied!');
                      }}
                      className="w-full py-2.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/50 rounded-lg text-purple-400 transition-colors font-semibold text-sm shadow-sm"
                    >
                      Copy Shareable Link
                    </button>
                    <button 
                      onClick={() => decryptAndOpen(fileObj.url, fileObj.category.includes('#Stego'))}
                      className="w-full py-2.5 bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/50 rounded-lg text-cyan-400 transition-colors font-semibold text-sm shadow-sm"
                    >
                      Open File locally
                    </button>
                    
                    <button 
                      onClick={() => handleHistoryClick(fileObj)}
                      className="w-full py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/50 rounded-lg text-blue-400 transition-colors font-semibold text-sm shadow-sm"
                    >
                      View Version History
                    </button>

                    {!shared && (
                      <>
                      <button 
                        onClick={() => handleUpdateClick(fileObj.url)}
                        className="w-full py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 hover:border-yellow-500/50 rounded-lg text-yellow-400 transition-colors font-semibold text-sm shadow-sm"
                      >
                        Update File (New Version)
                      </button>
                      <button 
                        onClick={() => deleteFile(fileObj.url)}
                        className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 rounded-lg text-red-400 transition-colors font-semibold text-sm shadow-sm"
                      >
                        Delete File
                      </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            )})}
          </ul>
          
          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button 
                onClick={loadMoreFiles}
                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-full border border-slate-600 transition-all shadow-md"
              >
                Load More Files ({allfiles.length} of {totalFiles})
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-slate-700/50 rounded-xl bg-slate-800/20">
          <svg className="mx-auto h-12 w-12 text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          <h3 className="text-sm font-medium text-slate-300">No files loaded</h3>
          <p className="mt-1 text-sm text-slate-500">Click the button above to fetch the files.</p>
        </div>
      )}

      {/* Modals */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 relative shadow-2xl">
            <button 
                onClick={() => setShowUpdateModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h3 className="text-2xl font-bold text-white mb-4">Update File Version</h3>
            <p className="text-slate-400 mb-6">Uploading a new file will append a new version to the history while preserving previous versions.</p>
            <FileUpload 
               contract={contract} 
               account={account} 
               provider={window.ethereum ? new ethers.providers.Web3Provider(window.ethereum) : null}
               updateTarget={updateFileUrl}
               onUploadSuccess={() => {
                   setShowUpdateModal(false);
                   GetAllFiles();
               }}
            />
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 relative shadow-2xl max-h-[80vh] overflow-y-auto">
            <button 
                onClick={() => setShowHistoryModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h3 className="text-2xl font-bold text-white mb-4">Version History</h3>
            
            {historyLoading ? (
                <div className="flex justify-center p-10"><div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full"></div></div>
            ) : historyList.length === 0 ? (
                <p className="text-slate-400">No history found or contract not upgraded to V5.</p>
            ) : (
                <div className="space-y-4 mt-6">
                    {historyList.map((ver, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border ${idx === historyList.length - 1 ? 'border-cyan-500 bg-cyan-900/20' : 'border-slate-700 bg-slate-800/50'} flex justify-between items-center`}>
                            <div className="flex flex-col overflow-hidden mr-4">
                                <span className="text-white font-semibold flex items-center gap-2">
                                    Version {idx + 1}
                                    {idx === historyList.length - 1 && <span className="bg-cyan-500 text-xs px-2 py-0.5 rounded-full text-slate-900">Current</span>}
                                </span>
                                <span className="text-slate-400 text-xs mt-1 truncate">{ver.url}</span>
                                {ver.timestamp.toNumber() > 0 && (
                                    <span className="text-slate-500 text-xs mt-1">
                                        {new Date(ver.timestamp.toNumber() * 1000).toLocaleString()}
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex gap-2 shrink-0">
                                <button 
                                    onClick={() => decryptAndOpen(ver.url, historyIsStego)}
                                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-semibold text-white transition-colors"
                                >
                                    View
                                </button>
                                {!shared && idx !== historyList.length - 1 && (
                                    <button 
                                        onClick={() => handleRollback(ver.url)}
                                        className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/40 border border-yellow-500/50 rounded text-xs font-semibold text-yellow-300 transition-colors"
                                    >
                                        Restore
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}