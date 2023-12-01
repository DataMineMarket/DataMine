import { assert, expect } from "chai"
import { network, deployments, ethers } from "hardhat"
import { FunctionsConsumer, DataListingFactory } from "../../typechain-types"
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers"
import fs from "fs";
import {
    simulateScript,
    decodeResult,
    ReturnType,
} from "@chainlink/functions-toolkit";
import * as crypto from "crypto"
import { fromBase64, arrayBufferToBase64, base64ToArrayBuffer } from "../../utils/conversions"
const { ethers: ethersv5 } = require("ethers-v5")

!(network.name == "hardhat")
    ? describe.skip : describe("Functions Unit Tests", function () {
        let accounts: HardhatEthersSigner[], deployer: HardhatEthersSigner, user: HardhatEthersSigner
        let functionsContract: FunctionsConsumer, dataListingFactoryContract: DataListingFactory
        let tokenCryptoKey: CryptoKey, ipfsCryptoKey: CryptoKey
        let dataKey: string
        let lastCID: string
        let secrets: Record<string, string>

        const provideScript = fs.readFileSync("scripts/provide.js", "utf-8");
        const decryptScript = fs.readFileSync("scripts/decrypt.js", "utf-8");

        beforeEach(async function () {
            accounts = await ethers.getSigners()
            deployer = accounts[0]
            user = accounts[1]
            await deployments.fixture(["all"])
            secrets = JSON.parse(fs.readFileSync("test/helper/secrets.json", "utf-8"));
            dataListingFactoryContract = await ethers.getContract("DataListingFactory")
            const functionsConsumerAddress = await dataListingFactoryContract.getLastDataListing()
            console.log(functionsConsumerAddress)
            functionsContract = await ethers.getContractAt("FunctionsConsumer", functionsConsumerAddress) as unknown as FunctionsConsumer
            const tokenKey = await functionsContract.getTokenKey();
            tokenCryptoKey = await crypto.subtle.importKey(
                "spki",
                fromBase64(tokenKey),
                {
                    name: "RSA-OAEP",
                    hash: "SHA-256",
                },
                true,
                ["encrypt"]
            )
            dataKey = await functionsContract.getDataKey();
        })

        describe("constructor", function () {
            it("should successfully call google API", async function () {
                let enc = new TextEncoder();
                const googleToken = enc.encode(process.env.GOOGLE_ACCESS_TOKEN!);
                const ipfsKey = enc.encode(process.env.NFT_STORAGE_API_TOKEN!);

                const encrypted_google_token = await crypto.subtle.encrypt("RSA-OAEP", tokenCryptoKey, googleToken)
                const encrypted_ipfs_key = await crypto.subtle.encrypt("RSA-OAEP", tokenCryptoKey, ipfsKey)

                const response = await simulateScript({
                    source: provideScript,
                    args: [
                        arrayBufferToBase64(encrypted_google_token),
                        dataKey,
                        arrayBufferToBase64(encrypted_ipfs_key)
                    ],
                    bytesArgs: [],
                    secrets: secrets,
                });

                const errorString = response.errorString;
                expect(errorString).to.be.undefined;

                const responseBytesHexstring = response.responseBytesHexstring;
                if (ethersv5.utils.arrayify(responseBytesHexstring).length > 0) {
                    const decodedResponse = decodeResult(
                        response.responseBytesHexstring!,
                        ReturnType.string
                    );
                    console.log(
                        `\n✅ Decoded response: `,
                        decodedResponse
                    );
                    lastCID = decodedResponse as string;
                    console.log(lastCID);
                    expect(lastCID.startsWith("bafkrei")).to.be.true;
                }
            })
            it("should decrypt the data from IPFS", async function () {
                const dataPrivKey = fs.readFileSync("test/helper/dataKey.txt", "utf-8");

                const encodedDataKey = base64ToArrayBuffer(dataPrivKey);

                const importedDataKey = await crypto.subtle.importKey(
                    "pkcs8",
                    encodedDataKey,
                    {
                        name: "RSA-OAEP",
                        hash: "SHA-256",
                    },
                    true,
                    ["decrypt"]
                )

                const resp = await fetch(`https://${lastCID}.ipfs.nftstorage.link/`)

                const encryptedData = (await resp.json()).data

                const data = new TextDecoder().decode(await crypto.subtle.decrypt(
                    {
                        name: "RSA-OAEP",
                    },
                    importedDataKey,
                    base64ToArrayBuffer(encryptedData)
                ))

                console.log(lastCID, data)
                expect(data.startsWith("{\"session\":[]")).to.be.true;
            })
        })
    })
