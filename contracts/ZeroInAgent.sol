// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IERC7857.sol";
import "./interfaces/IERC7857Authorize.sol";
import "./interfaces/IERC7857Cloneable.sol";

/**
 * @title ZeroInAgent
 * @notice Zero-In's Agentic ID (ERC-7857): every member's panda. Forked from 0G's
 *         simplified AgenticID example (0gfoundation/agenticID-examples, example 01)
 *         with two additions:
 *
 *         1. appendIntelligentData: append-only growth events (patch claims, debriefs)
 *            committed as hashes without rewriting mint-time data.
 *         2. authorizeUsageWithSig / revokeAuthorizationWithSig: EIP-712 signed
 *            consent. Members hold gasless embedded wallets, so they sign typed
 *            data (free) and a relayer submits it. Consent remains cryptographically
 *            the owner's and is revocable the same way.
 *
 *         Honesty note: like the example it derives from, this contract is
 *         simplified for demonstration. In production, use the full 0g-agent-nft
 *         contracts with TEE/ZKP transfer verification.
 */
contract ZeroInAgent is
    ERC721Enumerable,
    AccessControl,
    Pausable,
    EIP712,
    IERC7857,
    IERC7857Authorize,
    IERC7857Cloneable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    bytes32 public constant AUTHORIZE_TYPEHASH =
        keccak256("AuthorizeUsage(uint256 tokenId,address user,uint256 nonce,uint256 deadline)");
    bytes32 public constant REVOKE_TYPEHASH =
        keccak256("RevokeAuthorization(uint256 tokenId,address user,uint256 nonce,uint256 deadline)");

    uint256 private _nextTokenId;
    uint256 public mintFee;
    address public creator;

    // tokenId => intelligent data
    mapping(uint256 => IntelligentData[]) private _intelligentData;

    // tokenId => token URI
    mapping(uint256 => string) private _tokenURIs;

    // tokenId => authorized users
    mapping(uint256 => address[]) private _authorizedUsers;
    mapping(uint256 => mapping(address => bool)) private _isAuthorizedUser;

    // user => tokenIds they are authorized to use (reverse lookup)
    mapping(address => uint256[]) private _authorizedTokens;
    mapping(address => mapping(uint256 => bool)) private _isAuthorizedToken;

    // tokenId => signature nonce (replay protection for WithSig functions)
    mapping(uint256 => uint256) public sigNonces;

    // tokenId => source tokenId (for clones)
    mapping(uint256 => uint256) public cloneSource;

    // owner => delegate assistant
    mapping(address => address) public delegatedAssistant;

    // tokenId => creator address
    mapping(uint256 => address) public tokenCreator;

    event MintFeeUpdated(uint256 oldFee, uint256 newFee);
    event DelegateAccessSet(address indexed owner, address indexed assistant);
    event IntelligentDataAppended(uint256 indexed tokenId, IntelligentData data);

    constructor(
        string memory name,
        string memory symbol,
        uint256 _mintFee
    ) ERC721(name, symbol) EIP712("ZeroInAgent", "1") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        mintFee = _mintFee;
        creator = msg.sender;
    }

    // =========================================================================
    // Minting
    // =========================================================================

    function mint(address to) external payable whenNotPaused returns (uint256) {
        require(msg.value >= mintFee, "Insufficient mint fee");
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        tokenCreator[tokenId] = msg.sender;
        return tokenId;
    }

    function mintWithRole(address to) external onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        tokenCreator[tokenId] = msg.sender;
        return tokenId;
    }

    function iMint(
        address to,
        IntelligentData[] calldata datas
    ) external payable whenNotPaused returns (uint256) {
        require(msg.value >= mintFee, "Insufficient mint fee");
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setIntelligentData(tokenId, datas);
        tokenCreator[tokenId] = msg.sender;
        return tokenId;
    }

    function iMintWithRole(
        address to,
        IntelligentData[] calldata datas,
        address _creator
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setIntelligentData(tokenId, datas);
        tokenCreator[tokenId] = _creator;
        return tokenId;
    }

    // =========================================================================
    // ERC-7857: Intelligent Data
    // =========================================================================

    function getIntelligentDatas(uint256 tokenId) external view returns (IntelligentData[] memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _intelligentData[tokenId];
    }

    /**
     * @notice Append one growth event to a panda's intelligent data without
     *         touching mint-time entries. Called by the relayer (OPERATOR_ROLE)
     *         on patch claims ("patch:<eventId>") and debriefs ("debrief:<eventId>").
     */
    function appendIntelligentData(
        uint256 tokenId,
        IntelligentData calldata data
    ) external onlyRole(OPERATOR_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        _intelligentData[tokenId].push(data);
        emit IntelligentDataAppended(tokenId, data);
    }

    function iTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        TransferValidityProof[] calldata /* proofs */
    ) external override {
        // In production, proofs are verified by TEE/ZKP oracle via Verifier contract.
        // For demonstration, we validate ownership and perform the transfer.
        require(ownerOf(tokenId) == from, "Not the owner");
        require(
            msg.sender == from ||
            isApprovedForAll(from, msg.sender) ||
            getApproved(tokenId) == msg.sender,
            "Not authorized to transfer"
        );

        _transfer(from, to, tokenId);
        _clearAuthorizations(tokenId);

        emit IntelligentTransfer(from, to, tokenId);
    }

    // =========================================================================
    // ERC-7857 Cloneable
    // =========================================================================

    function iCloneFrom(
        address from,
        address to,
        uint256 tokenId,
        TransferValidityProof[] calldata /* proofs */
    ) external returns (uint256) {
        require(ownerOf(tokenId) == from, "Not the owner");
        require(
            msg.sender == from ||
            isApprovedForAll(from, msg.sender) ||
            getApproved(tokenId) == msg.sender,
            "Not authorized to clone"
        );

        uint256 newTokenId = _nextTokenId++;
        _safeMint(to, newTokenId);

        IntelligentData[] storage sourceData = _intelligentData[tokenId];
        for (uint256 i = 0; i < sourceData.length; i++) {
            _intelligentData[newTokenId].push(sourceData[i]);
        }

        cloneSource[newTokenId] = tokenId;
        tokenCreator[newTokenId] = tokenCreator[tokenId];

        emit IntelligentClone(from, to, tokenId, newTokenId);
        return newTokenId;
    }

    // =========================================================================
    // ERC-7857 Authorization
    // =========================================================================

    function authorizeUsage(uint256 tokenId, address user) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        _authorize(tokenId, user);
    }

    /**
     * @notice Gasless consent: the token owner signs an EIP-712 AuthorizeUsage
     *         message in their embedded wallet; anyone (in practice the relayer)
     *         submits it. Nonce per token prevents replay; deadline bounds validity.
     */
    function authorizeUsageWithSig(
        uint256 tokenId,
        address user,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "Signature expired");
        address owner = ownerOf(tokenId);
        bytes32 structHash = keccak256(
            abi.encode(AUTHORIZE_TYPEHASH, tokenId, user, sigNonces[tokenId], deadline)
        );
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        require(signer == owner, "Invalid signature");
        sigNonces[tokenId]++;
        _authorize(tokenId, user);
    }

    function revokeAuthorization(uint256 tokenId, address user) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        _revoke(tokenId, user);
    }

    /// @notice Gasless revocation, mirror of authorizeUsageWithSig.
    function revokeAuthorizationWithSig(
        uint256 tokenId,
        address user,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "Signature expired");
        address owner = ownerOf(tokenId);
        bytes32 structHash = keccak256(
            abi.encode(REVOKE_TYPEHASH, tokenId, user, sigNonces[tokenId], deadline)
        );
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        require(signer == owner, "Invalid signature");
        sigNonces[tokenId]++;
        _revoke(tokenId, user);
    }

    function isAuthorizedUser(uint256 tokenId, address user) external view returns (bool) {
        return _isAuthorizedUser[tokenId][user];
    }

    function authorizedUsersOf(uint256 tokenId) external view returns (address[] memory) {
        return _authorizedUsers[tokenId];
    }

    function authorizedTokensOf(address user) external view returns (uint256[] memory) {
        return _authorizedTokens[user];
    }

    function batchAuthorizeUsage(uint256[] calldata tokenIds, address user) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(ownerOf(tokenIds[i]) == msg.sender, "Not the owner");
            if (!_isAuthorizedUser[tokenIds[i]][user]) {
                _authorize(tokenIds[i], user);
            }
        }
    }

    // =========================================================================
    // Access Delegation
    // =========================================================================

    function delegateAccess(address assistant) external {
        delegatedAssistant[msg.sender] = assistant;
        emit DelegateAccessSet(msg.sender, assistant);
    }

    function revokeDelegateAccess() external {
        delete delegatedAssistant[msg.sender];
        emit DelegateAccessSet(msg.sender, address(0));
    }

    // =========================================================================
    // Token URI
    // =========================================================================

    function setTokenURI(uint256 tokenId, string calldata uri) external {
        require(ownerOf(tokenId) == msg.sender || hasRole(OPERATOR_ROLE, msg.sender), "Not authorized");
        _tokenURIs[tokenId] = uri;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        string memory uri = _tokenURIs[tokenId];
        if (bytes(uri).length > 0) return uri;
        return super.tokenURI(tokenId);
    }

    // =========================================================================
    // Admin
    // =========================================================================

    function setMintFee(uint256 newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldFee = mintFee;
        mintFee = newFee;
        emit MintFeeUpdated(oldFee, newFee);
    }

    function pause() external onlyRole(OPERATOR_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(OPERATOR_ROLE) {
        _unpause();
    }

    function withdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }

    // =========================================================================
    // Internal
    // =========================================================================

    function _authorize(uint256 tokenId, address user) internal {
        require(!_isAuthorizedUser[tokenId][user], "Already authorized");
        require(_authorizedUsers[tokenId].length < 100, "Max authorizations reached");

        _authorizedUsers[tokenId].push(user);
        _isAuthorizedUser[tokenId][user] = true;

        _authorizedTokens[user].push(tokenId);
        _isAuthorizedToken[user][tokenId] = true;

        emit UsageAuthorized(tokenId, user);
    }

    function _revoke(uint256 tokenId, address user) internal {
        require(_isAuthorizedUser[tokenId][user], "Not authorized");

        _isAuthorizedUser[tokenId][user] = false;

        address[] storage users = _authorizedUsers[tokenId];
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == user) {
                users[i] = users[users.length - 1];
                users.pop();
                break;
            }
        }

        _isAuthorizedToken[user][tokenId] = false;
        uint256[] storage tokens = _authorizedTokens[user];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }

        emit UsageRevoked(tokenId, user);
    }

    function _setIntelligentData(uint256 tokenId, IntelligentData[] calldata datas) internal {
        delete _intelligentData[tokenId];
        for (uint256 i = 0; i < datas.length; i++) {
            _intelligentData[tokenId].push(datas[i]);
        }
        emit IntelligentDataSet(tokenId, datas);
    }

    function _clearAuthorizations(uint256 tokenId) internal {
        address[] storage users = _authorizedUsers[tokenId];
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            _isAuthorizedUser[tokenId][user] = false;

            _isAuthorizedToken[user][tokenId] = false;
            uint256[] storage tokens = _authorizedTokens[user];
            for (uint256 j = 0; j < tokens.length; j++) {
                if (tokens[j] == tokenId) {
                    tokens[j] = tokens[tokens.length - 1];
                    tokens.pop();
                    break;
                }
            }
        }
        delete _authorizedUsers[tokenId];
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
