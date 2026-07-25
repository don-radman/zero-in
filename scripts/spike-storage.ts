// SPIKE 3: prove 0G Storage round-trip: encrypt -> upload -> root hash ->
// download -> decrypt -> byte-identical. The root hash is what goes on-chain
// as IntelligentData dataHash for agent memory.
//
// Run: npx tsx scripts/spike-storage.ts
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { encrypt, decrypt } from "../src/lib/storage";
import { requireEnv, firstRelayerKey } from "./util";

async function loadSdk(): Promise<any> {
  return await import("@0gfoundation/0g-storage-ts-sdk");
}

async function main() {
  const indexerUrl = process.env.STORAGE_INDEXER_URL || "https://indexer-storage-testnet-turbo.0g.ai";
  const rpc = process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai";
  requireEnv("STORAGE_MASTER_KEY", 'generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  const key = crypto
    .createHmac("sha256", Buffer.from(process.env.STORAGE_MASTER_KEY!, "hex"))
    .update("spike-user")
    .digest();

  const sdk = await loadSdk();
  const { Indexer, ZgFile } = sdk;
  const { ethers } = await import("ethers");

  const provider = new ethers.JsonRpcProvider(rpc);
  const signer = new ethers.Wallet(firstRelayerKey(), provider);
  console.log(`storage fee payer: ${signer.address}`);

  // Encrypt a memory blob
  const memory = Buffer.from(
    JSON.stringify({ kind: "spike", note: "zero-in agent memory round-trip", at: new Date().toISOString() })
  );
  const blob = encrypt(memory, key);
  const tmpIn = path.join(os.tmpdir(), `zero-in-spike-${Date.now()}.bin`);
  fs.writeFileSync(tmpIn, blob);

  // Upload
  const file = await ZgFile.fromFilePath(tmpIn);
  const [tree, treeErr] = await file.merkleTree();
  if (treeErr) throw treeErr;
  const rootHash = tree.rootHash();
  console.log(`merkle root: ${rootHash}`);

  const indexer = new Indexer(indexerUrl);
  const [tx, uploadErr] = await indexer.upload(file, rpc, signer);
  if (uploadErr) throw uploadErr;
  console.log(`upload tx: ${JSON.stringify(tx)}`);
  await file.close();

  // Download + decrypt
  const tmpOut = tmpIn + ".down";
  const downErr = await indexer.download(rootHash, tmpOut, true);
  if (downErr) throw downErr;
  const roundTrip = decrypt(fs.readFileSync(tmpOut), key);

  if (!roundTrip.equals(memory)) throw new Error("Round-trip mismatch");
  console.log("decrypted content matches original");
  console.log(`SPIKE GREEN -> root hash ${rootHash}`);
  console.log(`  storage explorer: https://storagescan-galileo.0g.ai (search the root hash)`);

  fs.rmSync(tmpIn, { force: true });
  fs.rmSync(tmpOut, { force: true });
}

main().catch((e) => { console.error(e); process.exit(1); });
