// function base64ToArrayBuffer(base64) {
//     const binaryString = window.atob(base64);
//     const bytes = new Uint8Array(binaryString.length);
//     for (let i = 0; i < binaryString.length; i++) {
//         bytes[i] = binaryString.charCodeAt(i);
//     }
//     return bytes.buffer;
// }
  
let enc = new TextEncoder();

// const dataCIDs = args[0];

console.log(args[1]);

return enc.encode(args[1])