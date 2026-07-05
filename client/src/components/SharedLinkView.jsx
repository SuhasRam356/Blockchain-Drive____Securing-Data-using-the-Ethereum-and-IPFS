import { useEffect, useState } from 'react';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import toast from 'react-hot-toast';

export default function SharedLinkView() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleSharedFile = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hashUrl = urlParams.get('hash');
      
      if (!hashUrl) return;

      const hashKey = window.location.hash.replace('#key=', '');
      
      if (!hashKey) {
        // Not encrypted, just open
        window.location.href = hashUrl;
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get(hashUrl, { responseType: 'text' });
        const ciphertext = response.data;
        
        const bytes = CryptoJS.AES.decrypt(ciphertext, decodeURIComponent(hashKey));
        const originalDataURL = bytes.toString(CryptoJS.enc.Utf8);
        
        if (!originalDataURL || !originalDataURL.startsWith('data:')) {
            throw new Error("Invalid decryption key or corrupted file");
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
        
        window.location.href = blobUrl;
      } catch (err) {
        console.error(err);
        setError("Failed to decrypt the file. The link might be invalid or corrupted.");
        toast.error("Decryption failed!");
      } finally {
        setLoading(false);
      }
    };

    handleSharedFile();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <div className="glass-panel p-8 max-w-md w-full border border-red-500/30">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button onClick={() => window.location.href = '/'} className="btn-primary w-full py-2">Return Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="glass-panel p-10 flex flex-col items-center text-center max-w-sm w-full">
        <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-semibold text-white mb-2">Decrypting File...</h2>
        <p className="text-sm text-slate-400">Please wait while we securely decrypt this file using zero-knowledge client-side encryption.</p>
      </div>
    </div>
  );
}
