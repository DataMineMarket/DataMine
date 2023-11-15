export interface networkConfigItem {
    name?: string
    callbackGasLimit?: string
    blockConfirmations?: number
    functionsRouter?: string
    functionsSubscriptionId?: string
    functionsDonId?: string
    gasLimit?: number
    explorerUrl?: string
}

export interface networkConfigInfo {
    [key: number]: networkConfigItem
}

export const networkConfig: networkConfigInfo = {
    31337: {
        name: "localhost",
        callbackGasLimit: "500000", // 500,000 gas
        blockConfirmations: 1,
        functionsRouter: "0x6E2dc0F9DB014aE19888F539E59285D2Ea04244C",
        functionsSubscriptionId: "621",
        functionsDonId: "fun-localhost-1",
    },
    80001: {
        name: "mumbai",
        blockConfirmations: 6,
        functionsRouter: "0x6E2dc0F9DB014aE19888F539E59285D2Ea04244C",
        functionsSubscriptionId: "621",
        functionsDonId: "fun-polygon-mumbai-1",
        gasLimit: 300000,
        explorerUrl: "https://mumbai.polygonscan.com",
    },
    1: {
        name: "mainnet",
    },
}

export const developmentChains = ["mumbai"]
