import { useState } from "react";
import axios from "axios";
import "./FileUpload.css";
import { API_Key, API_Secret, JWT } from "../utils/constants";
import toast from "react-hot-toast";
import * as CryptoJSImport from "crypto-js";
const CryptoJS = CryptoJSImport.default || CryptoJSImport;
import { ethers } from "ethers";
import { encodeStego } from "../utils/steganography";

const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new window.FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const FileUpload = ({ contract, account, provider, updateTarget = null, onUploadSuccess = null }) => {
  const [files, setFiles] = useState([]);
  const [fileNames, setFileNames] = useState("No files selected");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [category, setCategory] = useState("General");
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Steganography State
  const [useStego, setUseStego] = useState(false);
  const [coverImage, setCoverImage] = useState(null);
  const [coverImageName, setCoverImageName] = useState("");
  
  // AI State
  const [aiTags, setAiTags] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  const analyzeWithAI = async (file) => {
      if (!GEMINI_API_KEY) return;
      setIsAnalyzing(true);
      try {
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
          const base64 = await readFileAsDataURL(file);
          
          let responseText = "";
          
          if (file.type.startsWith('image/') || file.type === 'application/pdf') {
              const b64Data = base64.split(',')[1];
              const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: [
                      {
                          role: 'user',
                          parts: [
                              { text: 'Analyze this file. Respond with ONLY a raw JSON object containing two fields: "category" (must be exactly one of: General, Work, Personal, Images, Documents, Confidential) and "tags" (an array of 3 short, relevant string tags like #invoice, #receipt, #tax). Do NOT wrap in markdown.' },
                              { inlineData: { data: b64Data, mimeType: file.type } }
                          ]
                      }
                  ]
              });
              responseText = response.text;
          } else if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
              const textData = await file.text();
              const snippet = textData.substring(0, 1500);
              const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: `Analyze this text file snippet: "${snippet}". Respond with ONLY a raw JSON object containing two fields: "category" (must be exactly one of: General, Work, Personal, Images, Documents, Confidential) and "tags" (an array of 3 short, relevant string tags). Do NOT wrap in markdown.`
              });
              responseText = response.text;
          }

          if (responseText) {
              let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
              const parsed = JSON.parse(cleanText);
              if (parsed.category) setCategory(parsed.category);
              if (parsed.tags) setAiTags(parsed.tags);
              toast.success("AI Classification complete!");
          }
      } catch (err) {
          console.error("AI Analysis failed", err);
          // Don't toast error to avoid annoying users if they just upload unsupported files
      }
      setIsAnalyzing(false);
  };

  const retrieveFile = (e) => {
    const data = Array.from(e.target.files);
    
    // File size validation (Max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; 
    for (let i = 0; i < data.length; i++) {
        if (data[i].size > MAX_FILE_SIZE) {
            toast.error(`File "${data[i].name}" exceeds the 10MB limit.`);
            e.target.value = null; // Reset input
            setFileNames("No files selected");
            setFiles([]);
            setAiTags([]);
            return;
        }
    }

    if (data.length > 0) {
      setFiles(data);
      if (data.length === 1) {
        setFileNames(data[0].name);
      } else {
        setFileNames(`${data.length} files selected`);
      }
      // Trigger AI Analysis on first file
      setAiTags([]); // reset
      analyzeWithAI(data[0]);
    }
    e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length > 0) {
      setIsUploading(true);
      const uploadTask = async () => {
        let uploadedHashes = [];
        let finalFilesData = [];
        let singleFileSignature = null;
        let singleFileHashHex = null;

        if (files.length === 1) {
            let finalReceiver = receiverAddress.trim() === "" ? account : receiverAddress.trim();
            if (finalReceiver.endsWith(".eth")) {
                const ensProvider = new ethers.providers.JsonRpcProvider("https://cloudflare-eth.com");
                const resolved = await ensProvider.resolveName(finalReceiver);
                if (resolved) finalReceiver = resolved;
                else throw new Error(`Could not resolve ENS name: ${finalReceiver}`);
            } else if (!ethers.utils.isAddress(finalReceiver)) {
                throw new Error(`Invalid Ethereum address: ${finalReceiver}`);
            }

            // E2EE Flow
            let encryptedAesKeyHex = "";
            let fileDataToUpload = files[0];
            
            // PKI Asymmetric E2EE
            toast("Fetching encryption key & encrypting...", { icon: '🔐' });
            const pubKey = await contract.encryptionPublicKeys(finalReceiver);
            if (!pubKey || pubKey === "") {
                throw new Error(`${finalReceiver} has not published their Encryption Public Key. They must connect to the app first.`);
            }
                 
                 // Generate random AES key
                 const aesKey = ethers.utils.hexlify(ethers.utils.randomBytes(32));
                 
                 // Encrypt file with AES key
                 const base64data = await readFileAsDataURL(files[0]);
                 const ciphertext = CryptoJS.AES.encrypt(base64data, aesKey).toString();
                 
                 if (useStego) {
                     if (!coverImage) throw new Error("Please select a cover image for steganography.");
                     toast("Hiding ciphertext inside cover image (Steganography)...", { icon: '🕵️' });
                     fileDataToUpload = await encodeStego(coverImage, ciphertext);
                 } else {
                     const blob = new Blob([ciphertext], { type: 'text/plain' });
                     fileDataToUpload = new File([blob], files[0].name + ".enc", { type: "text/plain" });
                 }

                 // Encrypt AES key with Receiver's Public Key using new centralized module
                 const { encryptAESKey } = await import('../utils/encryption');
                 encryptedAesKeyHex = await encryptAESKey(aesKey, pubKey);

            // Signature verification removed - Blockchain inherently verifies sender via msg.sender
            singleFileHashHex = ethers.constants.HashZero;
            singleFileSignature = "0x";

            finalFilesData.push(fileDataToUpload);

            const formData = new FormData();
            formData.append("file", fileDataToUpload);
            const headers = JWT 
              ? { Authorization: `Bearer ${JWT}`, "Content-Type": "multipart/form-data" }
              : { pinata_api_key: API_Key, pinata_secret_api_key: API_Secret, "Content-Type": "multipart/form-data" };

            const resFile = await axios({
              method: "post",
              url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
              data: formData,
              headers: headers,
              onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percentCompleted);
              }
            });
            uploadedHashes.push(`https://gateway.pinata.cloud/ipfs/${resFile.data.IpfsHash}`);
            
            const currentTags = useStego && !aiTags.includes('#Stego') ? [...aiTags, '#Stego'] : aiTags;
            const combinedCategory = currentTags.length > 0 ? `${category}|${currentTags.join(',')}` : category;

            if (updateTarget) {
                if (contract.updateFile) {
                    const tx = await contract.updateFile(updateTarget, uploadedHashes[0], singleFileHashHex, singleFileSignature, encryptedAesKeyHex);
                    await tx.wait();
                    if (onUploadSuccess) onUploadSuccess();
                    return `File version successfully updated!`;
                } else {
                    throw new Error("Smart Contract V5 is required for File Versioning");
                }
            } else if (receiverAddress.trim() !== "") {
                if (contract.sendFileToReceiverWithE2EE) {
                    const tx = await contract.sendFileToReceiverWithE2EE(finalReceiver, uploadedHashes[0], combinedCategory, singleFileHashHex, singleFileSignature, encryptedAesKeyHex);
                    await tx.wait();
                } else {
                    const tx = await contract.sendFileToReceiverWithSignature(finalReceiver, uploadedHashes[0], combinedCategory, singleFileHashHex, singleFileSignature);
                    await tx.wait();
                }
                return `File E2EE locked and sent to ${finalReceiver}.`;
            } else {
                if (contract.addWithE2EE) {
                    const tx = await contract.addWithE2EE(uploadedHashes[0], combinedCategory, singleFileHashHex, singleFileSignature, encryptedAesKeyHex);
                    await tx.wait();
                } else {
                    const tx = await contract.addWithSignature(uploadedHashes[0], combinedCategory, singleFileHashHex, singleFileSignature);
                    await tx.wait();
                }
                return `File securely added to your E2EE Vault!`;
            }
        } else {
            // Batch flow (unchanged)
            for (let i = 0; i < files.length; i++) {
              let fileDataToUpload = files[i];

              finalFilesData.push(fileDataToUpload);

              const formData = new FormData();
              formData.append("file", fileDataToUpload);

              const headers = JWT 
                ? { Authorization: `Bearer ${JWT}`, "Content-Type": "multipart/form-data" }
                : { pinata_api_key: API_Key, pinata_secret_api_key: API_Secret, "Content-Type": "multipart/form-data" };

              const resFile = await axios({
                method: "post",
                url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
                data: formData,
                headers: headers,
                onUploadProgress: (progressEvent) => {
                  const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                  setUploadProgress(percentCompleted);
                }
              });
              const ImgHash = `https://gateway.pinata.cloud/ipfs/${resFile.data.IpfsHash}`;
              uploadedHashes.push(ImgHash);
            }
            
            const combinedCategory = aiTags.length > 0 ? `${category}|${aiTags.join(',')}` : category;
            
            if (receiverAddress.trim() !== "") {
                let finalReceiver = receiverAddress.trim();
                if (finalReceiver.endsWith(".eth")) {
                    const ensProvider = new ethers.providers.JsonRpcProvider("https://cloudflare-eth.com");
                    finalReceiver = await ensProvider.resolveName(finalReceiver);
                }
                const tx = await contract.sendFileToReceiverBatch(finalReceiver, uploadedHashes, combinedCategory);
                await tx.wait();
                return `${files.length} file(s) sent successfully to ${finalReceiver}`;
            } else {
                const tx = await contract.addBatch(uploadedHashes, combinedCategory);
                await tx.wait();
                return `${files.length} file(s) added successfully`;
            }
        }
      };

      toast.promise(uploadTask(), {
        loading: `Uploading ${files.length} file(s) to IPFS & saving to Blockchain...`,
        success: (msg) => {
          setFileNames("No files selected");
          setFiles([]);
          setReceiverAddress("");
          setIsUploading(false);
          setUploadProgress(0);
          setAiTags([]);
          setUseStego(false);
          setCoverImage(null);
          setCoverImageName("");
          return msg;
        },
        error: (err) => {
          console.error(err);
          setIsUploading(false);
          setUploadProgress(0);
          
          let errorMsg = err.message || "Unable to upload files to Pinata or interact with contract";
          if (err.reason) {
              errorMsg = `Blockchain error: ${err.reason}`;
          } else if (err.message && err.message.includes("user rejected transaction")) {
              errorMsg = "Transaction rejected in MetaMask";
          }
          
          return errorMsg;
        }
      });
    } else {
        setFileNames("No files selected");
        setFiles([]);
        setReceiverAddress("");
        setUploadProgress(0);
        setAiTags([]);
        setUseStego(false);
        setCoverImage(null);
        setCoverImageName("");
    }
  };

  return (
    <div className="w-full">
      <form className="flex flex-col space-y-5" onSubmit={handleSubmit}>
        
        {/* Custom File Upload Area */}
        <div className="relative group cursor-pointer">
          <input
            disabled={!account}
            type="file"
            multiple
            id="file-upload"
            name="data"
            onChange={retrieveFile}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
          />
          <div className={`glass-input border-dashed border-2 flex flex-col items-center justify-center py-8 transition-colors ${files.length > 0 ? 'border-cyan-400 bg-cyan-900/20' : 'border-slate-600 hover:border-cyan-500 hover:bg-slate-800/50'}`}>
            {isAnalyzing ? (
              <svg className="w-12 h-12 text-cyan-400 mb-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            ) : files.length > 0 ? (
              <svg className="w-12 h-12 text-cyan-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ) : (
              <svg className="w-12 h-12 text-slate-400 group-hover:text-cyan-400 transition-colors mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            )}
            <p className="text-lg font-medium text-white mb-1">
              {isAnalyzing ? "AI is analyzing your file..." : files.length > 0 ? "Files Selected" : "Click or drag to upload"}
            </p>
            <p className="text-sm text-slate-400 truncate max-w-[250px] md:max-w-xs">
              {fileNames}
            </p>
            {aiTags.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap justify-center">
                {aiTags.map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Steganography Toggle & Cover Image Input */}
        {files.length === 1 && (
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-white font-medium">Use Steganography</h4>
                <p className="text-xs text-slate-400">Hide the encrypted file inside a normal picture (Spy Mode)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={useStego} onChange={() => setUseStego(!useStego)} />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
              </label>
            </div>
            
            {useStego && (
              <div className="relative group cursor-pointer mt-3">
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={(e) => {
                      if (e.target.files.length > 0) {
                          setCoverImage(e.target.files[0]);
                          setCoverImageName(e.target.files[0].name);
                      }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`glass-input border-dashed border-2 flex items-center justify-between py-3 px-4 transition-colors ${coverImage ? 'border-purple-400 bg-purple-900/20' : 'border-slate-600 hover:border-purple-500 hover:bg-slate-800/50'}`}>
                  <div className="flex items-center gap-3">
                    <svg className={`w-6 h-6 ${coverImage ? 'text-purple-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <span className="text-sm text-slate-300">{coverImageName || "Select Cover Image (PNG/JPG)"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
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

        {/* Submit Button */}
        <div>
          <button 
            type="submit" 
            className="btn-primary w-full py-3 mt-4 text-lg flex justify-center items-center gap-3 relative overflow-hidden" 
            disabled={files.length === 0 || isUploading}
          >
            {isUploading && (
              <div className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300 z-0" style={{ width: `${uploadProgress}%` }}></div>
            )}
            <div className="flex items-center gap-3 z-10 relative">
              {isUploading && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isUploading ? `Uploading ${files.length} file(s) - ${uploadProgress}%` : (files.length > 0 ? `Securely Upload ${files.length} File(s)` : 'Select files to upload')}
            </div>
          </button>
        </div>
      </form>
    </div>
  );
};
export default FileUpload;