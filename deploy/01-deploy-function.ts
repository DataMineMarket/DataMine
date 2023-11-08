import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
    networkConfig,
} from "../helper-hardhat-config"
import { DeployFunction } from 'hardhat-deploy/types';

const deployFunctions: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    // code here
    const { deployments, getNamedAccounts, network, ethers } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const chainId = network.config.chainId || 31337

    log("----------------------------------------------------")
    await deploy("Functions", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: networkConfig[chainId].blockConfirmations || 1,
    })

    log("----------------------------------------------------")

    const functions = await ethers.getContract("Functions")
};
export default deployFunctions;
deployFunctions.tags = ["all", "functions"]
