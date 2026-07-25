import axios from "axios";

/**
 * Uploads a file to Filebase IPFS with 3 retries using exponential backoff.
 * @param {File} file 
 * @param {Function} onProgress 
 * @param {number} maxRetries 
 * @returns {Promise<string>} ipfs:// CID URI
 */
export const uploadToFilebase = async (file, onProgress, maxRetries = 3) => {
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    attempt++;
    try {
      // 1. Ask secure backend for a temporary presigned upload URL
      const response = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fileName: file.name,
          fileType: file.type || "application/octet-stream"
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get secure upload URL from server");
      }

      const { url } = await response.json();

      // 2. Upload the file directly to Filebase using the presigned URL
      const uploadResponse = await axios.put(url, file, {
        headers: {
          "Content-Type": file.type || "application/octet-stream"
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            onProgress(progressEvent);
          }
        }
      });

      // 3. Extract IPFS CID from response headers
      const cid = uploadResponse.headers["x-amz-meta-cid"] || uploadResponse.headers["X-Amz-Meta-Cid"];

      if (!cid) {
        throw new Error("Failed to retrieve IPFS CID. Ensure your Filebase CORS settings expose 'x-amz-meta-cid'.");
      }

      return `ipfs://${cid}`;
    } catch (err) {
      lastError = err;
      console.warn(`Filebase upload attempt ${attempt}/${maxRetries} failed:`, err.message);

      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw new Error(`Storage provider unavailable — file encrypted locally, please retry. (Details: ${lastError?.message || 'Network error'})`);
};
