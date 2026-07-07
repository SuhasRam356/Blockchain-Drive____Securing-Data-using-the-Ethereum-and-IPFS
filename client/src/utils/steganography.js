/**
 * Steganography Utility
 * Hides text data inside the Least Significant Bits (LSB) of an image's pixels.
 */

// Helper to convert a string to a binary string
function textToBinary(text) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += bytes[i].toString(2).padStart(8, '0');
    }
    return binary;
}

// Helper to convert binary string to text
function binaryToText(binary) {
    const bytes = new Uint8Array(Math.floor(binary.length / 8));
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(binary.substring(i * 8, (i + 1) * 8), 2);
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
}

const END_DELIMITER = "###STEGO_END###";

/**
 * Encodes secret text into a cover image using LSB.
 * @param {File} coverImageFile - The image to use as cover
 * @param {string} secretText - The ciphertext to hide
 * @returns {Promise<File>} - A new PNG File containing the hidden data
 */
export const encodeStego = (coverImageFile, secretText) => {
    return new Promise((resolve, reject) => {
        const fullSecretText = secretText + END_DELIMITER;
        const encoder = new TextEncoder();
        const secretBytes = encoder.encode(fullSecretText);
        
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Each pixel has 4 values (R, G, B, A). We use R, G, B for 3 bits per pixel.
            const maxCapacityBytes = Math.floor((data.length / 4) * 3 / 8);
            
            if (secretBytes.length > maxCapacityBytes) {
                reject(new Error(`Cover image is too small. Image can hold ${maxCapacityBytes} bytes, but secret requires ${secretBytes.length} bytes. Please choose a larger cover image or smaller secret file.`));
                return;
            }
            
            let byteIndex = 0;
            let bitIndex = 0;
            
            // Loop through pixels
            for (let i = 0; i < data.length && byteIndex < secretBytes.length; i += 4) {
                for (let j = 0; j < 3; j++) { // R, G, B
                    if (byteIndex < secretBytes.length) {
                        const bit = (secretBytes[byteIndex] >> (7 - bitIndex)) & 1;
                        data[i + j] = (data[i + j] & ~1) | bit;
                        
                        bitIndex++;
                        if (bitIndex === 8) {
                            bitIndex = 0;
                            byteIndex++;
                        }
                    }
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Failed to create stego image blob"));
                    return;
                }
                const stegoFile = new File([blob], coverImageFile.name.split('.')[0] + "_stego.png", { type: "image/png" });
                resolve(stegoFile);
            }, 'image/png');
        };
        
        img.onerror = () => reject(new Error("Failed to load cover image"));
        
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error("Failed to read cover image file"));
        reader.readAsDataURL(coverImageFile);
    });
};

/**
 * Decodes secret text from a stego image.
 * @param {Blob|File} stegoImageBlob - The stego image
 * @returns {Promise<string>} - The extracted secret text
 */
export const decodeStego = (stegoImageBlob) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(stegoImageBlob);
        
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            const maxCapacityBytes = Math.floor((data.length / 4) * 3 / 8);
            const extractedBytes = new Uint8Array(maxCapacityBytes);
            let byteCount = 0;
            
            const delimiterBytes = new TextEncoder().encode(END_DELIMITER);
            const delimiterLen = delimiterBytes.length;
            const windowBytes = new Uint8Array(delimiterLen);
            
            let currentByte = 0;
            let bitIndex = 0;
            
            for (let i = 0; i < data.length; i += 4) {
                for (let j = 0; j < 3; j++) { // R, G, B
                    const bit = data[i + j] & 1;
                    currentByte = (currentByte << 1) | bit;
                    
                    bitIndex++;
                    if (bitIndex === 8) {
                        extractedBytes[byteCount++] = currentByte;
                        
                        // Shift window left
                        for (let k = 0; k < delimiterLen - 1; k++) {
                            windowBytes[k] = windowBytes[k + 1];
                        }
                        windowBytes[delimiterLen - 1] = currentByte;
                        
                        // Check match if we have enough bytes
                        if (byteCount >= delimiterLen) {
                            let isMatch = true;
                            for (let k = 0; k < delimiterLen; k++) {
                                if (windowBytes[k] !== delimiterBytes[k]) {
                                    isMatch = false;
                                    break;
                                }
                            }
                            
                            if (isMatch) {
                                const finalBytes = extractedBytes.slice(0, byteCount - delimiterLen);
                                const decodedString = new TextDecoder().decode(finalBytes);
                                resolve(decodedString);
                                return;
                            }
                        }
                        
                        currentByte = 0;
                        bitIndex = 0;
                    }
                }
            }
            
            reject(new Error("No hidden data found or image is corrupted."));
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load stego image"));
        };
        
        img.src = objectUrl;
    });
};
