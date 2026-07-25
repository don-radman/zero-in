// SPIKE 1: prove the ERC-7857 mint path with ZERO deploys, against 0G's
// pre-deployed AgenticID example on Galileo. Uses the public payable iMint
// (our keys have no MINTER_ROLE on 0G's deployment; roles come with our own
// contracts later). Green = tx link on chainscan.
//
// Run: npx tsx scripts/spike-mint.ts
import { createPublicClient, createWalletClient, http, parseAbi, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { zgGalileo } from "../src/lib/chain";
import { firstRelayerKey } from "./util";

const PREDEPLOYED = "0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F" as const;

const abi = parseAbi([
  "struct IntelligentData { string dataDescription; bytes32 dataHash; }",
  "function mintFee() view returns (uint256)",
  "function iMint(address to, IntelligentData[] datas) payable returns (uint256)",
  "function getIntelligentDatas(uint256 tokenId) view returns (IntelligentData[])",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]);

async function main() {
  const account = privateKeyToAccount(firstRelayerKey());
  const publicClient = createPublicClient({ chain: zgGalileo, transport: http() });
  const wallet = createWalletClient({ account, chain: zgGalileo, transport: http() });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`relayer ${account.address} balance: ${balance} wei`);
  if (balance === 0n) {
    console.error("Relayer has no gas. Hit https://faucet.0g.ai and the Google Cloud 0G faucet.");
    process.exit(1);
  }

  const mintFee = await publicClient.readContract({
    address: PREDEPLOYED, abi, functionName: "mintFee",
  });
  console.log(`mintFee: ${mintFee} wei`);

  const datas = [
    { dataDescription: "profile_v1", dataHash: keccak256(toBytes("zero-in spike profile")) },
    { dataDescription: "memory_root", dataHash: keccak256(toBytes("zero-in spike memory")) },
  ];

  const { request } = await publicClient.simulateContract({
    account, address: PREDEPLOYED, abi, functionName: "iMint",
    args: [account.address, datas], value: mintFee,
  });
  const hash = await wallet.writeContract(request);
  console.log(`tx: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`status: ${receipt.status}, block ${receipt.blockNumber}`);
  console.log(`SPIKE GREEN -> https://chainscan-galileo.0g.ai/tx/${hash}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
