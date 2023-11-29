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

const fromBase64 = (str) => new Uint8Array(
  atob(str)
    .split("")
    .map((c) => c.charCodeAt(0))
)

let enc = new TextEncoder();
let dec = new TextDecoder();

const private_key = base64ToArrayBuffer(secrets.token_key)

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

const dataKey = args[1]
let dataPubKey = await crypto.subtle.importKey(
  "spki",
  fromBase64(dataKey),
  {
      name: "RSA-OAEP",
      hash: "SHA-256",
  },
  true,
  ["encrypt"]
)

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

const googleFitnessData = enc.encode(JSON.stringify(googleFitnessResponse.data))

const googleFitnessEncrypted = arrayBufferToBase64(await crypto.subtle.encrypt("RSA-OAEP", dataPubKey, googleFitnessData))

// console.log(googleFitnessEncrypted)

// TODO: encrypt this
// const nftAuth = <NFT.storage API Key>

const ipfs_key = base64ToArrayBuffer(secrets.ipfs_key)

const importedIPFSKey = await crypto.subtle.importKey(
  "pkcs8",
  ipfs_key,
  {
    name: "RSA-OAEP",
    hash: "SHA-256",
  },
  true,
  ["decrypt"]
)

const nft_key = base64ToArrayBuffer(args[2]);

const nftAuth = dec.decode(await crypto.subtle.decrypt(
  {
    name: "RSA-OAEP",
  },
  importedIPFSKey,
  nft_key
))

const nftStorageRequest = Functions.makeHttpRequest({
  url: "https://api.nft.storage/upload",
  method: "POST",
  headers: {
    "Content-Type": "*",
    Authorization: `Bearer ${nftAuth}`
  },
  data: {"data": googleFitnessEncrypted},
})

const nftStorageResponse = await nftStorageRequest

console.log(nftStorageResponse.data.value.cid)

/* Decrypt Google Data

const pk = base64ToArrayBuffer(secrets.data_key)

const ik = await crypto.subtle.importKey(
  "pkcs8",
  pk,
  {
    name: "RSA-OAEP",
    hash: "SHA-256",
  },
  true,
  ["decrypt"]
)

const gf = dec.decode(await crypto.subtle.decrypt(
  {
    name: "RSA-OAEP",
  },
  ik,
  base64ToArrayBuffer(googleFitnessEncrypted)
))

console.log(gf)
*/


return enc.encode(nftStorageResponse.data.value.cid)