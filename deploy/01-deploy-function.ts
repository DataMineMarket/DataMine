import { HardhatRuntimeEnvironment } from "hardhat/types"
const { ethers } = require("ethers-v5")
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

import { networkConfig } from "../helper-hardhat-config"
import { DeployFunction } from "hardhat-deploy/types"
import * as crypto from "crypto"

const toBase64 = (arr: Uint8Array) => btoa(String.fromCodePoint(...arr))

const deployFunctions: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const chainId = network.config.chainId || 31337

    const functionRouterAddress = networkConfig[chainId].functionsRouter!
    const donId = networkConfig[chainId].functionsDonId!


    const keyPair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"],
    );
    const exportedPublicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    const exportedPrivateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    const pubKey = toBase64(new Uint8Array(exportedPublicKey))
    const privKey = toBase64(new Uint8Array(exportedPrivateKey))

    const secrets = {
        private_key: privKey,
    }

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
    if (chainId != 31337) {
        const rpcUrl = process.env.POLYGON_MUMBAI_RPC_URL; // fetch mumbai RPC URL

        if (!rpcUrl)
            throw new Error(`rpcUrl not provided  - check your environment variables`);

        const wallet = new ethers.Wallet(privateKey);
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const signer = wallet.connect(provider); // create ethers signer for signing transactions

        const secretsManager = new SecretsManager({
            signer: signer,
            functionsRouterAddress: functionRouterAddress,
            donId: donId,
        });

        await secretsManager.initialize();

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
    await deploy("FunctionsConsumer", {
        from: deployer,
        args: [
            functionRouterAddress,
            pubKey,
            encryptedSecretsUrls],
        log: true,
        waitConfirmations: networkConfig[chainId].blockConfirmations || 1,
    })

    log("----------------------------------------------------")
}
export default deployFunctions
deployFunctions.tags = ["all", "functions"]
