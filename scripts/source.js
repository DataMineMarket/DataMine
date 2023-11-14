function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

const toBase64 = (arr) => btoa(String.fromCodePoint(...arr))

let enc = new TextEncoder();
let dec = new TextDecoder();

const private_key = base64ToArrayBuffer(secrets.private_key)

const importedKey = await crypto.subtle.importKey(
  "pkcs8",
  private_key,
  {
    name: "RSA-OAEP",
    hash: "SHA-256",
  },
  true,
  ["decrypt"]
)

const encrypted_token = base64ToArrayBuffer(args[0]);

const accessToken = dec.decode(await crypto.subtle.decrypt(
  {
    name: "RSA-OAEP",
  },
  importedKey,
  encrypted_token
))

// Build the HTTP request object for Google Fitness API
const googleFitnessRequest = Functions.makeHttpRequest({
  url: `https://www.googleapis.com/fitness/v1/users/me/sessions`,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
});

const googleFitnessResponse = await googleFitnessRequest;

if (googleFitnessResponse.error) {
  throw new Error("GoogleFitness Error")
}
const googleFitnessData = JSON.stringify(googleFitnessResponse);
console.log(googleFitnessData)
return enc.encode("success")
