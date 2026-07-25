// Local tests for the two Zero-In additions on top of 0G's example contract:
// appendIntelligentData and the EIP-712 WithSig consent path, plus the
// ZeroInPatches claim rules. Run: npx hardhat test
const { expect } = require("chai");
const { ethers, network } = require("hardhat");

async function signAuthorize(signer, contract, typeName, tokenId, user, deadline) {
  const domain = {
    name: "ZeroInAgent",
    version: "1",
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: await contract.getAddress(),
  };
  const types = {
    [typeName]: [
      { name: "tokenId", type: "uint256" },
      { name: "user", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  const nonce = await contract.sigNonces(tokenId);
  return signer.signTypedData(domain, types, { tokenId, user, nonce, deadline });
}

describe("ZeroInAgent", () => {
  let agent, relayer, member, matcher;

  beforeEach(async () => {
    [relayer, member, matcher] = await ethers.getSigners();
    const F = await ethers.getContractFactory("ZeroInAgent");
    agent = await F.deploy("Zero-In Panda", "PANDA", 0);
  });

  it("mints with intelligent data via iMintWithRole", async () => {
    const datas = [
      { dataDescription: "profile_v1", dataHash: ethers.keccak256(ethers.toUtf8Bytes("profile")) },
    ];
    await agent.iMintWithRole(member.address, datas, member.address);
    expect(await agent.ownerOf(0)).to.equal(member.address);
    const stored = await agent.getIntelligentDatas(0);
    expect(stored.length).to.equal(1);
    expect(stored[0].dataDescription).to.equal("profile_v1");
  });

  it("appends growth events (operator only)", async () => {
    await agent.iMintWithRole(member.address, [], member.address);
    const entry = { dataDescription: "patch:1", dataHash: ethers.keccak256(ethers.toUtf8Bytes("patch")) };
    await expect(agent.appendIntelligentData(0, entry)).to.emit(agent, "IntelligentDataAppended");
    expect((await agent.getIntelligentDatas(0)).length).to.equal(1);
    await expect(agent.connect(member).appendIntelligentData(0, entry)).to.be.reverted;
  });

  it("authorizeUsageWithSig: owner signs, relayer submits", async () => {
    await agent.iMintWithRole(member.address, [], member.address);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const sig = await signAuthorize(member, agent, "AuthorizeUsage", 0, matcher.address, deadline);

    await agent.authorizeUsageWithSig(0, matcher.address, deadline, sig); // submitted by relayer
    expect(await agent.isAuthorizedUser(0, matcher.address)).to.equal(true);

    // replay blocked by nonce bump
    await expect(agent.authorizeUsageWithSig(0, matcher.address, deadline, sig)).to.be.revertedWith("Invalid signature");
  });

  it("rejects signatures from non-owners and expired deadlines", async () => {
    await agent.iMintWithRole(member.address, [], member.address);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const badSig = await signAuthorize(matcher, agent, "AuthorizeUsage", 0, matcher.address, deadline);
    await expect(agent.authorizeUsageWithSig(0, matcher.address, deadline, badSig)).to.be.revertedWith("Invalid signature");

    const goodSig = await signAuthorize(member, agent, "AuthorizeUsage", 0, matcher.address, 1);
    await expect(agent.authorizeUsageWithSig(0, matcher.address, 1, goodSig)).to.be.revertedWith("Signature expired");
  });

  it("revokeAuthorizationWithSig round-trip", async () => {
    await agent.iMintWithRole(member.address, [], member.address);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const auth = await signAuthorize(member, agent, "AuthorizeUsage", 0, matcher.address, deadline);
    await agent.authorizeUsageWithSig(0, matcher.address, deadline, auth);

    const revoke = await signAuthorize(member, agent, "RevokeAuthorization", 0, matcher.address, deadline);
    await agent.revokeAuthorizationWithSig(0, matcher.address, deadline, revoke);
    expect(await agent.isAuthorizedUser(0, matcher.address)).to.equal(false);
  });
});

describe("ZeroInPatches", () => {
  let patches, relayer, a, b;

  beforeEach(async () => {
    [relayer, a, b] = await ethers.getSigners();
    const F = await ethers.getContractFactory("ZeroInPatches");
    patches = await F.deploy();
  });

  async function liveEvent(cap = 0) {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const tx = await patches.createEvent("ETHGlobal Lisbon", now - 60, now + 3600, cap, "venue", "https://example/uri");
    await tx.wait();
    return 1n;
  }

  it("claims sequential editions, one per wallet", async () => {
    const eventId = await liveEvent();
    await expect(patches.claim(a.address, eventId)).to.emit(patches, "PatchClaimed");
    await patches.claim(b.address, eventId);
    expect(await patches.editionOf(eventId, a.address)).to.equal(1);
    expect(await patches.editionOf(eventId, b.address)).to.equal(2);
    await expect(patches.claim(a.address, eventId)).to.be.revertedWith("Already claimed");
  });

  it("enforces window and cap", async () => {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await patches.createEvent("Future", now + 1000, now + 2000, 0, "venue", "");
    await expect(patches.claim(a.address, 1)).to.be.revertedWith("Outside event window");

    await patches.createEvent("Tiny", now - 60, now + 3600, 1, "venue", "");
    await patches.claim(a.address, 2);
    await expect(patches.claim(b.address, 2)).to.be.revertedWith("Edition cap reached");
  });

  it("only MINTER_ROLE can claim", async () => {
    const eventId = await liveEvent();
    await expect(patches.connect(a).claim(a.address, eventId)).to.be.reverted;
  });
});
