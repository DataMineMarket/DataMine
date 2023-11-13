export interface networkConfigItem {
    name?: string
    callbackGasLimit?: string
    blockConfirmations?: number
    functionsRouter?: string
    functionsSubscriptionId?: string
    functionsDonId?: string
}

export interface networkConfigInfo {
    [key: number]: networkConfigItem
}

export const networkConfig: networkConfigInfo = {
    31337: {
        name: "localhost",
        callbackGasLimit: "500000", // 500,000 gas
        blockConfirmations: 1,
    },
    80001: {
        name: "mumbai",
        blockConfirmations: 6,
        functionsRouter: "0x6E2dc0F9DB014aE19888F539E59285D2Ea04244C",
        functionsSubscriptionId: "621",
        functionsDonId: "fun-polygon-mumbai-1",
    },
    421613: {
        name: "arbitrum_goerli",
        blockConfirmations: 6,
    },
    1: {
        name: "mainnet",
    },
}
