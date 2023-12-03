import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { assert, expect } from "chai"
import { network, deployments, ethers } from "hardhat"
import { DataListingFactory, FunctionsConsumer } from "../../typechain-types"
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers"
import fs from "fs";
import * as crypto from "crypto"
import { fromBase64, arrayBufferToBase64, base64ToArrayBuffer } from "../../utils/conversions"
import {
    SubscriptionManager,
    SecretsManager,
    simulateScript,
    ResponseListener,
    ReturnType,
    decodeResult,
    createGist,
    deleteGist,
    FulfillmentCode,
} from "@chainlink/functions-toolkit"
const { ethers: ethersv5 } = require("ethers-v5")


!developmentChains.includes(network.name)
    ? describe.skip
    : describe("DataNexus Staging Tests", function () {
        let accounts: HardhatEthersSigner[], deployer: HardhatEthersSigner, user: HardhatEthersSigner
        let functionsContract: FunctionsConsumer, functionsConsumer: FunctionsConsumer
        let tokenCryptoKey: CryptoKey
        let dataKey: string
        let secrets: Record<string, string>
        let cidArray: string[]
        let lastCIDs: string

        const chainId = network.config.chainId || 31337

        const provideScript = fs.readFileSync("scripts/provide.js", "utf-8");
        const decryptScript = fs.readFileSync("scripts/decrypt.js", "utf-8");

        beforeEach(async function () {
            accounts = await ethers.getSigners()
            deployer = accounts[0]
            user = accounts[1]
            const dataListingFactoryContract: DataListingFactory = await ethers.getContract("DataListingFactory")
            const functionsConsumerAddress = await dataListingFactoryContract.getLastDataListing()
            functionsContract = await ethers.getContractAt("FunctionsConsumer", functionsConsumerAddress) as unknown as FunctionsConsumer
            functionsConsumer = functionsContract.connect(deployer)

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

                const encrypted_google_token = await crypto.subtle.encrypt("RSA-OAEP", tokenCryptoKey, googleToken)

                const args = [
                    arrayBufferToBase64(encrypted_google_token),
                    dataKey,
                ]

                const transaction = await functionsConsumer.provideData(
                    0, // don hosted secrets - slot ID - empty in this example
                    0, // don hosted secrets - version - empty in this example
                    args,
                    [], // bytesArgs - arguments can be encoded off-chain to bytes.
                    networkConfig[chainId].functionsSubscriptionId!,
                    networkConfig[chainId].gasLimit!,
                    ethersv5.utils.formatBytes32String(networkConfig[chainId].functionsDonId!) // jobId is bytes32 representation of donId
                );

                // Log transaction details
                console.log(
                    `\n✅ Functions request sent! Transaction hash ${transaction.hash}. Waiting for a response...`
                );

                console.log(
                    `See your request in the explorer ${networkConfig[chainId].explorerUrl}/tx/${transaction.hash}`
                );

                const rpcUrl = process.env.POLYGON_MUMBAI_RPC_URL
                const provider = new ethersv5.providers.JsonRpcProvider(rpcUrl);


                const responseListener = new ResponseListener({
                    provider: provider,
                    functionsRouterAddress: networkConfig[chainId].functionsRouter!,
                }); // Instantiate a ResponseListener object to wait for fulfillment.

                await (async () => {
                    try {
                        const response: any = await new Promise((resolve, reject) => {
                            responseListener
                                .listenForResponseFromTransaction(transaction.hash)
                                .then((response: any) => {
                                    resolve(response); // Resolves once the request has been fulfilled.
                                    console.log("RESPONSE", response)
                                })
                                .catch((error: any) => {
                                    reject(error); // Indicate that an error occurred while waiting for fulfillment.
                                });
                        });

                        const fulfillmentCode = response.fulfillmentCode;

                        if (fulfillmentCode === FulfillmentCode.FULFILLED) {
                            console.log(
                                `\n✅ Request ${response.requestId
                                } successfully fulfilled. Cost is ${ethersv5.utils.formatEther(
                                    response.totalCostInJuels
                                )} LINK. Complete reponse: `,
                                response
                            );
                        } else if (fulfillmentCode === FulfillmentCode.USER_CALLBACK_ERROR) {
                            console.log(
                                `\n Request ${response.requestId
                                } fulfilled. However, the consumer contract callback failed. Cost is ${ethersv5.utils.formatEther(
                                    response.totalCostInJuels
                                )} LINK. Complete reponse: `,
                                response
                            );
                        } else {
                            console.log(
                                `\n❌ Request ${response.requestId
                                } not fulfilled. Code: ${fulfillmentCode}. Cost is ${ethersv5.utils.formatEther(
                                    response.totalCostInJuels
                                )} LINK. Complete reponse: `,
                                response
                            );
                        }

                        const errorString = response.errorString;
                        if (errorString) {
                            assert.fail(`\n❌ Error during the execution: `, errorString);
                        } else {
                            const responseBytesHexstring = response.responseBytesHexstring;
                            if (ethersv5.utils.arrayify(responseBytesHexstring).length > 0) {
                                const decodedResponse = decodeResult(
                                    response.responseBytesHexstring,
                                    ReturnType.string
                                );
                                console.log(
                                    `\n✅ Decoded response: `,
                                    decodedResponse
                                );
                                lastCIDs = decodedResponse as string;
                                console.log(lastCIDs);
                                expect(lastCIDs.startsWith("bafkrei")).to.be.true;
                            }
                        }
                    } catch (error) {
                        assert.fail("Error listening for response", error)
                    }
                })();
            })
            it("should store the CIDs", async function () {
                cidArray = await functionsConsumer.getDataCIDs();
                const lastError = await functionsConsumer.getLastError();
                const s_requests = await functionsConsumer.s_lastRequestId();
                console.log("lastError", lastError)
                console.log("lastRequestId", s_requests)
                console.log("lsat response", await functionsConsumer.s_lastResponse())
                console.log(cidArray)
                console.log("Last CIDs:", cidArray[cidArray.length - 1])
                expect(cidArray[cidArray.length - 1]).to.equal(lastCIDs)
            })
            it("should decrypt the data on IPFS", async function () {
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

                // const cidBundle = await fetch()

                for (const bundleCID of cidArray) {
                    // const cids = cidsRaw.split(",");
                    const bundleResponse = await fetch(`https://${bundleCID}.ipfs.nftstorage.link/`)
                    const bundle = await bundleResponse.json()

                    const aesKeyCid = bundle.aesKey
                    const aesKeyResponse = await fetch(`https://${aesKeyCid}.ipfs.nftstorage.link/`)
                    const aesKeyData = await aesKeyResponse.json()
                    const encryptedAesKey = aesKeyData.aesKey
                    const encryptedIv = aesKeyData.iv

                    const dataCids = bundle.dataCids
                    let encryptedData = ""
                    for (const cid of dataCids) {
                        const resp = await fetch(`https://${cid}.ipfs.nftstorage.link/`)

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
                    const decryptedData = new TextDecoder().decode(await crypto.subtle.decrypt(
                        { name: "AES-GCM", iv: new Uint8Array(iv) },
                        aesKey,
                        base64ToArrayBuffer(encryptedData)
                    ));

                    console.log("decrypted Data:", decryptedData)
                    expect(decryptedData.startsWith("{\"session\":[")).to.be.true;
                }
            })
        })
    })
