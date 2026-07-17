import axios from "axios";

export const uploadToFilebase = async (file, onProgress) => {
  // 1. Ask our secure backend for a temporary, 15-minute presigned upload URL
  // This completely hides the Filebase Secret Key from the browser
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

  const { url, key } = await response.json();

  // 2. Upload the file directly to Filebase using the secure presigned URL
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

  // 3. Extract the IPFS CID from the response headers returned by Filebase
  // Note: This relies on the CORS configuration exposing "x-amz-meta-cid"
  const cid = uploadResponse.headers["x-amz-meta-cid"] || uploadResponse.headers["X-Amz-Meta-Cid"];

  if (!cid) {
    throw new Error("Failed to retrieve IPFS CID. Ensure your Filebase CORS settings expose 'x-amz-meta-cid'.");
  }

  return `ipfs://${cid}`;
};
