/**
 * Steganography Utility
 * Uses Adaptive Edge-Based Steganography to hide data in complex texture regions.
 * Optimized for high performance and minimal file sizes.
 */

const END_DELIMITER = "###STEGO_END###";

// Edge detection using the 7 MSBs to ensure determinism before and after LSB embedding
// Optimized to take x and y directly to avoid division overhead in tight loops
function isHighFrequency(data, index, width, height, x, y) {
    // Skip 1-pixel borders
    if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) return false;
    
    const left = data[index - 4] & 0xFE;
    const right = data[index + 4] & 0xFE;
    const up = data[index - width * 4] & 0xFE;
    const down = data[index + width * 4] & 0xFE;
    
    const dx = Math.abs(right - left);
    const dy = Math.abs(down - up);
    
    // Threshold for complex texture
    return (dx + dy) > 20; 
}

export const encodeStego = (coverImageFile, secretText) => {
    return new Promise((resolve, reject) => {
        const fullSecretText = secretText + END_DELIMITER;
        const secretBytes = new TextEncoder().encode(fullSecretText);
        
        const processImage = (img, generatedSize = null) => {
            const canvas = document.createElement('canvas');
            const width = generatedSize || img.width;
            const height = generatedSize || img.height;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            if (img) {
                ctx.drawImage(img, 0, 0);
            } else {
                ctx.fillStyle = "black";
                ctx.fillRect(0, 0, width, height);
            }
            
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            
            if (!img) {
                // Generate a random dominant base color for this specific image
                // so that multiple generated images look visually distinct from each other.
                const baseR = Math.floor(Math.random() * 156) + 50;
                const baseG = Math.floor(Math.random() * 156) + 50;
                const baseB = Math.floor(Math.random() * 156) + 50;
                
                // Add high-amplitude noise to the base color to ensure it passes 
                // the `isHighFrequency` edge-detection check for data embedding.
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, Math.max(0, baseR + (Math.random() > 0.5 ? 50 : -50)));     // R
                    data[i+1] = Math.min(255, Math.max(0, baseG + (Math.random() > 0.5 ? 50 : -50)));   // G
                    data[i+2] = Math.min(255, Math.max(0, baseB + (Math.random() > 0.5 ? 50 : -50)));   // B
                    data[i+3] = 255; // Alpha
                }
            }
            
            let byteIndex = 0;
            let bitIndex = 0;
            let x = 0;
            let y = 0;
            
            for (let i = 0; i < data.length; i += 4) {
                if (byteIndex >= secretBytes.length) break;
                
                for (let j = 0; j < 3; j++) {
                    if (byteIndex < secretBytes.length && isHighFrequency(data, i + j, width, height, x, y)) {
                        const bit = (secretBytes[byteIndex] >> (7 - bitIndex)) & 1;
                        data[i + j] = (data[i + j] & ~255) | (data[i + j] & 254) | bit; // Ensure we only modify LSB
                        
                        bitIndex++;
                        if (bitIndex === 8) {
                            bitIndex = 0;
                            byteIndex++;
                        }
                    }
                }
                
                x++;
                if (x >= width) {
                    x = 0;
                    y++;
                }
            }
            
            if (byteIndex < secretBytes.length) {
                reject(new Error(`Cover image too smooth or small. Can't hold the required data.`));
                return;
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            canvas.toBlob((blob) => {
                if (!blob) return reject(new Error("Failed to create stego blob"));
                const fileName = coverImageFile ? coverImageFile.name.split('.')[0] + "_stego.png" : "auto_stego.png";
                resolve(new File([blob], fileName, { type: "image/png" }));
            }, 'image/png');
        };

        if (coverImageFile) {
            const img = new Image();
            img.onload = () => processImage(img);
            img.onerror = () => reject(new Error("Failed to load cover image"));
            const reader = new FileReader();
            reader.onload = (e) => img.src = e.target.result;
            reader.onerror = () => reject(new Error("Failed to read cover image"));
            reader.readAsDataURL(coverImageFile);
        } else {
            // Generate exact sizing mathematically
            const bitsNeeded = secretBytes.length * 8;
            // With random noise, about 95% of pixels are high-frequency.
            // We use a conservative 2 bits per pixel just to be absolutely safe.
            const pixelsNeeded = Math.ceil(bitsNeeded / 2);
            const paddedPixels = pixelsNeeded + 4000; // Account for border pixels skipped by isHighFrequency
            const size = Math.max(10, Math.ceil(Math.sqrt(paddedPixels)));
            
            processImage(null, size);
        }
    });
};

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
            
            // Assume max possible bytes is data length / 8
            const extractedBytes = new Uint8Array(Math.floor(data.length / 8));
            let byteCount = 0;
            
            const delimiterBytes = new TextEncoder().encode(END_DELIMITER);
            const delimiterLen = delimiterBytes.length;
            const windowBytes = new Uint8Array(delimiterLen);
            
            let currentByte = 0;
            let bitIndex = 0;
            let x = 0;
            let y = 0;
            
            for (let i = 0; i < data.length; i += 4) {
                for (let j = 0; j < 3; j++) {
                    if (isHighFrequency(data, i + j, canvas.width, canvas.height, x, y)) {
                        const bit = data[i + j] & 1;
                        currentByte = (currentByte << 1) | bit;
                        
                        bitIndex++;
                        if (bitIndex === 8) {
                            extractedBytes[byteCount++] = currentByte;
                            
                            // Shift window left
                            for (let k = 0; k < delimiterLen - 1; k++) windowBytes[k] = windowBytes[k + 1];
                            windowBytes[delimiterLen - 1] = currentByte;
                            
                            // Check match
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
                                    resolve(new TextDecoder().decode(finalBytes));
                                    return;
                                }
                            }
                            currentByte = 0;
                            bitIndex = 0;
                        }
                    }
                }
                x++;
                if (x >= canvas.width) {
                    x = 0;
                    y++;
                }
            }
            reject(new Error("No hidden data found or image corrupted."));
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load stego image"));
        };
        img.src = objectUrl;
    });
};
