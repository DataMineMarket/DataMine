import * as secp256k1 from 'https://deno.land/x/secp256k1/mod.ts';
import { createCipheriv, randomBytes } from 'https://deno.land/std/node/crypto.ts';

// function base64ToArrayBuffer(base64) {
//     const binaryString = window.atob(base64);
//     const bytes = new Uint8Array(binaryString.length);
//     for (let i = 0; i < binaryString.length; i++) {
//         bytes[i] = binaryString.charCodeAt(i);
//     }
//     return bytes.buffer;
// }

let enc = new TextEncoder();

// Ethereum public key (hex format)
const publicKeyHex = '0x8b837ab5BA3DA8cEDd6B50977641c6C4dBcC8644'; // Replace with the actual Ethereum public key

// Convert the Ethereum public key hex to a Uint8Array
const publicKey = Uint8Array.from(Buffer.from(publicKeyHex, 'hex'));

// Generate an ephemeral key pair
const ephemeralKeyPair = secp256k1.generateKeyPair();

// Perform ECDH key exchange to derive shared secret
const sharedSecret = secp256k1.ecdh(ephemeralKeyPair.secretKey, publicKey);

// Convert the shared secret to a Buffer
const sharedSecretBuffer = Buffer.from(sharedSecret);

// Encrypt message using AES with the derived shared secret
const message = 'Your secret message to be encrypted';
const iv = randomBytes(16); // Initialization Vector for AES
const cipher = createCipheriv('aes-256-cbc', sharedSecretBuffer, iv);
let encrypted = cipher.update(message, 'utf8', 'hex');
encrypted += cipher.final('hex');

console.log('Encrypted message:', encrypted);
console.log('Initialization Vector:', iv.toString('hex'));


return enc.encode(encrypted)