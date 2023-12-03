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

    enum RequestType {
        PROVIDE,
        DECRYPT
    }
    mapping(bytes32 requestId => RequestType requestType) private s_requests;

    string public s_provideScript;

    string public s_tokenKey;
    string public s_dataKey;
    bytes public s_encryptedSecretsUrls;
    string public s_dataSource;

    error UnexpectedRequestID(bytes32 requestId);

    event Response(bytes32 indexed requestId, bytes response, bytes err);
    event Test1();
    event Test2();
    event Test3();
    event Test4();

    /**
     * @notice Initialize the contract with a specified address for the LINK token
     * @param router The address of the LINK token contract
     * @param provideScript The script which makes an API request and posts the response to IPFS
     * @param tokenKey The public key to encrypt user secret keys
     * @param dataKey The public key to encrypt users data
     * @param encryptedSecretsUrls Encrypted URLs where to fetch contract secrets
     * @param dataSource The source of the provided data
     **/
    constructor(
        address router,
        string memory provideScript,
        string memory tokenKey,
        string memory dataKey,
        bytes memory encryptedSecretsUrls,
        string memory dataSource
    ) FunctionsClient(router) ConfirmedOwner(tx.origin) {
        s_provideScript = provideScript;
        s_tokenKey = tokenKey;
        s_dataKey = dataKey;
        s_encryptedSecretsUrls = encryptedSecretsUrls;
        s_dataSource = dataSource;
    }

    /**
     * @notice Send a request to provide data
     * @param donHostedSecretsSlotID Don hosted secrets slotId
     * @param donHostedSecretsVersion Don hosted secrets version
     * @param args List of arguments accessible from within the source code
     * @param bytesArgs Array of bytes arguments, represented as hex strings
     * @param subscriptionId Billing ID
     */
    function provideData(
        uint8 donHostedSecretsSlotID,
        uint64 donHostedSecretsVersion,
        string[] memory args,
        bytes[] memory bytesArgs,
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 donID
    ) external onlyOwner {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(s_provideScript);
        if (s_encryptedSecretsUrls.length > 0) req.addSecretsReference(s_encryptedSecretsUrls);
        else if (donHostedSecretsVersion > 0) {
            req.addDONHostedSecrets(donHostedSecretsSlotID, donHostedSecretsVersion);
        }
        if (args.length > 0) req.setArgs(args);
        if (bytesArgs.length > 0) req.setBytesArgs(bytesArgs);
        s_lastRequestId = _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donID);
        s_requests[s_lastRequestId] = RequestType.PROVIDE;
    }

    /**
     * @notice Send a request to decrypt data
     * @param donHostedSecretsSlotID Don hosted secrets slotId
     * @param donHostedSecretsVersion Don hosted secrets version
     * @param args List of arguments accessible from within the source code
     * @param bytesArgs Array of bytes arguments, represented as hex strings
     * @param subscriptionId Billing ID
     */
    function decryptData(
        string memory source,
        uint8 donHostedSecretsSlotID,
        uint64 donHostedSecretsVersion,
        string[] memory args,
        bytes[] memory bytesArgs,
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 donID
    ) external onlyOwner {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        if (s_encryptedSecretsUrls.length > 0) req.addSecretsReference(s_encryptedSecretsUrls);
        else if (donHostedSecretsVersion > 0) {
            req.addDONHostedSecrets(donHostedSecretsSlotID, donHostedSecretsVersion);
        }
        if (args.length > 0) req.setArgs(args);
        if (bytesArgs.length > 0) req.setBytesArgs(bytesArgs);
        s_lastRequestId = _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donID);
        s_requests[s_lastRequestId] = RequestType.DECRYPT;
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
        emit Test1();

        if (s_lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }

        s_lastResponse = response;
        s_lastError = err;
        emit Test2();

        RequestType requestType = s_requests[requestId];
        string memory responseString = string(response);
        emit Test3();

        if (err.length == 0 && requestType == RequestType.PROVIDE) {
            emit Test4();
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

    function getEncryptedSecretsUrls() external view returns (bytes memory) {
        return s_encryptedSecretsUrls;
    }

    function getDataCIDs() external view returns (string[] memory) {
        return s_dataCIDs;
    }

    function getDataSource() external view returns (string memory) {
        return s_dataSource;
    }

    function getLastError() external view returns (bytes memory) {
        return s_lastError;
    }
}
