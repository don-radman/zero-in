// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ZeroInPatches
 * @notice Per-event collectibles ("Patches", mission-patch culture). ERC-1155
 *         where tokenId = eventId. The relayer (MINTER_ROLE) claims on behalf of
 *         members: one per wallet, only inside the event window, capped, with a
 *         sequential edition number ("Lisbon patch #23 of 200") and a trust tier
 *         label recording HOW attendance was attested (see docs/trust-model.md).
 *
 *         MVP note: patches stay transferable (standard 1155). The one-per-wallet
 *         rule is enforced at claim time only; production likely makes these
 *         soulbound or transfer-gated.
 */
contract ZeroInPatches is ERC1155, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct PatchEvent {
        string name;
        uint64 startsAt;
        uint64 endsAt;
        uint32 cap;          // 0 = uncapped
        uint32 claimed;      // running count, doubles as last edition number
        string trustTier;    // "venue" (MVP), "self", "witnessed", ...
        string uri;          // per-event metadata URI (our tokenURI API route)
        bool exists;
    }

    uint256 public nextEventId = 1;
    mapping(uint256 => PatchEvent) public events;

    // eventId => member => edition number (1-based; 0 = not claimed)
    mapping(uint256 => mapping(address => uint32)) public editionOf;

    event EventCreated(uint256 indexed eventId, string name, uint64 startsAt, uint64 endsAt, uint32 cap, string trustTier);
    event PatchClaimed(uint256 indexed eventId, address indexed member, uint32 edition, string trustTier);
    event EventURIUpdated(uint256 indexed eventId, string uri);

    constructor() ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    function createEvent(
        string calldata name,
        uint64 startsAt,
        uint64 endsAt,
        uint32 cap,
        string calldata trustTier,
        string calldata eventUri
    ) external onlyRole(OPERATOR_ROLE) returns (uint256 eventId) {
        require(endsAt > startsAt, "Bad window");
        eventId = nextEventId++;
        events[eventId] = PatchEvent({
            name: name,
            startsAt: startsAt,
            endsAt: endsAt,
            cap: cap,
            claimed: 0,
            trustTier: trustTier,
            uri: eventUri,
            exists: true
        });
        emit EventCreated(eventId, name, startsAt, endsAt, cap, trustTier);
    }

    /// @notice Relayer-submitted claim. Validation of the claim key/QR token
    ///         happens off-chain in the app; on-chain we enforce window, cap,
    ///         and one-per-wallet, and assign the edition number.
    function claim(address to, uint256 eventId) external onlyRole(MINTER_ROLE) returns (uint32 edition) {
        PatchEvent storage ev = events[eventId];
        require(ev.exists, "No such event");
        require(block.timestamp >= ev.startsAt && block.timestamp <= ev.endsAt, "Outside event window");
        require(ev.cap == 0 || ev.claimed < ev.cap, "Edition cap reached");
        require(editionOf[eventId][to] == 0, "Already claimed");

        ev.claimed += 1;
        edition = ev.claimed;
        editionOf[eventId][to] = edition;

        _mint(to, eventId, 1, "");
        emit PatchClaimed(eventId, to, edition, ev.trustTier);
    }

    function setEventURI(uint256 eventId, string calldata newUri) external onlyRole(OPERATOR_ROLE) {
        require(events[eventId].exists, "No such event");
        events[eventId].uri = newUri;
        emit EventURIUpdated(eventId, newUri);
    }

    function uri(uint256 eventId) public view override returns (string memory) {
        return events[eventId].uri;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
