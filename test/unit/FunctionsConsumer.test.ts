import { assert, expect } from "chai"
import { network, deployments, ethers } from "hardhat"
import { FunctionsConsumer, DataListingFactory, USDCToken } from "../../typechain-types"
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
        let functionsContract: FunctionsConsumer, dataListingFactoryContract: DataListingFactory, usdcTokenContract: USDCToken
        let tokenCryptoKey: CryptoKey
        let dataKey: string
        let lastCID: string
        let secrets: Record<string, string>

        const provideScript = fs.readFileSync("scripts/noRequest.js", "utf-8"); // TODO: use real script
        const decryptScript = fs.readFileSync("scripts/decrypt.js", "utf-8");

        beforeEach(async function () {
            accounts = await ethers.getSigners()
            deployer = accounts[0]
            user = accounts[1]
            await deployments.fixture(["all"])
            secrets = JSON.parse(fs.readFileSync("test/helper/secrets.json", "utf-8"));
            dataListingFactoryContract = await ethers.getContract("DataListingFactory")
            const functionsConsumerAddress = await dataListingFactoryContract.getLastDataListing()
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
            usdcTokenContract = await ethers.getContract("USDCToken")
        })

        describe("constructor", function () {
            it("should deploy and mint USDC", async function () {
                const usdcSupply = await usdcTokenContract.totalSupply();
                const purchaserAddress = await functionsContract.getPurchaser()
                console.log("Purchaser:", purchaserAddress)
                const purchaserBalance = await usdcTokenContract.balanceOf(purchaserAddress)
                expect(purchaserBalance).to.equal(usdcSupply)
            })
            it("should set the price for a data point", async function () {
                const dataPointPrice = await functionsContract.getDataPointPrice()
                console.log(dataPointPrice)
                expect(dataPointPrice).to.equal("1000000000000000000")
            })
            it("should successfully call google API", async function () {
                let enc = new TextEncoder();
                const googleToken = enc.encode(process.env.GOOGLE_ACCESS_TOKEN!);

                const encrypted_google_token = await crypto.subtle.encrypt("RSA-OAEP", tokenCryptoKey, googleToken)

                const response = await simulateScript({
                    source: provideScript,
                    args: [
                        arrayBufferToBase64(encrypted_google_token),
                        dataKey,
                    ],
                    bytesArgs: [],
                    secrets: secrets,
                });

                console.log(response.capturedTerminalOutput)

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
                    expect(lastCID.startsWith("bafkrei")).to.be.true;
                }
            })
            it("should decrypt the data from IPFS", async function () {
                const dataPrivKey = fs.readFileSync("test/helper/dataKey.txt", "utf-8");

                const encodedDataKey = base64ToArrayBuffer(dataPrivKey);
                console.log('lastCID', lastCID)

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

                const aesKeyResponse = await fetch(`https://${lastCID}.ipfs.nftstorage.link/`)
                const aesKeyData = await aesKeyResponse.json()
                const encryptedAesKey = aesKeyData.aesKey
                const encryptedIv = aesKeyData.iv
                const cids = aesKeyData.dataCids

                let encryptedData = ""
                for (let i = 0; i < cids.length; i++) {
                    console.log(cids[i])
                    const resp = await fetch(`https://${cids[i]}.ipfs.nftstorage.link/`)

                    const data = (await resp.json()).data

                    encryptedData += data
                }

                const decryptedAesKey = await crypto.subtle.decrypt(
                    {
                        name: "RSA-OAEP",
                    },
                    importedDataKey,
                    base64ToArrayBuffer(encryptedAesKey)
                )

                const aesKey = await crypto.subtle.importKey(
                    "raw",
                    decryptedAesKey,
                    { name: "AES-GCM", length: 256 },
                    true,
                    ["decrypt"]
                );

                const iv = await crypto.subtle.decrypt(
                    {
                        name: "RSA-OAEP",
                    },
                    importedDataKey,
                    base64ToArrayBuffer(encryptedIv)
                )
                // Decrypt the data
                const decryptedData = new TextDecoder().decode(await crypto.subtle.decrypt(
                    { name: "AES-GCM", iv: new Uint8Array(iv) },
                    aesKey,
                    base64ToArrayBuffer(encryptedData)
                ));


                console.log("decryptedData: ", decryptedData)
                expect(decryptedData.startsWith("{\"session\":[")).to.be.true;
            })
        })
    })
