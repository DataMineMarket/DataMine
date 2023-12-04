import { HardhatRuntimeEnvironment } from "hardhat/types"
const { ethers: ethersv5 } = require("ethers-v5")
import fs from 'fs';
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
} from "@chainlink/functions-toolkit";
import { DataListingFactory, USDCToken } from "../typechain-types"

import { networkConfig } from "../helper-hardhat-config"
import { DeployFunction } from "hardhat-deploy/types"
import * as crypto from "crypto"
import { EventLog } from "ethers";

const toBase64 = (arr: Uint8Array) => btoa(String.fromCodePoint(...arr))

const deployFunctions: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network, ethers } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const chainId = network.config.chainId || 31337

    const functionRouterAddress = networkConfig[chainId].functionsRouter!
    const donId = networkConfig[chainId].functionsDonId!
    const linkTokenAddress = networkConfig[chainId].linkToken!
    const subscriptionId = networkConfig[chainId].functionsSubscriptionId!

    log("----------------------------------------------------")

    await deploy("USDCToken", {
        from: deployer,
        args: ["1000000000000000000000000"],
        log: true,
        waitConfirmations: networkConfig[chainId].blockConfirmations || 1,
    })

    const usdcToken: USDCToken = await ethers.getContract("USDCToken", deployer)
    const usdcTokenAddress: string = await usdcToken.getAddress();

    const accounts = await ethers.getSigners()
    const deployerAddress: string = accounts[0].address
    console.log(deployerAddress)

    const approvePurchase = await usdcToken.approve(deployerAddress, "1000000000000000000000000")

    await deploy("DataListingFactory", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: networkConfig[chainId].blockConfirmations || 1,
    })

    log("----------------------------------------------------")

    const provideScript = fs.readFileSync("scripts/noRequest.js", "utf-8"); // TODO: use real script
    const decryptScript = fs.readFileSync("scripts/decrypt.js", "utf-8");

    // API Key Encryption
    const tokenKeyPair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"],
    );
    const exportedTokenPublicKey = await crypto.subtle.exportKey("spki", tokenKeyPair.publicKey);
    const exportedTokenPrivateKey = await crypto.subtle.exportKey("pkcs8", tokenKeyPair.privateKey);

    const tokenPubKey = toBase64(new Uint8Array(exportedTokenPublicKey))
    const tokenPrivKey = toBase64(new Uint8Array(exportedTokenPrivateKey))

    // Data Encryption
    const dataKeyPair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"],
    );
    const exportedDataPublicKey = await crypto.subtle.exportKey("spki", dataKeyPair.publicKey);
    const exportedDataPrivateKey = await crypto.subtle.exportKey("pkcs8", dataKeyPair.privateKey);

    const dataPubKey = toBase64(new Uint8Array(exportedDataPublicKey))
    const dataPrivKey = toBase64(new Uint8Array(exportedDataPrivateKey)) // TODO: give to user

    const secrets = {
        token_key: tokenPrivKey,
        ipfsAuth: process.env.NFT_STORAGE_API_TOKEN!,
    }

    const dataKeyPath = './test/helper/dataKey.txt';
    fs.writeFileSync(dataKeyPath, dataPrivKey);

    const privateKey = process.env.PRIVATE_KEY; // fetch PRIVATE_KEY
    if (!privateKey)
        throw new Error(
            "private key not provided - check your environment variables"
        );

    const githubApiToken = process.env.GITHUB_API_TOKEN;
    if (!githubApiToken)
        throw new Error(
            "githubApiToken not provided - check your environment variables"
        );

    let encryptedSecretsUrls
    let subscriptionManager: SubscriptionManager
    if (chainId != 31337) {
        const rpcUrl = process.env.POLYGON_MUMBAI_RPC_URL; // fetch mumbai RPC URL

        if (!rpcUrl)
            throw new Error(`rpcUrl not provided  - check your environment variables`);

        const wallet = new ethersv5.Wallet(privateKey);
        const provider = new ethersv5.providers.JsonRpcProvider(rpcUrl);
        const signer = wallet.connect(provider); // create ethers signer for signing transactions

        const secretsManager = new SecretsManager({
            signer: signer,
            functionsRouterAddress: functionRouterAddress,
            donId: donId,
        });

        await secretsManager.initialize();

        subscriptionManager = new SubscriptionManager({
            signer: signer,
            linkTokenAddress: linkTokenAddress,
            functionsRouterAddress: functionRouterAddress,
        });

        await subscriptionManager.initialize();

        const encryptedSecretsObj = await secretsManager.encryptSecrets(secrets);

        console.log(`Creating gist...`);

        // Create a new GitHub Gist to store the encrypted secrets
        const gistURL = await createGist(
            githubApiToken,
            JSON.stringify(encryptedSecretsObj)
        );
        console.log(`\n✅Gist created ${gistURL} . Encrypting the URLs..`);
        encryptedSecretsUrls = await secretsManager.encryptSecretsUrls([
            gistURL,
        ]);
    } else {
        console.log(`Creating gist...`);

        const secretsFilePath = './test/helper/secrets.json';

        fs.writeFileSync(secretsFilePath, JSON.stringify(secrets));

        const gistURL = await createGist(
            githubApiToken,
            JSON.stringify(secrets)
        );
        console.log(`\n✅Gist created ${gistURL} . Encrypting the URLs..`);
        const encoder = new TextEncoder();
        const data = encoder.encode(gistURL);
        encryptedSecretsUrls = data
    }

    log("----------------------------------------------------")

    const dataListingFactory: DataListingFactory = await ethers.getContract("DataListingFactory", deployer)

    log("Creating new Data Listing...")
    const createTx = await dataListingFactory.createDataListing(
        functionRouterAddress,
        provideScript,
        tokenPubKey,
        dataPubKey,
        encryptedSecretsUrls,
        "GoogleFit",
        usdcTokenAddress,
        "100000000000000000000",
        "100",
    )

    const createTxReceipt = await createTx.wait(1) // Wait for the transaction to be mined
    const logs = createTxReceipt!.logs as EventLog[]
    const dataListingAddress = logs[0].args[0].toString();

    log("✅Data Listing created at: ", dataListingAddress);

    if (chainId != 31337) {
        log("----------------------------------------------------");
        log("Adding consumer to subscription manager...")
        const addConsumerTxReceipt = await subscriptionManager!.addConsumer({
            subscriptionId,
            consumerAddress: dataListingAddress,
        })
        log("✅Consumer added to subscription manager");
    }

    log("----------------------------------------------------");
}
export default deployFunctions
deployFunctions.tags = ["all", "functions"]
