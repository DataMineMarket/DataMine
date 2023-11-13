import { HardhatRuntimeEnvironment } from "hardhat/types"
const { ethers } = require("ethers-v5")
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
import * as forge from "node-forge"

const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048 })

const deployFunctions: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()


    // const privateKey = forge.pki.privateKeyFromPem(privateKeyString);
    const secrets = { privateKey: forge.pki.privateKeyToPem(keyPair.privateKey) }

    const chainId = network.config.chainId || 31337

    const functionRouterAddress = networkConfig[chainId].functionsRouter!
    const donId = networkConfig[chainId].functionsDonId!

    const privateKey = process.env.PRIVATE_KEY; // fetch PRIVATE_KEY
    if (!privateKey)
        throw new Error(
            "private key not provided - check your environment variables"
        );

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
    const githubApiToken = process.env.GITHUB_API_TOKEN;
    if (!githubApiToken)
        throw new Error(
            "githubApiToken not provided - check your environment variables"
        );

    // Create a new GitHub Gist to store the encrypted secrets
    const gistURL = await createGist(
        githubApiToken,
        JSON.stringify(encryptedSecretsObj)
    );
    console.log(`\n✅Gist created ${gistURL} . Encrypt the URLs..`);
    const encryptedSecretsUrls = await secretsManager.encryptSecretsUrls([
        gistURL,
    ]);

    log("----------------------------------------------------")
    await deploy("FunctionsConsumer", {
        from: deployer,
        args: [functionRouterAddress, forge.pki.publicKeyToPem(keyPair.publicKey), encryptedSecretsUrls],
        log: true,
        waitConfirmations: networkConfig[chainId].blockConfirmations || 1,
    })

    log("----------------------------------------------------")
}
export default deployFunctions
deployFunctions.tags = ["all", "functions"]
