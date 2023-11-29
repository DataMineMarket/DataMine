// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/libraries/FunctionsRequest.sol";

contract FunctionsConsumer is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    string[] public s_dataCIDs;

    string public s_tokenKey;
    string public s_dataKey;
    string public s_ipfsKey;
    bytes public s_encryptedSecretsUrls;

    error UnexpectedRequestID(bytes32 requestId);

    event Response(bytes32 indexed requestId, bytes response, bytes err);

    /**
     * @notice Initialize the contract with a specified address for the LINK token
     * @param router The address of the LINK token contract
     * @param tokenKey The public key to encrypt user secret keys
     * @param encryptedSecretsUrls Encrypted URLs where to fetch contract secrets
     **/
    constructor(
        address router,
        string memory tokenKey,
        string memory dataKey,
        string memory ipfsKey,
        bytes memory encryptedSecretsUrls
    ) FunctionsClient(router) ConfirmedOwner(tx.origin) {
        s_tokenKey = tokenKey;
        s_dataKey = dataKey;
        s_ipfsKey = ipfsKey;
        s_encryptedSecretsUrls = encryptedSecretsUrls;
    }

    /**
     * @notice Send a simple request
     * @param source JavaScript source code
     * @param donHostedSecretsSlotID Don hosted secrets slotId
     * @param donHostedSecretsVersion Don hosted secrets version
     * @param args List of arguments accessible from within the source code
     * @param bytesArgs Array of bytes arguments, represented as hex strings
     * @param subscriptionId Billing ID
     */
    function sendRequest(
        string memory source,
        uint8 donHostedSecretsSlotID,
        uint64 donHostedSecretsVersion,
        string[] memory args,
        bytes[] memory bytesArgs,
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 donID
    ) external onlyOwner returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        if (s_encryptedSecretsUrls.length > 0) req.addSecretsReference(s_encryptedSecretsUrls);
        else if (donHostedSecretsVersion > 0) {
            req.addDONHostedSecrets(donHostedSecretsSlotID, donHostedSecretsVersion);
        }
        if (args.length > 0) req.setArgs(args);
        if (bytesArgs.length > 0) req.setBytesArgs(bytesArgs);
        s_lastRequestId = _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donID);
        return s_lastRequestId;
    }

    /**
     * @notice Send a pre-encoded CBOR request
     * @param request CBOR-encoded request data
     * @param subscriptionId Billing ID
     * @param gasLimit The maximum amount of gas the request can consume
     * @param donID ID of the job to be invoked
     * @return requestId The ID of the sent request
     */
    function sendRequestCBOR(
        bytes memory request,
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 donID
    ) external onlyOwner returns (bytes32 requestId) {
        s_lastRequestId = _sendRequest(request, subscriptionId, gasLimit, donID);
        return s_lastRequestId;
    }

    /**
     * @notice Store latest result/error
     * @param requestId The request ID, returned by sendRequest()
     * @param response Aggregated response from the user code
     * @param err Aggregated error from the user code or from the execution pipeline
     * Either response or error parameter will be set, but never both
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (s_lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }
        s_lastResponse = response;
        s_lastError = err;

        string memory responseString = string(response);

        if (err.length == 0 && response.length > 0 ) {  // if there is no error when making the request, add the CID to s_dataCIDs
        // && responseString[:7] == 'bafkrei') {        // TODO: need to discern between google and decrypt script responses
            s_dataCIDs.push(responseString);
        }

        emit Response(requestId, s_lastResponse, s_lastError);
    }

    function getTokenKey() external view returns (string memory) {
        return s_tokenKey;
    }

    function getDataKey() external view returns (string memory) {
        return s_dataKey;
    }

    function getIPFSKey() external view returns (string memory) {
        return s_ipfsKey;
    }

    function getEncryptedSecretsUrls() external view returns (bytes memory) {
        return s_encryptedSecretsUrls;
    }

    function getDataCIDs() external view returns (string[] memory) {
        return s_dataCIDs;
    }
}
