export interface networkConfigItem {
    name?: string
    callbackGasLimit?: string
    blockConfirmations?: number
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
    4: {
        name: "rinkeby",
        callbackGasLimit: "500000", // 500,000 gas
        blockConfirmations: 6,
    },
    5: {
        name: "goerli",
        blockConfirmations: 6,
    },
    421613: {
        name: "arbitrum_goerli",
        blockConfirmations: 6,
    },
    1: {
        name: "mainnet",
    },
}
