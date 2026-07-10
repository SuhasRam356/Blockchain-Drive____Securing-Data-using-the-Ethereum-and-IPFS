/**
 * Steganography Utility
 * Uses Adaptive Edge-Based Steganography to hide data in complex texture regions.
 */

const END_DELIMITER = "###STEGO_END###";

// Edge detection using the 7 MSBs to ensure determinism before and after LSB embedding
function isHighFrequency(data, index, width, height) {
    const x = Math.floor((index / 4) % width);
    const y = Math.floor((index / 4) / width);
    
    // Skip 1-pixel borders
    if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) return false;
    
    const current = data[index] & 0xFE;
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
        
        const processImage = (img) => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Count capacity based on high frequency pixels
            let capacityBits = 0;
            for (let i = 0; i < data.length; i += 4) {
                if (isHighFrequency(data, i, canvas.width, canvas.height)) capacityBits++; // R
                if (isHighFrequency(data, i + 1, canvas.width, canvas.height)) capacityBits++; // G
                if (isHighFrequency(data, i + 2, canvas.width, canvas.height)) capacityBits++; // B
            }
            
            if (secretBytes.length * 8 > capacityBits) {
                reject(new Error(`Cover image too smooth or small. Can hold ${Math.floor(capacityBits/8)} bytes, need ${secretBytes.length}.`));
                return;
            }
            
            let byteIndex = 0;
            let bitIndex = 0;
            
            for (let i = 0; i < data.length && byteIndex < secretBytes.length; i += 4) {
                for (let j = 0; j < 3; j++) {
                    if (byteIndex < secretBytes.length && isHighFrequency(data, i + j, canvas.width, canvas.height)) {
                        const bit = (secretBytes[byteIndex] >> (7 - bitIndex)) & 1;
                        data[i + j] = (data[i + j] & ~255) | (data[i + j] & 254) | bit; // Ensure we only modify LSB
                        
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
            // Automatically select a random image
            const bitsNeeded = secretBytes.length * 8;
            // Real images have lower high-frequency pixels than pure noise. Assume 0.5 bits per pixel on average
            const pixelsNeeded = Math.ceil(bitsNeeded / 0.5);
            const paddedPixels = Math.floor(pixelsNeeded * 1.5) + 4000; 
            const size = Math.max(300, Math.ceil(Math.sqrt(paddedPixels)));
            
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0);
                
                // Ensure capacity by adding a subtle noise overlay (film grain effect)
                const imageData = ctx.getImageData(0, 0, size, size);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.max(0, Math.min(255, data[i] + (Math.random() * 30 - 15)));     // R
                    data[i+1] = Math.max(0, Math.min(255, data[i+1] + (Math.random() * 30 - 15))); // G
                    data[i+2] = Math.max(0, Math.min(255, data[i+2] + (Math.random() * 30 - 15))); // B
                }
                ctx.putImageData(imageData, 0, 0);
                
                const noisyImg = new Image();
                noisyImg.onload = () => processImage(noisyImg);
                noisyImg.onerror = () => reject(new Error("Failed to load noisy image"));
                noisyImg.src = canvas.toDataURL("image/png");
            };
            img.onerror = () => reject(new Error("Failed to fetch random image"));
            const randSeed = Math.floor(Math.random() * 1000000);
            img.src = `https://picsum.photos/${size}/${size}?random=${randSeed}`;
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
            
            for (let i = 0; i < data.length; i += 4) {
                for (let j = 0; j < 3; j++) {
                    if (isHighFrequency(data, i + j, canvas.width, canvas.height)) {
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
