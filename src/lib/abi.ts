// Minimal ABI fragments for the app's chain writes (viem parseAbi).
// Full ABIs live in artifacts/ after hardhat compile; keeping these hand-rolled
// avoids bundling artifact JSON into Next server code.
import { parseAbi } from "viem";

export const agentAbi = parseAbi([
  "struct IntelligentData { string dataDescription; bytes32 dataHash; }",
  "function iMintWithRole(address to, IntelligentData[] datas, address creator) returns (uint256)",
  "function appendIntelligentData(uint256 tokenId, IntelligentData data)",
  "function authorizeUsageWithSig(uint256 tokenId, address user, uint256 deadline, bytes signature)",
  "function revokeAuthorizationWithSig(uint256 tokenId, address user, uint256 deadline, bytes signature)",
  "function isAuthorizedUser(uint256 tokenId, address user) view returns (bool)",
  "function sigNonces(uint256 tokenId) view returns (uint256)",
  "function setTokenURI(uint256 tokenId, string uri)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]);

export const patchesAbi = parseAbi([
  "function createEvent(string name, uint64 startsAt, uint64 endsAt, uint32 cap, string trustTier, string eventUri) returns (uint256)",
  "function claim(address to, uint256 eventId) returns (uint32)",
  "function editionOf(uint256 eventId, address member) view returns (uint32)",
  "function setEventURI(uint256 eventId, string newUri)",
  "event EventCreated(uint256 indexed eventId, string name, uint64 startsAt, uint64 endsAt, uint32 cap, string trustTier)",
  "event PatchClaimed(uint256 indexed eventId, address indexed member, uint32 edition, string trustTier)",
]);
