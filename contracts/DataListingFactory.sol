// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {FunctionsConsumer} from "./FunctionsConsumer.sol";

contract DataListingFactory {
    FunctionsConsumer[] public s_dataListingContracts;

    event DataListingCreated(address indexed dataListing);

    /**
     * @notice Create a new DataListing contract
     * @param router The address of the LINK token contract
     * @param tokenKey The public key to encrypt user secret keys
     * @param encryptedSecretsUrls Encrypted URLs where to fetch contract secrets
     **/
    function createDataListing(
        address router,
        string memory tokenKey,
        string memory dataKey,
        string memory ipfsKey,
        bytes memory encryptedSecretsUrls
    ) external returns (address) {
        FunctionsConsumer consumer = new FunctionsConsumer(router, tokenKey, dataKey, ipfsKey, encryptedSecretsUrls);
        s_dataListingContracts.push(consumer);
        emit DataListingCreated(address(consumer));
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
