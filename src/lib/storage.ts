// 0G Storage: encrypted agent memory. Encrypt client data server-side with
// AES-256-GCM (per-user key derived from STORAGE_MASTER_KEY), upload via the
// 0G storage SDK, keep the merkle root hash. Root doubles as on-chain dataHash.

import crypto from "crypto";

export function deriveUserKey(userId: string): Buffer {
  const master = process.env.STORAGE_MASTER_KEY;
  if (!master) throw new Error("STORAGE_MASTER_KEY not set");
  return crypto.createHmac("sha256", Buffer.from(master, "hex")).update(userId).digest();
}

export function encrypt(plaintext: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]); // iv(12) | tag(16) | ciphertext
}

export function decrypt(blob: Buffer, key: Buffer): Buffer {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const data = blob.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

/**
 * Upload a member's encrypted memory blob to 0G Storage; returns the merkle
 * root hash (which doubles as the on-chain IntelligentData commitment).
 * Uses the LAST relayer key as a dedicated storage-fee payer to stay out of
 * the mint keys' nonce lanes. Server-only; callers treat failures as
 * best-effort (heal on the next call or via scripts/backfill-storage.ts).
 */
export async function uploadMemoryBlob(userId: string, payload: object): Promise<string> {
  const os = await import("os");
  const path = await import("path");
  const fs = await import("fs");
  const { Indexer, ZgFile } = await import("@0gfoundation/0g-storage-ts-sdk");
  const { ethers } = await import("ethers");

  const keys = (process.env.RELAYER_KEYS || "").split(",").map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) throw new Error("RELAYER_KEYS not set");
  const rpc = process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai";
  const indexerUrl = process.env.STORAGE_INDEXER_URL || "https://indexer-storage-testnet-turbo.0g.ai";
  const signer = new ethers.Wallet(keys[keys.length - 1], new ethers.JsonRpcProvider(rpc));

  const key = deriveUserKey(userId);
  const blob = encrypt(Buffer.from(JSON.stringify(payload)), key);
  const tmp = path.join(os.tmpdir(), `zeroin-mem-${userId}-${blob.length}.bin`);
  fs.writeFileSync(tmp, blob);
  try {
    const file = await ZgFile.fromFilePath(tmp);
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr || !tree) throw treeErr || new Error("merkle tree unavailable");
    const rootHash = tree.rootHash();
    if (!rootHash) throw new Error("no root hash");
    const indexer = new Indexer(indexerUrl);
    const [, uploadErr] = await indexer.upload(file, rpc, signer);
    await file.close();
    // "Data already exists" style errors mean the root is already stored: fine.
    if (uploadErr && !String(uploadErr).toLowerCase().includes("exist")) throw uploadErr;
    return rootHash;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}
