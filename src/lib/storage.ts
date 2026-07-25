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

// TODO(P0, after spike-storage): upload(blob) -> rootHash and download(rootHash) -> blob
// using the 0G storage TS SDK against STORAGE_INDEXER_URL.
