
const crypto = require('node:crypto').webcrypto;

// Key from env (simulated)
const SECRET_KEY = '7f8a9b2c3d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a';

function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function run() {
    console.log("Starting Crypto Test...");
    
    // 1. Import Key
    const key = await crypto.subtle.importKey(
        'raw', 
        hexToBytes(SECRET_KEY), 
        { name: 'AES-GCM' }, 
        false, 
        ['encrypt', 'decrypt']
    );
    console.log("Key imported successfully");

    // 2. Encrypt
    const data = { email: "admin@navlens.com", timestamp: Date.now() };
    const json = JSON.stringify(data);
    const encoded = new TextEncoder().encode(json);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv }, 
        key, 
        encoded
    );
    
    const cipherText = bytesToHex(iv) + ':' + bytesToHex(new Uint8Array(encryptedBuffer));
    console.log("Encrypted:", cipherText);
    
    // 3. Decrypt
    const [ivHex, dataHex] = cipherText.split(':');
    const ivDec = hexToBytes(ivHex);
    const dataDec = hexToBytes(dataHex);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivDec },
        key,
        dataDec
    );
    
    const decoded = new TextDecoder().decode(decryptedBuffer);
    console.log("Decrypted:", decoded);
    
    if (decoded === json) {
        console.log("✅ SUCCESS: Decrypted matches original");
    } else {
        console.error("❌ FAILURE: Mismatch");
        process.exit(1);
    }
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
