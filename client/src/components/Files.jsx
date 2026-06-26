import { useState } from "react"
import toast from 'react-hot-toast';
import axios from 'axios';
import CryptoJS from 'crypto-js';

export default function Files({ contract, account, shared, title }) {
  const [allfiles, setAllFiles] = useState([])
  const [otherAddress, setOtherAddress] = useState('')
  const [secretKey, setSecretKey] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  const GetAllFiles = async () => {
    try {
      if (shared) {
        if(!otherAddress){
          toast.error('Please enter an address to view their files')
        } else {
          const files = await contract.display(otherAddress)
          setAllFiles(files)
          toast.success("Shared files loaded!")
        }
      } else {
        const files = await contract.display(account)
        setAllFiles(files)
        toast.success("Your files loaded!")
      }
    } catch (e) {
      toast.error("You don't have access or address is invalid");
      setAllFiles([])
    }
  }

  const deleteFile = async (url) => {
    const task = async () => {
        try {
            const tx = await contract.deleteFile(url);
            await tx.wait();
            await GetAllFiles();
        } catch (err) {
            console.error(err);
            alert("Delete Error: " + (err.message || err.toString()));
            throw err;
        }
    };

    toast.promise(task(), {
        loading: 'Deleting file from blockchain...',
        success: 'File deleted successfully!',
        error: 'Failed to delete file.'
    });
  };

  const decryptAndOpen = async (url) => {
    if (!secretKey) {
        window.open(url, '_blank');
        return;
    }

    const task = async () => {
        const response = await axios.get(url, { responseType: 'text' });
        const ciphertext = response.data;
        
        const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
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
    };

    toast.promise(task(), {
        loading: 'Decrypting file locally...',
        success: 'Decrypted successfully!',
        error: 'Failed to decrypt. Wrong password or not encrypted.'
    });
  };

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-8">{title}</h2>
      
      <div className="flex flex-col md:flex-row gap-4 mb-10 w-full max-w-2xl">
        {shared && (
          <input
            type="text"
            placeholder="Enter Address (0x...)"
            className="glass-input flex-1"
            value={otherAddress}
            onChange={(e) => setOtherAddress(e.target.value)}
          />
        )}
        <button className="btn-primary whitespace-nowrap px-8" onClick={GetAllFiles}>
          {shared ? 'View Shared Files' : 'Load My Files'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-10 w-full justify-between items-start md:items-center">
        <div className="w-full max-w-sm">
          <label className="block text-sm font-medium text-cyan-300 mb-2 text-left ml-1">Decryption Password (Optional)</label>
          <input
            type="password"
            placeholder="Enter password to decrypt files"
            className="glass-input border-cyan-500/50 focus:border-cyan-400"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
          />
        </div>

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
        <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {allfiles.filter(f => selectedFilter === "All" || f.category === selectedFilter).map((fileObj, index) => (
            <li key={index} className="col-span-1 flex flex-col bg-slate-900/50 rounded-xl shadow-xl overflow-hidden border border-white/5 hover:border-cyan-500/30 transition-all duration-300 relative">
              <div className="absolute top-3 right-3 z-10 bg-cyan-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-cyan-500/30 text-xs font-semibold text-cyan-300 shadow-lg">
                {fileObj.category}
              </div>
              <div className="flex-1 p-4 flex flex-col justify-between">
                <div className="w-full h-48 bg-slate-800 rounded-lg overflow-hidden relative mb-4 flex items-center justify-center group">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    src={fileObj.url} 
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
                <p className="text-sm font-medium text-slate-300 truncate w-full mb-3" title={fileObj.url.substring(34)}>
                  {fileObj.url.substring(34)}
                </p>
                <div className="w-full flex flex-col gap-2">
                  <button 
                    onClick={() => decryptAndOpen(fileObj.url)}
                    className="w-full py-2.5 bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/50 rounded-lg text-cyan-400 transition-colors font-semibold text-sm shadow-sm"
                  >
                    {secretKey ? 'Decrypt & Open' : 'Open File'}
                  </button>
                  {!shared && (
                    <button 
                      onClick={() => deleteFile(fileObj.url)}
                      className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 rounded-lg text-red-400 transition-colors font-semibold text-sm shadow-sm"
                    >
                      Delete File
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-slate-700/50 rounded-xl bg-slate-800/20">
          <svg className="mx-auto h-12 w-12 text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          <h3 className="text-sm font-medium text-slate-300">No files loaded</h3>
          <p className="mt-1 text-sm text-slate-500">Click the button above to fetch the files.</p>
        </div>
      )}
    </div>
  )
}
 