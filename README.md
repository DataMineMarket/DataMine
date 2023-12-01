# DataNexus Contracts
DataNexus is a decentralized, peer-to-peer market that enables average, everyday people to control their data. Businesses are able to securely purchase personal data generated from web APIs. Using Chainlink functions along with a streamlined encryption scheme, user secrets and personal data are never revealed publicly. The data is only revealed to the purchaser upon transfer of funds.

## Prerequisites

1. Install [Deno](https://docs.deno.com/runtime/manual/getting_started/installation)
2. Install [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)

## Installing

1. Install dependencies:
```
yarn install
```

2. Compile Contracts:
```
yarn hardhat compile
```

## Testing

### Configure .env
To run the following tests, you have to have a `.env` file configured. Copy the `.env.example` and fill in the require environemnt variables.

1. You can create RPC URL using [Alchemy](https://www.alchemy.com/) or [Chainlist](https://chainlist.org/?search=avalanche&testnets=true) for testnet.
2. Get your private key [from Metamask](https://support.metamask.io/hc/en-us/articles/360015289632-How-to-export-an-account-s-private-key#:~:text=On%20the%20'Account%20details'%20page,private%20key%20to%20your%20clipboard.) ** MAKE SURE YOU'RE USING A TEST ACOCUNT WITH NO REAL FUNDS **
3. Get [Coinmarketcap API Key](https://coinmarketcap.com/api/)
4. Follow the instructions [here](https://docs.chain.link/chainlink-functions/tutorials/api-use-secrets-gist#tutorial) to generate a Github API token
5. Use the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) to generate a temporary access token (these only last an hour).
6. Get a [NFT.storage API Key](https://nft.storage/manage)

### Frontend Integration

1. Clone frontend repo in the same root directory
```
git clone https://github.com/DataMineMarket/Frontend.git
```
2. Set `UPDATE_FRONT_END=true` in `.env`
3. Now, upon deployment, the frontend will be updated with the reveleant contract addresses and ABIs.

### Local Tests
The local tests use Chainlink's [functions toolkit](https://github.com/smartcontractkit/functions-toolkit) to simulate functions executions localy.

1. Create a file `test/helper/secrets.json`, this will be populated with a local private key after running the test command below.
2. Run `yarn hardhat test` to run the local tests

### Staging Tests
This test will run on mumbai testnet, and will use real testnet funds.

1. Run `yarn hardhat deploy --network mumbai`
2. The deploy script will automatically update your [subscription](https://functions.chain.link/mumbai/621) with a newly created consumer.
   - Make sure your subscription Id is configured in `functionsSubscriptionId` in `helper-hardhat-config.ts`
3. Run `yarn hardhat test --network mumbai`
