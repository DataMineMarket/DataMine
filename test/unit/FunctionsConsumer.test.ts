import { assert, expect } from "chai"
import { network, deployments, ethers } from "hardhat"
import { FunctionsConsumer, DataListingFactory } from "../../typechain-types"
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers"
import fs from "fs";
import {
    simulateScript,
} from "@chainlink/functions-toolkit";
import * as crypto from "crypto"
import { fromBase64, arrayBufferToBase64 } from "../../utils/conversions"

!(network.name == "hardhat")
    ? describe.skip : describe("Functions Unit Tests", function () {
        let accounts: HardhatEthersSigner[], deployer: HardhatEthersSigner, user: HardhatEthersSigner
        let functionsContract: FunctionsConsumer, dataListingFactoryContract: DataListingFactory
        let tokenCryptoKey: CryptoKey, ipfsCryptoKey: CryptoKey
        let dataKey: string
        let secrets: Record<string, string>

        const source = fs.readFileSync("scripts/source.js", "utf-8");

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
            const ipfsKey = await functionsContract.getIPFSKey();
            ipfsCryptoKey = await crypto.subtle.importKey(
                "spki",
                fromBase64(ipfsKey),
                {
                    name: "RSA-OAEP",
                    hash: "SHA-256",
                },
                true,
                ["encrypt"]
            )
        })

        describe("constructor", function () {
            it("should successfully call google API", async function () {
                let enc = new TextEncoder();
                const googleToken = enc.encode(process.env.GOOGLE_ACCESS_TOKEN!);
                const ipfsKey = enc.encode(process.env.NFT_STORAGE_API_TOKEN!);

                const encrypted_google_token = await crypto.subtle.encrypt("RSA-OAEP", tokenCryptoKey, googleToken)
                const encrypted_ipfs_key = await crypto.subtle.encrypt("RSA-OAEP", ipfsCryptoKey, ipfsKey)
                const response = await simulateScript({
                    source: source,
                    args: [
                        arrayBufferToBase64(encrypted_google_token),
                        dataKey,
                        arrayBufferToBase64(encrypted_ipfs_key)
                    ],
                    bytesArgs: [],
                    secrets: secrets,
                });
                console.log(response.capturedTerminalOutput)
                const errorString = response.errorString;
                expect(errorString).to.be.undefined;
                expect(response.capturedTerminalOutput.startsWith("bafkrei")).to.be.true;
            })
            it("should store the CID", async function () {
                
            })
        })
    })
