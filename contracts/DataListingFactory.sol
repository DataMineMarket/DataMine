// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {FunctionsConsumer} from "./FunctionsConsumer.sol";

contract DataListingFactory {
    FunctionsConsumer[] public s_dataListingContracts;
    string[] public s_dataListingSources;

    event DataListingCreated(address indexed dataListing, string indexed dataSource);

    /**
     * @notice Create a new DataListing contract
     * @param router The address of the LINK token contract
     * @param provideScript The script which makes an API request and posts the response to IPFS
     * @param tokenKey The public key to encrypt user secret keys
     * @param dataKey The public key to encrypt users data
     * @param encryptedSecretsUrls Encrypted URLs where to fetch contract secrets
     * @param dataSource The source of the provided data
     **/
    function createDataListing(
        address router,
        string memory provideScript,
        string memory tokenKey,
        string memory dataKey,
        bytes memory encryptedSecretsUrls,
        string memory dataSource
    ) external returns (address) {
        FunctionsConsumer consumer = new FunctionsConsumer(
            router,
            provideScript,
            tokenKey, 
            dataKey,
            encryptedSecretsUrls,
            dataSource
        );
        s_dataListingContracts.push(consumer);
        s_dataListingSources.push(dataSource);
        emit DataListingCreated(address(consumer), dataSource);
        return address(consumer);
    }

    /**
     * @notice Get the number of DataListing contracts
     **/
    function getNumberOfs_dataListingContracts() external view returns (uint256) {
        return s_dataListingContracts.length;
    }

    /**
     * @notice Get the list of DataListing contracts
     **/
    function getDataListings() external view returns (FunctionsConsumer[] memory) {
        return s_dataListingContracts;
    }

    /**
     * @notice Get the list of DataListing sources
     **/
    function getDataListingSources() external view returns (string[] memory) {
        return s_dataListingSources;
    }

    /**
     * @notice Get a DataListing contract by index
     * @param index The index of the DataListing contract
     **/
    function getDataListing(uint256 index) external view returns (FunctionsConsumer) {
        return s_dataListingContracts[index];
    }

    /**
     * @notice Get the last DataListing contract
     **/
    function getLastDataListing() external view returns (FunctionsConsumer) {
        return s_dataListingContracts[s_dataListingContracts.length - 1];
    }
}
