import { useState } from "react";
import axios from "axios";
import "./FileUpload.css";
import { API_Key, API_Secret, JWT } from "../utils/constants";
import toast from "react-hot-toast";
import CryptoJS from "crypto-js";

const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new window.FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const FileUpload = ({ contract, account, provider }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("No image selected");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [category, setCategory] = useState("General");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (file) {
      setIsUploading(true);
      const uploadTask = async () => {
        let fileDataToUpload = file;

        if (secretKey.trim() !== "") {
            const base64data = await readFileAsDataURL(file);
            const ciphertext = CryptoJS.AES.encrypt(base64data, secretKey).toString();
            const blob = new Blob([ciphertext], { type: 'text/plain' });
            fileDataToUpload = new File([blob], file.name + ".enc", { type: "text/plain" });
        }

        const formData = new FormData();
        formData.append("file", fileDataToUpload);

        const headers = JWT 
          ? {
              Authorization: `Bearer ${JWT}`,
              "Content-Type": "multipart/form-data",
            }
          : {
              pinata_api_key: API_Key,
              pinata_secret_api_key: API_Secret,
              "Content-Type": "multipart/form-data",
            };

        const resFile = await axios({
          method: "post",
          url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
          data: formData,
          headers: headers,
        });
        const ImgHash = `https://gateway.pinata.cloud/ipfs/${resFile.data.IpfsHash}`;

        // If receiver address is provided, use sendFileToReceiver, otherwise add to own account
        if (receiverAddress.trim() !== "") {
            const tx = await contract.sendFileToReceiver(receiverAddress, ImgHash, category);
            await tx.wait();
            return `File sent successfully to ${receiverAddress}`;
        } else {
            const tx = await contract.add(account, ImgHash, category);
            await tx.wait();
            return "File added to your own account successfully";
        }
      };

      toast.promise(uploadTask(), {
        loading: 'Uploading to IPFS & saving to Blockchain...',
        success: (msg) => {
          setFileName("No image selected");
          setFile(null);
          setReceiverAddress("");
          setIsUploading(false);
          return msg;
        },
        error: (err) => {
          console.error(err);
          setIsUploading(false);
          return "Unable to upload image to Pinata or interact with contract";
        }
      });
    } else {
        setFileName("No image selected");
        setFile(null);
        setReceiverAddress("");
    }
  };
  const retrieveFile = (e) => {
    const data = e.target.files[0]; //files array of files object
    // console.log(data);
    const reader = new window.FileReader();
    reader.readAsArrayBuffer(data);
    reader.onloadend = () => {
      setFile(e.target.files[0]);
    };
    setFileName(e.target.files[0].name);
    e.preventDefault();
  };
  return (
    <div className="w-full">
      <form className="flex flex-col space-y-5" onSubmit={handleSubmit}>
        
        {/* Custom File Upload Area */}
        <div className="relative group cursor-pointer">
          <input
            disabled={!account}
            type="file"
            id="file-upload"
            name="data"
            onChange={retrieveFile}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
          />
          <div className={`glass-input border-dashed border-2 flex flex-col items-center justify-center py-8 transition-colors ${file ? 'border-cyan-400 bg-cyan-900/20' : 'border-slate-600 hover:border-cyan-500 hover:bg-slate-800/50'}`}>
            {file ? (
              <svg className="w-12 h-12 text-cyan-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ) : (
              <svg className="w-12 h-12 text-slate-400 group-hover:text-cyan-400 transition-colors mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            )}
            <p className="text-lg font-medium text-white mb-1">
              {file ? "File Selected" : "Click or drag to upload"}
            </p>
            <p className="text-sm text-slate-400 truncate max-w-[250px] md:max-w-xs">
              {fileName}
            </p>
          </div>
        </div>
        
        {/* Receiver Address Input */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2 text-left ml-1">Send to (Optional)</label>
          <input
            type="text"
            placeholder="0x... Receiver Address"
            className="glass-input"
            value={receiverAddress}
            onChange={(e) => setReceiverAddress(e.target.value)}
          />
        </div>

        {/* Category Dropdown */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2 text-left ml-1">Folder / Category</label>
          <select 
            className="glass-input w-full cursor-pointer bg-slate-900/80"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="General">General</option>
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
            <option value="Images">Images</option>
            <option value="Documents">Documents</option>
            <option value="Confidential">Confidential</option>
          </select>
        </div>

        {/* Secret Key Input */}
        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-2 text-left ml-1">Encryption Password (Optional)</label>
          <input
            type="password"
            placeholder="Enter a secret password to encrypt file"
            className="glass-input border-cyan-500/50 focus:border-cyan-400"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-2 ml-1 text-left">If provided, your file will be encrypted before uploading. It cannot be viewed without this password.</p>
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          className="btn-primary w-full py-3 mt-4 text-lg flex justify-center items-center gap-3" 
          disabled={!file || isUploading}
        >
          {isUploading && (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isUploading ? 'Uploading...' : (file ? 'Securely Upload to IPFS' : 'Select a file to upload')}
        </button>
      </form>
    </div>
  );
};
export default FileUpload;