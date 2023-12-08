import fs from "fs"

export const provideScript = fs.readFileSync("./deploy/provideScript.js").toString()
